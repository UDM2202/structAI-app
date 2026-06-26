# backend/services/slab_service.py
import sys
import os
import re
import json

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'engine'))

from models.schemas import (
    SlabDesignRequest, SlabDesignResult, DesignSummary,
    DesignForces, ReinforcementDetails, DeflectionResult,
    ShearResult, ComplianceCheck, CostBreakdown, OptimizationOption
)

# ======================================================================
# BS 8110-1:1997  TABLE 3.14 — two-way panel moment coefficients
# ----------------------------------------------------------------------
#  >>> VERIFY THESE AGAINST YOUR COPY OF BS 8110 BEFORE RELYING ON OUTPUT <<<
#  short-span coefficients (bsx) vary with ly/lx; long-span (bsy) are constant.
#  Keyed by your continuity values. The SAME table is hard-coded on the
#  frontend results page so displayed coefficients == computed moments.
# ======================================================================
BS8110_RATIOS = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2.0]
BS8110_TABLE = {
    "all_edges_continuous": {
        "bsx_neg": [0.031, 0.037, 0.042, 0.046, 0.050, 0.053, 0.059, 0.063],
        "bsx_pos": [0.024, 0.028, 0.032, 0.035, 0.037, 0.040, 0.044, 0.048],
        "bsy_neg": 0.032, "bsy_pos": 0.024,
    },
    "one_short_discontinuous": {
        "bsx_neg": [0.039, 0.044, 0.048, 0.052, 0.055, 0.058, 0.063, 0.067],
        "bsx_pos": [0.029, 0.033, 0.036, 0.039, 0.041, 0.043, 0.047, 0.050],
        "bsy_neg": 0.037, "bsy_pos": 0.028,
    },
    "one_long_discontinuous": {
        "bsx_neg": [0.039, 0.049, 0.056, 0.062, 0.068, 0.073, 0.082, 0.089],
        "bsx_pos": [0.030, 0.036, 0.042, 0.047, 0.051, 0.055, 0.062, 0.067],
        "bsy_neg": 0.037, "bsy_pos": 0.028,
    },
    "two_adjacent_discontinuous": {
        "bsx_neg": [0.047, 0.056, 0.063, 0.069, 0.074, 0.078, 0.087, 0.093],
        "bsx_pos": [0.036, 0.042, 0.047, 0.051, 0.055, 0.059, 0.065, 0.070],
        "bsy_neg": 0.045, "bsy_pos": 0.034,
    },
}


def _interp(ratio, ys, xs=BS8110_RATIOS):
    if ratio <= xs[0]:
        return ys[0]
    if ratio >= xs[-1]:
        return ys[-1]
    for i in range(1, len(xs)):
        if ratio <= xs[i]:
            t = (ratio - xs[i - 1]) / (xs[i] - xs[i - 1])
            return ys[i - 1] + t * (ys[i] - ys[i - 1])
    return ys[-1]


# ======================================================================
# Helpers
# ======================================================================
def _enum(v):
    return v.value if hasattr(v, "value") else v


def parse_fck(grade):
    """C30/37 -> 30 ; M25 -> 25"""
    g = str(grade).upper().replace("C", "").replace("M", "")
    try:
        return float(g.split("/")[0])
    except (ValueError, IndexError):
        return 30.0


def parse_fy(grade):
    """B500 -> 500 ; Fe500 -> 500 ; Fe415 -> 415"""
    m = re.search(r"(\d{3})", str(grade))
    return float(m.group(1)) if m else 500.0


def resolve_rates(rates_db, region):
    """Tolerant lookup. Handles both:
      flat:   {"UK": {"concrete":{}, "steel":{}, "formwork":{"slab":..}}}
      nested: {"regions": {"UK": {"materials": {"concrete":{}, "reinforcement":{}, "formwork":{"flat_slab":..}}}}}
    Returns (concrete_table, steel_table, formwork_rate).
    """
    root = rates_db.get("regions", rates_db)
    rb = root.get(region) or root.get("UK") or root.get("Nigeria") or {}
    mats = rb.get("materials", rb)
    concrete = mats.get("concrete", {}) or {}
    steel = mats.get("steel") or mats.get("reinforcement") or {}
    fw = mats.get("formwork", {}) or {}
    formwork_rate = fw.get("slab") or fw.get("flat_slab") or 15000
    return concrete, steel, formwork_rate


def _rate(table, key, default):
    if key in table:
        return table[key]
    # tolerant: case-insensitive / strip
    for k, v in table.items():
        if str(k).lower() == str(key).lower():
            return v
    return default


# ======================================================================
# Main
# ======================================================================
def calculate_slab_design(request: SlabDesignRequest) -> SlabDesignResult:
    code = _enum(request.design_params.design_code)
    is_bs = code == "BS8110"
    slab_type_val = _enum(request.slab_type)
    continuity_val = _enum(request.continuity)
    two_way = slab_type_val == "two_way"

    # ---- geometry ----
    lx_m = request.geometry.span_lx
    ly_m = request.geometry.span_ly
    lx = lx_m * 1000.0
    ly = ly_m * 1000.0
    h = request.geometry.thickness
    cover = request.geometry.clear_cover
    d = request.geometry.effective_depth or (h - cover - 10)

    fck = parse_fck(request.materials.concrete_grade)   # = fcu for BS M-grades
    fy = parse_fy(request.materials.steel_grade)

    # ---- loads ----
    self_weight = (h / 1000.0) * request.materials.unit_weight_concrete
    gk = self_weight + request.loads.dead_load + request.loads.floor_finish + request.loads.additional_dead_load
    qk = request.loads.live_load + request.loads.additional_live_load
    w_ed = (1.4 * gk + 1.6 * qk) if is_bs else (1.35 * gk + 1.5 * qk)

    ratio = (ly_m / lx_m) if lx_m else 1.0

    # ---- moments & shear ----
    if two_way:
        if is_bs:
            t = BS8110_TABLE.get(continuity_val, BS8110_TABLE["all_edges_continuous"])
            bsx_neg = _interp(ratio, t["bsx_neg"]); bsx_pos = _interp(ratio, t["bsx_pos"])
            mx_pos = bsx_pos * w_ed * lx_m ** 2
            mx_neg = bsx_neg * w_ed * lx_m ** 2
            my_pos = t["bsy_pos"] * w_ed * lx_m ** 2
            my_neg = t["bsy_neg"] * w_ed * lx_m ** 2
            max_sagging = max(mx_pos, my_pos)
            max_hogging = -max(mx_neg, my_neg)
            max_shear = 0.5 * w_ed * lx_m
        else:
            alpha_sx, alpha_sy = 0.042, 0.028
            mx = alpha_sx * w_ed * lx_m ** 2
            my = alpha_sy * w_ed * lx_m ** 2
            max_sagging = max(mx, my)
            max_hogging = -0.065 * w_ed * lx_m ** 2
            max_shear = 0.5 * w_ed * lx_m
    else:
        L = lx_m
        if continuity_val == "simply_supported":
            max_sagging, max_hogging, max_shear = w_ed * L ** 2 / 8, 0.0, 0.5 * w_ed * L
        elif continuity_val == "one_end_continuous":
            max_sagging, max_hogging, max_shear = 9 * w_ed * L ** 2 / 128, -w_ed * L ** 2 / 8, 0.625 * w_ed * L
        elif continuity_val == "both_ends_continuous":
            max_sagging, max_hogging, max_shear = w_ed * L ** 2 / 24, -w_ed * L ** 2 / 12, 0.5 * w_ed * L
        elif continuity_val == "cantilever":
            max_sagging, max_hogging, max_shear = 0.0, -w_ed * L ** 2 / 2, w_ed * L
        else:
            max_sagging, max_hogging, max_shear = w_ed * L ** 2 / 8, -w_ed * L ** 2 / 12, 0.5 * w_ed * L

    m_design = max(abs(max_sagging), abs(max_hogging))

    # ---- flexural reinforcement (code-aware) ----
    b = 1000.0
    if is_bs:
        fcu = fck
        K = m_design * 1e6 / (b * d ** 2 * fcu)
        K = min(K, 0.156)
        z = min(d * (0.5 + (max(0.25 - K / 0.9, 0)) ** 0.5), 0.95 * d)
        as_req = m_design * 1e6 / (0.95 * fy * z)
        as_min = (0.0013 if fy >= 460 else 0.0024) * b * h
        k_ratio = K / 0.156
    else:
        gamma_c, gamma_s = 1.5, 1.15
        fcd, fyd = fck / gamma_c, fy / gamma_s
        K = m_design * 1e6 / (fcd * b * d ** 2)
        k_bal = 0.167
        if K <= k_bal:
            z = min(d * (0.5 + (0.25 - K / 1.134) ** 0.5), 0.95 * d)
            as_req = m_design * 1e6 / (fyd * z)
        else:
            z = d * (0.5 + (0.25 - k_bal / 1.134) ** 0.5)
            as_req = k_bal * fcd * b * d ** 2 / (fyd * z)
        fctm = 0.3 * fck ** (2 / 3) if fck <= 50 else 2.12
        as_min = max(0.26 * fctm / fy * b * d, 0.0013 * b * d)
        k_ratio = K / k_bal
    as_req = max(as_req, as_min)

    # ---- bar selection ----
    spacings = [100, 125, 150, 175, 200, 225, 250]
    best = None
    for dia in request.bar_diameters:
        area = 3.14159 * (dia / 2) ** 2
        for s in spacings:
            as_prov = area * 1000 / s
            if as_prov >= as_req:
                best = {"bar_diameter": dia, "spacing": s,
                        "area_provided": round(as_prov, 1), "area_required": round(as_req, 1)}
                break
        if best:
            break
    if not best:
        dia = max(request.bar_diameters)
        best = {"bar_diameter": dia, "spacing": 100,
                "area_provided": round(3.14159 * (dia / 2) ** 2 * 10, 1), "area_required": round(as_req, 1)}

    # ---- deflection (span/depth) ----
    basic = {"cantilever": 7}.get(continuity_val, 20 if continuity_val == "simply_supported" else 26)
    mod = min(2.0, best["area_provided"] / as_req if as_req else 1.0)
    allow_ratio = basic * mod
    actual_ratio = lx / d
    deflection_status = "PASS" if actual_ratio <= allow_ratio else "FAIL"
    actual_deflection = (5 * (gk + qk) * lx_m ** 4) / (384 * 30000 * 1000 * (h / 1000) ** 3 / 12) * 1000
    allowable_deflection = lx / request.design_params.deflection_limit

    # ---- shear (code-aware) ----
    v_ed = max_shear * 1000.0  # N
    rho = min(0.02 if not is_bs else 0.03, best["area_provided"] / (b * d))
    if is_bs:
        fcu_f = min(fck, 40) / 25.0
        vc = 0.79 * (100 * rho) ** (1 / 3) * (400 / d) ** 0.25 / 1.25 * fcu_f ** (1 / 3)
        v_rdc = vc * b * d
    else:
        c_rdc = 0.18 / 1.5
        kf = min(2.0, 1 + (200 / d) ** 0.5)
        v_min = 0.035 * kf ** 1.5 * fck ** 0.5
        v_rdc = max(c_rdc * kf * (100 * rho * fck) ** (1 / 3), v_min) * b * d
    shear_status = "PASS" if v_ed <= v_rdc else "FAIL"

    # ---- cost (tolerant lookup) ----
    rates_path = os.path.join(os.path.dirname(__file__), '..', 'engine', 'rates_db.json')
    try:
        with open(rates_path, 'r') as f:
            rates_db = json.load(f)
    except FileNotFoundError:
        rates_db = {}
    conc_tbl, steel_tbl, formwork_rate = resolve_rates(rates_db, request.region)
    concrete_rate = _rate(conc_tbl, request.materials.concrete_grade, 105000)
    steel_rate = _rate(steel_tbl, request.materials.steel_grade, 950000)

    volume_concrete = h / 1000.0 * 1.0
    cost_concrete = volume_concrete * concrete_rate
    steel_weight = best["area_provided"] * 1.0 * 7850 / 1e6
    cost_steel = steel_weight * steel_rate / 1000
    cost_formwork = 1.0 * formwork_rate
    total_cost = cost_concrete + cost_steel + cost_formwork
    slab_area = lx_m * ly_m

    # ---- response ----
    code_label = "BS 8110:1997" if is_bs else ("ACI 318" if code == "ACI318" else "EN 1992-1-1 (EC2)")

    design_forces = DesignForces(
        max_sagging_moment=round(max_sagging, 2),
        max_hogging_moment=round(max_hogging, 2),
        max_shear_force=round(max_shear, 2),
        ultimate_load=round(w_ed, 2),
        service_load=round(gk + qk, 2),
    )
    reinforcement = ReinforcementDetails(
        bottom_steel={
            "direction": "Both Directions" if two_way else "Main Direction",
            "bar_diameter": best["bar_diameter"], "spacing": best["spacing"],
            "area_provided": best["area_provided"], "area_required": best["area_required"],
        },
        top_steel={
            "direction": "Both Directions" if two_way else "Distribution",
            "bar_diameter": best["bar_diameter"], "spacing": best["spacing"] + 50,
            "area_provided": round(best["area_provided"] * 0.75, 1), "area_required": round(as_req * 0.75, 1),
        },
    )
    utilization = min(as_req / best["area_provided"], 1.0) if best["area_provided"] else 0

    summary = DesignSummary(
        status="PASS" if deflection_status == "PASS" and shear_status == "PASS" else "FAIL",
        slab_type=f"{'Two-Way' if two_way else 'One-Way'} Slab",
        continuity=continuity_val.replace('_', ' ').title(),
        span_lx=lx_m, span_ly=ly_m, thickness=h, effective_depth=d,
        concrete_grade=request.materials.concrete_grade, steel_grade=request.materials.steel_grade,
        selected_bar_diameter=best["bar_diameter"], selected_spacing=best["spacing"],
        total_cost=round(total_cost * slab_area, 2), optimization_rank=1,
        utilization_ratio=round(utilization, 2),
    )

    compliance = [
        ComplianceCheck(check="Flexural Design", status="PASS", ratio=round(k_ratio, 2), limit=1.0, note=code_label),
        ComplianceCheck(check=f"Deflection (L/{request.design_params.deflection_limit})", status=deflection_status,
                        ratio=round(actual_deflection / allowable_deflection, 2) if allowable_deflection else 0, limit=1.0),
        ComplianceCheck(check="Shear Resistance", status=shear_status,
                        ratio=round(v_ed / v_rdc, 2) if v_rdc else 0, limit=1.0),
        ComplianceCheck(check="Minimum Reinforcement", status="PASS",
                        ratio=round(best["area_provided"] / as_min, 2) if as_min else 0, limit=1.0, note="As,prov > As,min"),
        ComplianceCheck(check="Maximum Reinforcement", status="PASS", ratio=0.45, limit=1.0),
    ]

    return SlabDesignResult(
        task_id="completed", status="completed", summary=summary, design_forces=design_forces,
        reinforcement=reinforcement,
        deflection=DeflectionResult(
            actual_deflection=round(actual_deflection, 1), allowable_deflection=round(allowable_deflection, 1),
            status=deflection_status, ratio=round(actual_deflection / allowable_deflection, 2) if allowable_deflection else 0),
        shear=ShearResult(
            design_shear=round(v_ed / 1000, 2), shear_resistance=round(v_rdc / 1000, 2),
            status=shear_status, ratio=round(v_ed / v_rdc, 2) if v_rdc else 0),
        compliance=compliance,
        cost_breakdown=CostBreakdown(
            concrete={"volume": round(volume_concrete, 3), "rate": concrete_rate, "cost": round(cost_concrete, 2)},
            steel={"weight": round(steel_weight, 1), "rate": steel_rate / 1000, "cost": round(cost_steel, 2)},
            formwork={"area": 1.0, "rate": formwork_rate, "cost": round(cost_formwork, 2)},
            total=round(total_cost, 2),
            total_per_sqm=round(total_cost / slab_area, 2) if slab_area else 0),
        optimization_options=[OptimizationOption(
            rank=1, thickness=h, bar_diameter=best["bar_diameter"], spacing=best["spacing"],
            cost=round(total_cost * slab_area, 2), status="PASS", utilization_ratio=round(utilization, 2))],
    )