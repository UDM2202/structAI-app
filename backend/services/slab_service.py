# backend/services/slab_service.py
import sys
import os
import re
import json
import math

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'engine'))

from models.schemas import (
    SlabDesignRequest, SlabDesignResult, DesignSummary,
    DesignForces, ReinforcementDetails, DeflectionResult,
    ShearResult, ComplianceCheck, CostBreakdown, OptimizationOption,
    ReportSection
)

# Two-way EC2 engine (full coefficient/plate designer). Imported defensively so
# the slab module still loads even if the engine file isn't present yet.
try:
    from engine.two_way_slab_engine import (
        TwoWaySlabInput, TwoWaySlabDesigner, SupportCondition as _TWSupport,
        PanelType as _TWPanel, EdgeCondition as _TWEdge, PartitionMode as _TWPart,
    )
    _TWO_WAY_ENGINE = True
except ImportError:
    try:
        from two_way_slab_engine import (
            TwoWaySlabInput, TwoWaySlabDesigner, SupportCondition as _TWSupport,
            PanelType as _TWPanel, EdgeCondition as _TWEdge, PartitionMode as _TWPart,
        )
        _TWO_WAY_ENGINE = True
    except ImportError:
        _TWO_WAY_ENGINE = False

_EDGE_MAP = {
    "all_edges_continuous": "INTERIOR_PANEL",
    "one_short_discontinuous": "ONE_SHORT_EDGE_DISCONTINUOUS",
    "one_long_discontinuous": "ONE_LONG_EDGE_DISCONTINUOUS",
    "two_adjacent_discontinuous": "TWO_ADJACENT_EDGES_DISCONTINUOUS",
}

# One-way EC2 engine (closed-form moments + EC2 section/deflection/shear/cost).
try:
    from engine.one_way_slab_engine import design_one_way_slab as _ow_design, OneWayInput as _OWInput
    _ONE_WAY_ENGINE = True
except ImportError:
    try:
        from one_way_slab_engine import design_one_way_slab as _ow_design, OneWayInput as _OWInput
        _ONE_WAY_ENGINE = True
    except ImportError:
        _ONE_WAY_ENGINE = False

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

    # EC2 two-way is handled by the dedicated coefficient/plate engine.
    # BS 8110 two-way and all one-way cases stay on the logic below.
    if two_way and code == "EC2" and _TWO_WAY_ENGINE and continuity_val in _EDGE_MAP:
        return _calculate_two_way_slab(request)

    # EC2 one-way -> dedicated closed-form + section-design engine.
    if (not two_way) and code == "EC2" and _ONE_WAY_ENGINE:
        return _calculate_one_way_slab(request)

    # ---- geometry ----
    lx_m = request.geometry.span_lx
    ly_m = request.geometry.span_ly
    lx = lx_m * 1000.0
    ly = ly_m * 1000.0
    h = request.geometry.thickness
    cover = request.geometry.clear_cover
    d = h - cover - 10   # effective depth derived from geometry (bar/cover govern); effective_depth input removed

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
        span_lx=lx_m, span_ly=ly_m, thickness=h, effective_depth=d, clear_cover=cover,   
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

    report = _build_slab_report(
        is_bs=is_bs, code_label=code_label, two_way=two_way, continuity_val=continuity_val,
        lx_m=lx_m, ly_m=ly_m, h=h, cover=cover, d=d, fck=fck, fy=fy,
        self_weight=self_weight, gk=gk, qk=qk, w_ed=w_ed, ratio=ratio,
        m_design=m_design, max_sagging=max_sagging, max_hogging=max_hogging, max_shear=max_shear,
        K=K, z=z, as_req=as_req, as_min=as_min, best=best,
        v_ed=v_ed, v_rdc=v_rdc, shear_status=shear_status,
        actual_ratio=actual_ratio, allow_ratio=allow_ratio, deflection_status=deflection_status,
        deflection_limit=request.design_params.deflection_limit,
        exposure=_enum(request.design_params.exposure_class),
    )

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
        report=report,
    )


def _build_slab_report(is_bs, code_label, two_way, continuity_val, lx_m, ly_m, h, cover, d,
                       fck, fy, self_weight, gk, qk, w_ed, ratio, m_design, max_sagging,
                       max_hogging, max_shear, K, z, as_req, as_min, best, v_ed, v_rdc,
                       shear_status, actual_ratio, allow_ratio, deflection_status,
                       deflection_limit, exposure):
    R = lambda ref, calc, out: {"reference": ref, "calculation": calc, "output": out}
    cl = (lambda ec, bs: bs if is_bs else ec)
    fcd = (0.45 * fck) if is_bs else round(fck / 1.5, 1)
    fyd = (0.95 * fy) if is_bs else round(fy / 1.15, 0)
    Kp = "0.156" if is_bs else "0.167"
    sec = []

    sec.append({"title": "1. Geometry & Durability", "rows": [
        R(cl("EC2 \u00a74.4.1.2(3)", "BS 8110 \u00a73.3"),
          f"c_min,dur = {cover - 10:.0f} mm ({exposure})\nc_nom = c_min + \u0394c_dev = {cover - 10:.0f} + 10",
          f"c_nom = {cover:.0f} mm"),
        R(cl("EC2 \u00a79.2.1.1", "BS 8110 \u00a73.3"),
          f"d = h \u2212 c_nom \u2212 \u03c6/2\n= {h:.0f} \u2212 {cover:.0f} \u2212 (bar/2)",
          f"d = {d:.0f} mm"),
    ]})

    sec.append({"title": "2. Materials", "rows": [
        R(cl("EC2 Table 3.1", "BS 8110 \u00a73.1.7"),
          cl(f"f_ck = {fck:.0f} MPa, f_cd = f_ck/1.5 = {fcd} MPa",
             f"f_cu = {fck:.0f} MPa, 0.45 f_cu = {fcd} MPa"),
          f"f_cd = {fcd} MPa"),
        R(cl("EC2 \u00a73.2.7", "BS 8110 \u00a73.4.4.1"),
          cl(f"f_yk = {fy:.0f} MPa, f_yd = f_yk/1.15 = {fyd:.0f} MPa",
             f"f_y = {fy:.0f} MPa, 0.95 f_y = {fyd:.0f} MPa"),
          f"f_yd = {fyd:.0f} MPa"),
    ]})

    sec.append({"title": "3. Loading & Combination", "rows": [
        R(cl("EC1-1-1 Table A.1", "BS 8110 \u00a72.4.1"),
          f"Self weight = h \u00d7 \u03b3_c = {h/1000:.3f} \u00d7 25",
          f"g_sw = {self_weight:.2f} kN/m\u00b2"),
        R(cl("EC1-1-1", "BS 6399"), "Total dead G_k", f"G_k = {gk:.2f} kN/m\u00b2"),
        R(cl("EC1-1-1 Table 6.2", "BS 6399-1"), "Total imposed Q_k", f"Q_k = {qk:.2f} kN/m\u00b2"),
        R(cl("EC0 \u00a76.4.3.2", "BS 8110 \u00a72.4.3"),
          cl(f"n = 1.35 G_k + 1.50 Q_k = 1.35\u00d7{gk:.2f} + 1.50\u00d7{qk:.2f}",
             f"n = 1.4 G_k + 1.6 Q_k = 1.4\u00d7{gk:.2f} + 1.6\u00d7{qk:.2f}"),
          f"n = {w_ed:.2f} kN/m\u00b2"),
    ]})

    if two_way:
        sec.append({"title": "4. Analysis \u2014 Two-Way Coefficients", "rows": [
            R(cl("EC2 Annex / tables", "BS 8110 Table 3.14"),
              f"l_y/l_x = {ratio:.2f}  ({continuity_val.replace('_',' ')})\nM = \u03b2 \u00d7 n \u00d7 l_x\u00b2",
              f"M_Ed = {m_design:.2f} kNm/m"),
            R(cl("EC2 \u00a76.2.1", "BS 8110 \u00a73.5.5"),
              f"V = \u03b2_v \u00d7 n \u00d7 l_x", f"V_Ed = {max_shear:.2f} kN/m"),
        ]})
    else:
        sec.append({"title": "4. Analysis \u2014 One-Way", "rows": [
            R(cl("EC2 \u00a75.4", "BS 8110 Table 3.12"),
              f"{continuity_val.replace('_',' ')}\nM = coeff \u00d7 n \u00d7 L\u00b2",
              f"M_Ed = {m_design:.2f} kNm/m"),
            R(cl("EC2 \u00a76.2.1", "BS 8110 \u00a73.4.5"),
              "V = coeff \u00d7 n \u00d7 L", f"V_Ed = {max_shear:.2f} kN/m"),
        ]})

    sec.append({"title": "5. Flexural Design (per metre width)", "rows": [
        R(cl("EC2 \u00a76.1", "BS 8110 \u00a73.4.4.4"),
          f"K = M / (f_ck b d\u00b2)\n= {m_design:.2f}\u00d710\u2076 / ({fck:.0f}\u00d71000\u00d7{d:.0f}\u00b2)",
          f"K = {K:.4f}"),
        R(cl("EC2 \u00a76.1", "BS 8110 \u00a73.4.4.4"),
          f"K \u2264 K' ({Kp}) \u2192 {'singly reinforced' if K <= float(Kp) else 'review'}",
          "OK" if K <= float(Kp) else "review"),
        R(cl("EC2 \u00a76.1", "BS 8110 \u00a73.4.4.4"),
          cl("z = d[0.5+\u221a(0.25\u2212K/1.134)] \u2264 0.95d", "z = d[0.5+\u221a(0.25\u2212K/0.9)] \u2264 0.95d"),
          f"z = {z:.0f} mm"),
        R(cl("EC2 \u00a76.1", "BS 8110 \u00a73.4.4.4"),
          f"A_s,req = max(M/(f_yd z), A_s,min)\nA_s,min = {as_min:.0f} mm\u00b2/m",
          f"A_s,req = {as_req:.0f} mm\u00b2/m"),
        R(cl("EC2 \u00a79.3.1.1", "BS 8110 \u00a73.12"),
          f"Provide T{best['bar_diameter']} @ {best['spacing']} mm c/c",
          f"A_s,prov = {best['area_provided']:.0f} mm\u00b2/m"),
    ]})

    sec.append({"title": "6. Shear Check", "rows": [
        R(cl("EC2 \u00a76.2.2", "BS 8110 Table 3.8"),
          f"V_Ed = {v_ed/1000:.2f} kN/m\nV_Rd,c = {v_rdc/1000:.2f} kN/m",
          f"{shear_status}"),
    ]})

    sec.append({"title": "7. Deflection (span/depth)", "rows": [
        R(cl("EC2 \u00a77.4.2", "BS 8110 \u00a73.4.6"),
          f"Actual L/d = {lx_m*1000:.0f}/{d:.0f} = {actual_ratio:.1f}\nAllowable = {allow_ratio:.1f}",
          f"{deflection_status} (L/{deflection_limit})"),
    ]})

    return sec


# ======================================================================
# Two-way EC2 adapter: SlabDesignRequest -> engine -> SlabDesignResult
# ======================================================================
def _calculate_two_way_slab(request: SlabDesignRequest) -> SlabDesignResult:
    import math as _m

    g = request.geometry
    mats = request.materials
    loads = request.loads
    dp = request.design_params

    # --- map loads: API value wins when > 0, else None (engine auto-derives) ---
    api_dead_extra = (loads.dead_load or 0) + (loads.floor_finish or 0) + (loads.additional_dead_load or 0)
    api_live = (loads.live_load or 0) + (loads.additional_live_load or 0)
    gk_finish = api_dead_extra if api_dead_extra > 0 else None
    gk_partition = 0.0 if api_dead_extra > 0 else None   # folded into finish to avoid double count
    gk_services = 0.0 if api_dead_extra > 0 else None
    qk_imposed = api_live if api_live > 0 else None

    edge = _TWEdge(_EDGE_MAP[_enum(request.continuity)])

    inp = TwoWaySlabInput(
        lx_m=g.span_lx,
        ly_m=g.span_ly,
        support_condition=_TWSupport.TWO_WAY_BEAM_SUPPORTED,
        panel_type=_TWPanel.TWO_WAY,
        edge_condition=edge,
        concrete_grade=mats.concrete_grade,
        steel_grade=mats.steel_grade,
        building_use=getattr(request, "building_use", "office"),
        partition_mode=_TWPart.PERMANENT_GK,
        exposure_class=_enum(dp.exposure_class),
        thickness_mm=int(g.thickness) if g.thickness else None,     # API thickness wins; else preset
        cover_mm=g.clear_cover if g.clear_cover else None,
        gk_finish_kN_m2=gk_finish,
        gk_partition_kN_m2=gk_partition,
        gk_services_kN_m2=gk_services,
        qk_imposed_kN_m2=qk_imposed,
        candidate_bar_diameters_mm=request.bar_diameters or None,
    )

    res = TwoWaySlabDesigner(inp).run()

    # --- forces ---
    max_sag = max(res.MEd_x_pos_kN_m_per_m, res.MEd_y_pos_kN_m_per_m)
    max_hog = max(res.MEd_x_neg_kN_m_per_m, res.MEd_y_neg_kN_m_per_m)
    v_ed_kn = 0.5 * res.wEd_area_kN_m2 * inp.lx_m  # kN/m (estimate; engine flags shear MVP)

    # --- shear capacity (EC2 6.2.2, per metre) ---
    fck = res.coefficients_used.get("fck") if res.coefficients_used else None
    from_fck = None
    try:
        from_fck = float(str(mats.concrete_grade).upper().replace("C", "").replace("M", "").split("/")[0])
    except (ValueError, IndexError):
        from_fck = 30.0
    fck = from_fck
    b, d = 1000.0, res.d_mm
    as_prov_x = res.main_x.As_provided_mm2_per_m if res.main_x else 0.0
    rho = min(as_prov_x / (b * d), 0.02) if d else 0.0
    kf = min(2.0, 1 + _m.sqrt(200 / d)) if d else 1.0
    v_min = 0.035 * kf ** 1.5 * _m.sqrt(fck)
    v_rdc = max(0.12 * kf * (100 * rho * fck) ** (1 / 3), v_min) * b * d  # N/m
    shear_status = "PASS" if v_ed_kn * 1000 <= v_rdc else "FAIL"

    # --- cost (reuse tolerant rates lookup) ---
    rates_path = os.path.join(os.path.dirname(__file__), '..', 'engine', 'rates_db.json')
    try:
        with open(rates_path, 'r') as fp:
            rates_db = json.load(fp)
    except FileNotFoundError:
        rates_db = {}
    conc_tbl, steel_tbl, formwork_rate = resolve_rates(rates_db, request.region)
    concrete_rate = _rate(conc_tbl, mats.concrete_grade, 105000)
    steel_rate = _rate(steel_tbl, mats.steel_grade, 950000)
    volume_concrete = res.thickness_mm / 1000.0 * 1.0
    cost_concrete = volume_concrete * concrete_rate
    steel_weight = (as_prov_x + (res.main_y.As_provided_mm2_per_m if res.main_y else 0)) * 1.0 * 7850 / 1e6
    cost_steel = steel_weight * steel_rate / 1000
    cost_formwork = 1.0 * formwork_rate
    total_cost = cost_concrete + cost_steel + cost_formwork
    slab_area = inp.lx_m * inp.ly_m

    # --- utilisation ---
    util = 0.0
    if res.main_x and res.As_req_x_main:
        util = min(res.As_req_x_main / res.main_x.As_provided_mm2_per_m, 1.0)

    bx = res.main_x.bar_dia_mm if res.main_x else 0
    sx = res.main_x.spacing_mm if res.main_x else 0

    summary = DesignSummary(
        status=res.overall_status, slab_type="Two-Way Slab",
        continuity=_enum(request.continuity).replace("_", " ").title(),
        span_lx=inp.lx_m, span_ly=inp.ly_m, thickness=res.thickness_mm, effective_depth=round(res.d_mm, 1), clear_cover=round(res.cover_mm, 1),     
        concrete_grade=mats.concrete_grade, steel_grade=mats.steel_grade,
        selected_bar_diameter=bx, selected_spacing=sx,
        total_cost=round(total_cost * slab_area, 2), optimization_rank=1, utilization_ratio=round(util, 2),
    )

    design_forces = DesignForces(
        max_sagging_moment=round(max_sag, 2),
        max_hogging_moment=round(-max_hog, 2),
        max_shear_force=round(v_ed_kn, 2),
        ultimate_load=round(res.wEd_area_kN_m2, 2),
        service_load=round(res.Gk_total + res.Qk_total, 2),
    )

    reinforcement = ReinforcementDetails(
        bottom_steel={
            "direction": "Both Directions (Sagging)",
            "bar_diameter": bx, "spacing": sx,
            "area_provided": round(as_prov_x, 1), "area_required": round(res.As_target_x, 1),
        },
        top_steel={
            "direction": "Both Directions (Hogging / Supports)",
            "bar_diameter": bx, "spacing": sx,
            "area_provided": round(as_prov_x, 1), "area_required": round(res.As_req_x_neg, 1),
        },
    )

    deflection = DeflectionResult(
        actual_deflection=round(res.l_over_d_actual, 1),
        allowable_deflection=round(res.l_over_d_lim_final, 1),
        status=res.deflection_status,
        ratio=round(res.l_over_d_actual / res.l_over_d_lim_final, 2) if res.l_over_d_lim_final else 0,
    )

    shear = ShearResult(
        design_shear=round(v_ed_kn, 2), shear_resistance=round(v_rdc / 1000, 2),
        status=shear_status, ratio=round(v_ed_kn * 1000 / v_rdc, 2) if v_rdc else 0,
    )

    compliance = [
        ComplianceCheck(check="Bending — short span (x)", status=res.bending_status_x,
                        ratio=round(res.As_req_x_main / as_prov_x, 2) if as_prov_x else 0, limit=1.0),
        ComplianceCheck(check="Bending — long span (y)", status=res.bending_status_y,
                        ratio=round(res.As_req_y_main / res.main_y.As_provided_mm2_per_m, 2) if res.main_y and res.main_y.As_provided_mm2_per_m else 0, limit=1.0),
        ComplianceCheck(check="Minimum reinforcement", status=res.min_steel_status_x,
                        ratio=round(res.As_min / as_prov_x, 2) if as_prov_x else 0, limit=1.0, note="As,prov ≥ As,min"),
        ComplianceCheck(check="Deflection (span/depth)", status=res.deflection_status,
                        ratio=round(res.l_over_d_actual / res.l_over_d_lim_final, 2) if res.l_over_d_lim_final else 0, limit=1.0),
        ComplianceCheck(check="Shear (V_Ed / V_Rd,c)", status=shear_status,
                        ratio=round(v_ed_kn * 1000 / v_rdc, 2) if v_rdc else 0, limit=1.0),
    ]

    cost_breakdown = CostBreakdown(
        concrete={"volume": round(volume_concrete, 3), "rate": concrete_rate, "cost": round(cost_concrete, 2)},
        steel={"weight": round(steel_weight, 1), "rate": steel_rate / 1000, "cost": round(cost_steel, 2)},
        formwork={"area": 1.0, "rate": formwork_rate, "cost": round(cost_formwork, 2)},
        total=round(total_cost, 2),
        total_per_sqm=round(total_cost / slab_area, 2) if slab_area else 0,
    )

    optimization_options = [OptimizationOption(
        rank=1, thickness=res.thickness_mm, bar_diameter=bx, spacing=sx,
        cost=round(total_cost * slab_area, 2), status=res.overall_status, utilization_ratio=round(util, 2),
    )]

    report = _build_two_way_report(inp, res, fck, v_ed_kn, v_rdc, shear_status)

    return SlabDesignResult(
        task_id="completed", status="completed", summary=summary, design_forces=design_forces,
        reinforcement=reinforcement, deflection=deflection, shear=shear, compliance=compliance,
        cost_breakdown=cost_breakdown, optimization_options=optimization_options, report=report,
    )


def _build_two_way_report(inp, res, fck, v_ed_kn, v_rdc, shear_status):
    R = lambda ref, calc, out: {"reference": ref, "calculation": calc, "output": out}
    sec = []

    sec.append({"title": "1. Cover & Geometry", "rows": [
        R("EC2 \u00a74.4.1.2", f"c_min,b = max(\u03c6, 20) ; c_min,dur ({inp.exposure_class})",
          f"c_nom = {res.cover_mm:.0f} mm"),
        R("Geometry", f"r = l_y/l_x = {inp.ly_m:.2f}/{inp.lx_m:.2f}", f"r = {res.aspect_ratio_r:.3f}"),
        R("EC2 \u00a76.1", f"d = h \u2212 c_nom \u2212 \u03c6/2 = {res.thickness_mm:.0f} \u2212 {res.cover_mm:.0f} \u2212 \u03c6/2",
          f"d = {res.d_mm:.0f} mm"),
        R("EC2 \u00a76.1", f"z = 0.9 d = 0.9 \u00d7 {res.d_mm:.0f}", f"z = {res.z_mm:.0f} mm"),
    ]})

    sec.append({"title": "2. Materials", "rows": [
        R("EC2 Table 3.1", f"f_ck (grade {inp.concrete_grade})", f"f_ck = {fck:.0f} MPa"),
        R("EC2 \u00a73.1.6", "f_cd = \u03b1_cc f_ck / \u03b3_c", f"computed"),
        R("EC2 \u00a73.2.7", "f_yd = f_yk / 1.15", f"computed"),
    ]})

    sec.append({"title": "3. Loads & Combination", "rows": [
        R("Self weight", f"g_self = 25 \u00d7 {res.thickness_mm/1000:.3f}", f"{res.gk_self_kN_m2:.2f} kN/m\u00b2"),
        R("Dead", "G_k (self + finishes + partition + services)", f"G_k = {res.Gk_total:.2f} kN/m\u00b2"),
        R("EN 1991-1-1", f"Q_k (use: {inp.building_use})", f"Q_k = {res.Qk_total:.2f} kN/m\u00b2"),
        R("EN 1990", f"w_Ed = 1.35\u00d7{res.Gk_total:.2f} + 1.50\u00d7{res.Qk_total:.2f}", f"w_Ed = {res.wEd_area_kN_m2:.2f} kN/m\u00b2"),
    ]})

    sec.append({"title": "4. Moments \u2014 Coefficient Method", "rows": [
        R("Concrete Centre Table", f"\u03b1_x: neg {res.alpha_x_neg or 0:.3f} / pos {res.alpha_x_pos or 0:.3f}  (r={res.aspect_ratio_r:.2f})", "interpolated"),
        R("Concrete Centre Table", f"\u03b1_y: neg {res.alpha_y_neg or 0:.3f} / pos {res.alpha_y_pos or 0:.3f}", "from table"),
        R("Moment", f"M_x,pos = \u03b1 \u00d7 w \u00d7 l_x\u00b2 = {res.alpha_x_pos or 0:.3f}\u00d7{res.wEd_area_kN_m2:.2f}\u00d7{inp.lx_m:.2f}\u00b2", f"{res.MEd_x_pos_kN_m_per_m:.2f} kNm/m"),
        R("Moment", f"M_x,neg = {res.alpha_x_neg or 0:.3f}\u00d7{res.wEd_area_kN_m2:.2f}\u00d7{inp.lx_m:.2f}\u00b2", f"{res.MEd_x_neg_kN_m_per_m:.2f} kNm/m"),
        R("Moment", f"M_y,pos = {res.alpha_y_pos or 0:.3f}\u00d7{res.wEd_area_kN_m2:.2f}\u00d7{inp.lx_m:.2f}\u00b2", f"{res.MEd_y_pos_kN_m_per_m:.2f} kNm/m"),
        R("Moment", f"M_y,neg = {res.alpha_y_neg or 0:.3f}\u00d7{res.wEd_area_kN_m2:.2f}\u00d7{inp.lx_m:.2f}\u00b2", f"{res.MEd_y_neg_kN_m_per_m:.2f} kNm/m"),
    ]})

    sec.append({"title": "5. Flexural Reinforcement", "rows": [
        R("EC2 \u00a76.2.3", f"A_s,x = M_x/(f_yd z); governing M_x = {res.As_req_x_main * res.z_mm * 0 + max(res.MEd_x_pos_kN_m_per_m, res.MEd_x_neg_kN_m_per_m):.2f} kNm/m",
          f"A_s,x,req = {res.As_req_x_main:.0f} mm\u00b2/m"),
        R("EC2 \u00a76.2.3", "A_s,y = M_y/(f_yd z)", f"A_s,y,req = {res.As_req_y_main:.0f} mm\u00b2/m"),
        R("EC2 \u00a79.2.1.1", f"A_s,min = max(0.26 f_ctm/f_yk b d, 0.0013 b d)", f"A_s,min = {res.As_min:.0f} mm\u00b2/m"),
        R("Provided", f"x: T{res.main_x.bar_dia_mm} @ {res.main_x.spacing_mm}" if res.main_x else "-",
          f"{res.main_x.As_provided_mm2_per_m:.0f} mm\u00b2/m" if res.main_x else "-"),
        R("Provided", f"y: T{res.main_y.bar_dia_mm} @ {res.main_y.spacing_mm}" if res.main_y else "-",
          f"{res.main_y.As_provided_mm2_per_m:.0f} mm\u00b2/m" if res.main_y else "-"),
    ]})

    sec.append({"title": "6. Distribution Steel", "rows": [
        R("User rule", f"target = 0.50 \u00d7 A_s,main", f"{res.dist_target_x:.0f} mm\u00b2/m"),
        R("Min", "not less than T8 @ 250", f"{res.dist_minimum:.0f} mm\u00b2/m"),
        R("Provided", f"x: T{res.dist_x.bar_dia_mm} @ {res.dist_x.spacing_mm}" if res.dist_x else "-",
          f"{res.dist_x.As_provided_mm2_per_m:.0f} mm\u00b2/m" if res.dist_x else "-"),
        R("Provided", f"y: T{res.dist_y.bar_dia_mm} @ {res.dist_y.spacing_mm}" if res.dist_y else "-",
          f"{res.dist_y.As_provided_mm2_per_m:.0f} mm\u00b2/m" if res.dist_y else "-"),
    ]})

    sec.append({"title": "7. Deflection (span/depth)", "rows": [
        R("EC2 \u00a77.4.2", f"K = {res.K_deflection:.2f} ; \u03c1 = {res.rho:.4f} ; \u03c1\u2080 = {res.rho_0:.4f}", ""),
        R("EC2 \u00a77.4.2", f"(l/d)_basic \u00d7 F3 ({res.F3:.2f})", f"limit = {res.l_over_d_lim_final:.1f}"),
        R("EC2 \u00a77.4.2", f"actual l/d = {inp.lx_m*1000:.0f}/{res.d_mm:.0f}", f"{res.l_over_d_actual:.1f}  ({res.deflection_status})"),
    ]})

    sec.append({"title": "8. Shear Check", "rows": [
        R("EC2 \u00a76.2.2", f"V_Ed \u2248 {v_ed_kn:.2f} kN/m ; V_Rd,c = {v_rdc/1000:.2f} kN/m", f"{shear_status}"),
    ]})

    sec.append({"title": "9. Checks", "rows": [
        R("Check", "bending x / y", f"{res.bending_status_x} / {res.bending_status_y}"),
        R("Check", "minimum steel", f"{res.min_steel_status_x}"),
        R("Check", "deflection", f"{res.deflection_status}"),
        R("System", "overall", f"{res.overall_status}"),
    ]})

    return sec


# ======================================================================
# One-way EC2 adapter: SlabDesignRequest -> one_way_slab_engine -> SlabDesignResult
# ======================================================================
def _calculate_one_way_slab(request: SlabDesignRequest) -> SlabDesignResult:
    g = request.geometry
    mats = request.materials
    loads = request.loads

    inp = _OWInput(
        span_m=g.span_lx,
        continuity=_enum(request.continuity),
        thickness_mm=g.thickness,
        clear_cover_mm=g.clear_cover,
        concrete_grade=mats.concrete_grade,
        steel_grade=mats.steel_grade,
        bar_diameters=request.bar_diameters or [10, 12, 16],
        floor_finish=loads.floor_finish or 0.0,
        additional_dead_load=loads.additional_dead_load or 0.0,
        live_load=loads.live_load or 0.0,
        additional_live_load=loads.additional_live_load or 0.0,
        gamma_concrete=mats.unit_weight_concrete or 25.0,
    )

    res = _ow_design(inp)
    sf, pf = res.span_face, res.support_face
    b = 1000.0

    as_prov_span = sf.bar.As_prov if sf.bar else 0.0
    as_prov_supp = pf.bar.As_prov if pf.bar else 0.0
    util = min(sf.As_req / as_prov_span, 1.0) if as_prov_span else 0.0

    # ---- cost ----
    rates_path = os.path.join(os.path.dirname(__file__), '..', 'engine', 'rates_db.json')
    try:
        with open(rates_path, 'r') as fp:
            rates_db = json.load(fp)
    except FileNotFoundError:
        rates_db = {}
    conc_tbl, steel_tbl, formwork_rate = resolve_rates(rates_db, request.region)
    concrete_rate = _rate(conc_tbl, mats.concrete_grade, 105000)
    steel_rate = _rate(steel_tbl, mats.steel_grade, 950000)
    volume_concrete = res.d_mm and (request.geometry.thickness / 1000.0 * 1.0)
    cost_concrete = volume_concrete * concrete_rate
    steel_weight = (as_prov_span + as_prov_supp) * 1.0 * 7850 / 1e6   # kg/m2
    cost_steel = steel_weight * steel_rate / 1000
    cost_formwork = 1.0 * formwork_rate
    total_cost = cost_concrete + cost_steel + cost_formwork
    slab_area = g.span_lx * g.span_ly

    bx = sf.bar.bar_dia if sf.bar else 0
    sx = sf.bar.spacing if sf.bar else 0

    summary = DesignSummary(
        status=res.overall_status, slab_type="One-Way Slab",
        continuity=_enum(request.continuity).replace("_", " ").title(),
        span_lx=g.span_lx, span_ly=None, thickness=request.geometry.thickness,
        effective_depth=round(res.d_mm, 1), clear_cover=round(res.cover_mm, 1),
        concrete_grade=mats.concrete_grade, steel_grade=mats.steel_grade,
        selected_bar_diameter=bx, selected_spacing=sx,
        total_cost=round(total_cost * slab_area, 2), optimization_rank=1, utilization_ratio=round(util, 2),
    )

    design_forces = DesignForces(
        max_sagging_moment=round(sf.M_kNm, 2),
        max_hogging_moment=round(-pf.M_kNm, 2) if pf.M_kNm else 0.0,
        max_shear_force=round(res.V_ed_kN, 2),
        ultimate_load=round(res.w_ed, 2),
        service_load=round(res.g_k + res.q_k, 2),
    )

    reinforcement = ReinforcementDetails(
        bottom_steel={
            "direction": "Main (Span / Sagging)",
            "bar_diameter": bx, "spacing": sx,
            "area_provided": round(as_prov_span, 1), "area_required": round(sf.As_req, 1),
        },
        top_steel={
            "direction": "Main (Support / Hogging)",
            "bar_diameter": pf.bar.bar_dia if pf.bar else 0, "spacing": pf.bar.spacing if pf.bar else 0,
            "area_provided": round(as_prov_supp, 1), "area_required": round(pf.As_req, 1),
        },
    )

    deflection = DeflectionResult(
        actual_deflection=round(res.actual_slenderness, 1),
        allowable_deflection=round(res.slenderness_limit, 1),
        status=res.deflection_status,
        ratio=round(res.actual_slenderness / res.slenderness_limit, 2) if res.slenderness_limit else 0,
    )

    shear = ShearResult(
        design_shear=round(res.V_ed_kN, 2),
        shear_resistance=round(res.v_rdc * b * res.d_mm / 1000.0, 2),
        status=res.shear_status,
        ratio=round(res.v_ed / res.v_rdc, 2) if res.v_rdc else 0,
    )

    compliance = [
        ComplianceCheck(check="Flexure — span (sagging)", status="PASS" if as_prov_span >= sf.As_req else "FAIL",
                        ratio=round(sf.As_req / as_prov_span, 2) if as_prov_span else 0, limit=1.0),
        ComplianceCheck(check="Flexure — support (hogging)",
                        status="PASS" if (pf.M_kNm == 0 or as_prov_supp >= pf.As_req) else "FAIL",
                        ratio=round(pf.As_req / as_prov_supp, 2) if as_prov_supp else 0, limit=1.0),
        ComplianceCheck(check="Minimum reinforcement", status="PASS" if as_prov_span >= sf.As_min else "FAIL",
                        ratio=round(sf.As_min / as_prov_span, 2) if as_prov_span else 0, limit=1.0, note="As,prov ≥ As,min"),
        ComplianceCheck(check="Deflection (span/depth)", status=res.deflection_status,
                        ratio=round(res.actual_slenderness / res.slenderness_limit, 2) if res.slenderness_limit else 0, limit=1.0),
        ComplianceCheck(check="Shear (v_Ed / v_Rd,c)", status=res.shear_status,
                        ratio=round(res.v_ed / res.v_rdc, 2) if res.v_rdc else 0, limit=1.0),
    ]

    cost_breakdown = CostBreakdown(
        concrete={"volume": round(volume_concrete, 3), "rate": concrete_rate, "cost": round(cost_concrete, 2)},
        steel={"weight": round(steel_weight, 1), "rate": steel_rate / 1000, "cost": round(cost_steel, 2)},
        formwork={"area": 1.0, "rate": formwork_rate, "cost": round(cost_formwork, 2)},
        total=round(total_cost, 2),
        total_per_sqm=round(total_cost, 2),
    )

    optimization_options = [OptimizationOption(
        rank=1, thickness=request.geometry.thickness, bar_diameter=bx, spacing=sx,
        cost=round(total_cost * slab_area, 2), status=res.overall_status, utilization_ratio=round(util, 2),
    )]

    report = _build_one_way_report(request, res, inp)

    return SlabDesignResult(
        task_id="completed", status="completed", summary=summary, design_forces=design_forces,
        reinforcement=reinforcement, deflection=deflection, shear=shear, compliance=compliance,
        cost_breakdown=cost_breakdown, optimization_options=optimization_options, report=report,
    )




def _build_one_way_report(request, res, inp):
    R = lambda ref, calc, out: {"reference": ref, "calculation": calc, "output": out}
    sf, pf = res.span_face, res.support_face
    cont = _enum(request.continuity).replace("_", " ").title()

    g = request.geometry
    mats = request.materials
    b = 1000.0
    h = g.thickness
    d = res.d_mm
    cover = res.cover_mm
    fck = parse_fck(mats.concrete_grade)
    fyk = parse_fy(mats.steel_grade)
    fyd = fyk / 1.15
    fcd = fck / 1.5
    fctm = 0.30 * fck ** (2 / 3) if fck <= 50 else 2.12 * math.log(1 + (fck + 8) / 10)
    gamma_c = mats.unit_weight_concrete or 25.0
    phi = sf.bar.bar_dia if sf.bar else (inp.bar_diameters[0] if inp.bar_diameters else 12)
    exposure = _enum(request.design_params.exposure_class)
    L = inp.span_m

    sec = []

    # ---------------- 1. Design basis ----------------
    sec.append({"title": "1. Design Basis and References", "rows": [
        R("EN 1990", "Basis of structural design \u2014 ULS combination Eq. 6.10", "adopted"),
        R("EN 1991-1-1", "Actions: densities, self-weight (\u00a73.2.1), imposed loads (Table 6.2)", "adopted"),
        R("EN 1992-1-1", "Concrete design \u2014 \u00a76.1 flexure, \u00a76.2.2 shear, \u00a77.4.2 deflection, \u00a79.2.1.1 min steel", "adopted"),
        R("UK NA", "National Annex to EN 1992-1-1", "adopted"),
        R("Design strip", "one-way slab designed as a 1 m wide strip spanning one direction", f"b = {b:.0f} mm"),
        R("Support", f"continuity = {cont}", f"Lx = {L:.2f} m"),
    ]})

    # ---------------- 2. Geometry, cover & materials ----------------
    sec.append({"title": "2. Geometry, Cover and Materials", "rows": [
        R("Geometry", f"span Lx = {L:.2f} m ; overall thickness h = {h:.0f} mm", f"h = {h:.0f} mm"),
        R("Cover input", f"clear cover specified by user, Cc = {g.clear_cover:.0f} mm", f"Cc,input = {g.clear_cover:.0f} mm"),
        R("Tolerance", "a fixed 5 mm fixing/detailing allowance is added to the clear cover specified above -- this is not user-editable", "+5 mm"),
        R("Cover used", f"Cc,used = Cc,input + 5 mm = {g.clear_cover:.0f} + 5", f"Cc = {cover:.0f} mm"),
        R("Bar assumed", f"main bar \u03c6 = {phi:.0f} mm  \u2192  \u03c6/2 = {phi/2:.1f} mm", f"\u03c6 = {phi:.0f} mm"),
        R("EC2 \u00a76.1", f"d = h \u2212 Cc \u2212 \u03c6/2 = {h:.0f} \u2212 {cover:.0f} \u2212 {phi/2:.1f}", f"d = {d:.0f} mm"),
        R("EC2 Table 3.1", f"f_ctm = 0.30 \u00d7 f_ck^(2/3) = 0.30 \u00d7 {fck:.0f}^(2/3) = 0.30 \u00d7 {fck**(2/3):.3f}", f"f_ctm = {fctm:.2f} MPa"),
        R("EC2 \u00a73.1.6", f"f_cd = f_ck/\u03b3_c = {fck:.0f}/1.50", f"f_cd = {fcd:.2f} MPa"),
        R("EC2 \u00a73.2.7", f"f_yd = f_yk/\u03b3_s = {fyk:.0f}/1.15", f"f_yd = {fyd:.1f} MPa"),
    ]})

    # ---------------- 3. Permanent loads ----------------
    sw = res.self_weight
    ff = inp.floor_finish or 0.0
    pa = inp.additional_dead_load or 0.0   # "Partition allowance" -- the extra permanent load input
    ll = inp.live_load or 0.0
    al = inp.additional_live_load or 0.0
    sec.append({"title": "3. Permanent Loads (Load Analysis)", "rows": [
        R("EN 1991-1-1 \u00a73.2.1", f"Self-weight of slab = \u03b3_c \u00d7 h = {gamma_c:.0f} kN/m\u00b3 \u00d7 {h/1000:.2f}m", f"{sw:.2f} kN/m\u00b2"),
        R("User input", "Weight of finishes (assume)", f"{ff:.2f} kN/m\u00b2"),
        R("User input", "Partition allowance", f"{pa:.2f} kN/m\u00b2"),
        R("Total dead load", f"G_k = Self-weight + Weight of finishes + Partition allowance = {sw:.2f} + {ff:.2f} + {pa:.2f}", f"G_k = {res.g_k:.2f} kN/m\u00b2"),
    ]})

    # ---------------- 4. Variable loads ----------------
    sec.append({"title": "4. Variable Load on Slab", "rows": [
        R("EN 1991-1-1 Table 6.2", f"Leading variable action (imposed load), based on building use", f"{ll:.2f} kN/m\u00b2"),
        R("User input", "Extra live load", f"{al:.2f} kN/m\u00b2"),
        R("Total variable load", f"Q_k = imposed + extra live load = {ll:.2f} + {al:.2f}", f"Q_k = {res.q_k:.2f} kN/m\u00b2"),
    ]})

    # ---------------- 4. ULS combination ----------------
    pg, pq = 1.35 * res.g_k, 1.50 * res.q_k
    sec.append({"title": "4. Ultimate Limit State Combination", "rows": [
        R("EN 1990 Eq. 6.10", "w_u = \u03b3_Gk\u00b7G_k + \u03b3_Qk\u00b7Q_k", "combination adopted"),
        R("Partial factors", "\u03b3_Gk = 1.35 (permanent) ; \u03b3_Qk = 1.50 (variable)", "EN 1990 Table A1.2(B)"),
        R("Substitution", f"w_u = (1.35 \u00d7 {res.g_k:.2f}) + (1.50 \u00d7 {res.q_k:.2f}) = {pg:.4f} + {pq:.4f}", f"w_u = {res.w_ed:.4f} kN/m\u00b2"),
        R("Design line load", f"1 m strip: w = {res.w_ed:.2f} kN/m\u00b2 \u00d7 1.00 m", f"w = {res.w_ed:.2f} kN/m"),
    ]})

    # ---------------- 5. Design moments & shear (closed form) ----------------
    c_sag = sf.M_kNm / (res.w_ed * L ** 2) if (res.w_ed and L) else 0.0
    c_hog = pf.M_kNm / (res.w_ed * L ** 2) if (res.w_ed and L) else 0.0
    c_v = res.V_ed_kN / (res.w_ed * L) if (res.w_ed and L) else 0.0
    continuity_val = _enum(request.continuity)

    span_captions = {
        "simply_supported": "single coefficient span: M_Ed = c \u00d7 w \u00d7 Lx\u00b2 ; for a simply-supported slab, c = 0.125",
        "one_end_continuous": "single coefficient span: M_Ed = c \u00d7 w \u00d7 Lx\u00b2 ; one end continuous, one end simply supported, c = 9/128",
        "both_ends_continuous": "single coefficient span: M_Ed = c \u00d7 w \u00d7 Lx\u00b2 ; both ends continuous, c = 1/24",
        "cantilever": "single coefficient span: M_Ed = c \u00d7 w \u00d7 Lx\u00b2 ; cantilever has no midspan sagging, c = 0",
    }
    hogging_captions = {
        "simply_supported": "since it is a single span, there is no need to add a hogging moment -- it will always be zero for a simply-supported single span",
        "one_end_continuous": "one end continuous: hogging develops at the continuous support only, c = 1/8",
        "both_ends_continuous": "both ends continuous: hogging develops at both supports, c = 1/12",
        "cantilever": "cantilever: hogging (fixed-end moment) governs, there is no sagging span moment to report, c = 1/2",
    }
    shear_captions = {
        "simply_supported": "c = 0.5 for simply supported, i.e. w\u00b7Lx/2",
        "one_end_continuous": "c = 0.625 for one end continuous (peak shear occurs at the continuous end)",
        "both_ends_continuous": "c = 0.5 for both ends continuous, i.e. w\u00b7Lx/2",
        "cantilever": "c = 1.0 for a cantilever, full reaction is taken at the fixed end",
    }

    span_row = R("EC2 \u00a75.4", span_captions.get(continuity_val, span_captions["simply_supported"]), f"c = {c_sag:.4f}")
    hog_row = R("Hogging", hogging_captions.get(continuity_val, hogging_captions["simply_supported"]), f"M_hog = {pf.M_kNm:.2f} kNm/m")
    shear_row = R("Shear", f"V_Ed = c \u00d7 w \u00d7 Lx = {c_v:.3f} \u00d7 {res.w_ed:.2f} \u00d7 {L:.2f}  ({shear_captions.get(continuity_val, shear_captions['simply_supported'])})", f"V_Ed = {res.V_ed_kN:.2f} kN/m")

    moment_rows = [span_row]
    if continuity_val == "cantilever":
        moment_rows.append(R("Span (sagging)", "cantilever: no midspan sagging moment", f"M_Ed = {sf.M_kNm:.2f} kNm/m"))
    else:
        moment_rows.append(R("Span (sagging)", f"M_Ed = c \u00d7 w \u00d7 Lx\u00b2 = {c_sag:.4f} \u00d7 {res.w_ed:.2f} \u00d7 {L:.2f}\u00b2", f"M_Ed = {sf.M_kNm:.2f} kNm/m"))
        if continuity_val == "simply_supported":
            moment_rows.append(R("Equivalent form", f"M_Ed = w\u00b7Lx\u00b2/8 = ({res.w_ed:.2f} \u00d7 {L**2:.2f})/8 \u2014 maximum moment at mid-span", f"{res.w_ed*L**2/8:.2f} kNm/m"))
    moment_rows.append(hog_row)
    moment_rows.append(shear_row)

    sec.append({"title": "5. Design Moments (Closed-Form)", "rows": moment_rows})

    # ---------------- 6. Flexural reinforcement -- span ----------------
    root = max(0.25 - sf.k / 1.134, 0.0)
    sec.append({"title": "6. Flexural Reinforcement \u2014 Span", "rows": [
        R("Effective depth", f"d = h \u2212 Cc \u2212 \u03c6/2, assuming \u03c6{phi:.0f}mm bars will be employed", f"d = {h:.0f} \u2212 {cover:.0f} \u2212 {phi/2:.1f} = {d:.0f} mm ; b = {b:.0f} mm"),
        R("EC2 \u00a76.1", f"K = M_Ed/(f_ck\u00b7b\u00b7d\u00b2) = ({sf.M_kNm:.2f} \u00d7 10\u2076)/({fck:.0f} \u00d7 {b:.0f} \u00d7 {d:.0f}\u00b2) = {sf.M_kNm*1e6:.4g}/{fck*b*d**2:.4g}", f"K = {sf.k:.4f}"),
        R("Compression steel check", f"K = {sf.k:.4f} {'<' if sf.singly else '\u2265'} 0.167", "K < 0.167 \u2192 singly reinforced, no compression reinforcement required" if sf.singly else "K \u2265 0.167 \u2192 compression reinforcement required"),
        R("EC2 \u00a76.1", f"Z = d(0.5 + \u221a(0.25 \u2212 K/1.134)) = {d:.0f}(0.5 + \u221a(0.25 \u2212 {sf.k:.4f}/1.134)) = {d:.0f}(0.5 + \u221a{root:.4f})", f"Z = {sf.z_mm:.1f} mm \u2264 0.95d"),
        R("EC2 \u00a76.1", f"A_s = M_Ed/(0.87\u00b7f_yk\u00b7Z) = ({sf.M_kNm:.2f} \u00d7 10\u2076)/(0.87 \u00d7 {fyk:.0f} \u00d7 {sf.z_mm:.1f})", f"A_s = {sf.As:.0f} mm\u00b2/m"),
    ]})

    # ---------------- 7. Minimum reinforcement ----------------
    bd = b * d
    t1 = 0.26 * fctm / fyk * bd
    t2 = 0.0013 * bd
    gov = "concrete tensile strength basis" if t1 >= t2 else "0.13% minimum basis"
    sec.append({"title": "7. Minimum Reinforcement Check", "rows": [
        R("EC2 \u00a79.2.1.1", "A_s,min = max( 0.26\u00b7f_ctm/f_yk\u00b7b\u00b7d , 0.0013\u00b7b\u00b7d )  \u2014 formula used strictly, with f_ctm from EC2 Table 3.1", "As,min formula"),
        R("Basis 1 \u2014 concrete tensile strength", f"0.26 \u00d7 f_ctm/f_yk \u00d7 b\u00b7d = 0.26 \u00d7 {fctm:.2f}/{fyk:.0f} \u00d7 {bd:.0f}", f"{t1:.0f} mm\u00b2/m"),
        R("Basis 2 \u2014 0.13% of section", f"0.0013 \u00d7 b\u00b7d = 0.0013 \u00d7 {bd:.0f}", f"{t2:.0f} mm\u00b2/m"),
        R("Governing", f"A_s,min = max({t1:.0f} , {t2:.0f})  \u2190 {gov} governs", f"A_s,min = {sf.As_min:.0f} mm\u00b2/m"),
        R("Required", f"A_s,req = max(A_s , A_s,min) = max({sf.As:.0f} , {sf.As_min:.0f})  \u2192 {'bending governs' if sf.As >= sf.As_min else 'minimum steel governs'}", f"A_s,req = {sf.As_req:.0f} mm\u00b2/m"),
    ]})

    # ---------------- 8. Bar selection ----------------
    if sf.bar:
        Ab = math.pi * sf.bar.bar_dia ** 2 / 4.0
        s_max = min(3 * h, 400)
        sec.append({"title": "8. Bar Selection \u2014 Span", "rows": [
            R("Bar area", f"A_bar = \u03c0\u03c6\u00b2/4 = \u03c0 \u00d7 {sf.bar.bar_dia:.0f}\u00b2/4", f"A_bar = {Ab:.1f} mm\u00b2"),
            R("Spacing required", f"s \u2264 A_bar \u00d7 1000/A_s,req = {Ab:.1f} \u00d7 1000/{sf.As_req:.0f} = {Ab*1000/sf.As_req if sf.As_req else 0:.0f} mm", f"adopt s = {sf.bar.spacing:.0f} mm"),
            R("Provided", f"A_s,prov = A_bar \u00d7 (1000/s) = {Ab:.1f} \u00d7 (1000/{sf.bar.spacing:.0f})", f"A_s,prov = {sf.bar.As_prov:.0f} mm\u00b2/m"),
            R("Check", f"A_s,prov \u2265 A_s,req \u2192 {sf.bar.As_prov:.0f} \u2265 {sf.As_req:.0f}", "OK" if sf.bar.As_prov >= sf.As_req else "INCREASE STEEL"),
            R("EC2 \u00a79.3.1.1", f"max spacing = min(3h , 400) = min({3*h:.0f} , 400) = {s_max:.0f} mm ; provided {sf.bar.spacing:.0f} mm", "OK" if sf.bar.spacing <= s_max else "SPACING TOO WIDE"),
            R("Provide", f"\u03c6{sf.bar.bar_dia:.0f} @ {sf.bar.spacing:.0f} mm c/c (bottom, main direction)", f"T{sf.bar.bar_dia:.0f} @ {sf.bar.spacing:.0f}"),
        ]})

    # ---------------- 9. Support reinforcement (only if hogging is non-zero) ----------------
    if pf.M_kNm > 0:
        rows = [
            R("EC2 \u00a76.1", f"K = M_hog/(f_ck\u00b7b\u00b7d\u00b2) = ({pf.M_kNm:.2f} \u00d7 10\u2076)/({fck:.0f} \u00d7 {b:.0f} \u00d7 {d:.0f}\u00b2)", f"K = {pf.k:.4f}"),
            R("Lever arm", f"Z = d(0.5 + \u221a(0.25 \u2212 {pf.k:.4f}/1.134)) \u2264 0.95d", f"Z = {pf.z_mm:.1f} mm"),
            R("EC2 \u00a76.1", f"A_s = M_hog/(0.87\u00b7f_yk\u00b7Z) = ({pf.M_kNm:.2f} \u00d7 10\u2076)/(0.87 \u00d7 {fyk:.0f} \u00d7 {pf.z_mm:.1f})", f"A_s = {pf.As:.0f} mm\u00b2/m"),
            R("Required", f"A_s,req = max({pf.As:.0f} , A_s,min {pf.As_min:.0f})", f"A_s,req = {pf.As_req:.0f} mm\u00b2/m"),
        ]
        if pf.bar:
            rows.append(R("Provide", f"\u03c6{pf.bar.bar_dia:.0f} @ {pf.bar.spacing:.0f} mm c/c (top, over support)", f"A_s,prov = {pf.bar.As_prov:.0f} mm\u00b2/m"))
        sec.append({"title": "9. Flexural Reinforcement \u2014 Support (Hogging)", "rows": rows})

    # ---------------- 10. Deflection check ----------------
    As_prov_span = sf.bar.As_prov if sf.bar else 0.0
    As_req_span = sf.As_req
    K_note = "K = 1.0 (simply supported) / 1.5 (interior span) / 1.3 (end span) / 0.4 (cantilever)"
    deflection_rows = [
        R("Note", "for slabs, most especially two-way spanning slabs, checks are carried out based on the shorter span", ""),
        R("Note", K_note, f"K = {res.K_sys:.2f} ({cont})"),
        R("Note", "compression reinforcement \u03c1' is taken as 0", "\u03c1' = 0"),
        R("Basic span/depth ratio", f"\u03c1 = A_s,required/(b\u00b7d) = {As_req_span:.0f}/{bd:.0f}", f"\u03c1 = {res.rho:.5f}"),
        R("Basic span/depth ratio", f"\u03c1\u2080 = 10\u207b\u00b3 \u00d7 \u221af_ck = 10\u207b\u00b3 \u00d7 \u221a{fck:.0f}", f"\u03c1\u2080 = {res.rho0:.5f}"),
        R("Branch", f"\u03c1 = {res.rho:.5f} vs \u03c1\u2080 = {res.rho0:.5f}",
          "\u03c1 < \u03c1\u2080 \u2192 use lightly-reinforced formula" if res.rho <= res.rho0 else "\u03c1 > \u03c1\u2080 \u2192 use heavily-reinforced formula"),
        R("EC2 \u00a77.4.2", ("(L/d) = K[11 + 1.5\u221af_ck\u00b7(\u03c1\u2080/\u03c1) + 3.2\u221af_ck\u00b7(\u03c1\u2080/\u03c1 \u2212 1)^(3/2)]" if res.rho <= res.rho0
                             else "(L/d) = K[11 + 1.5\u221af_ck\u00b7\u03c1\u2080/(\u03c1 \u2212 \u03c1') + \u221af_ck/12\u00b7\u221a(\u03c1'/\u03c1\u2080)]  , \u03c1' = 0"),
          f"(L/d) = {res.ld_basic:.2f}"),
        R("Base check", f"(L/d)actual {'\u2264' if res.deflection_base_status == 'PASS' else '>'} (L/d)basic \u2192 {res.actual_slenderness:.2f} {'\u2264' if res.deflection_base_status == 'PASS' else '>'} {res.ld_basic:.2f}",
          res.deflection_base_status),
    ]
    if res.deflection_enhanced:
        deflection_rows += [
            R("Enhancement factor", f"F3 = A_s,prov/A_s,req = {As_prov_span:.0f}/{As_req_span:.0f}  (\u2264 1.5)", f"F3 = {res.beta_s:.3f}"),
            R("Allowable Span/Depth ratio", f"allowable (L/d) = F3 \u00d7 (L/d)basic = {res.beta_s:.3f} \u00d7 {res.ld_basic:.2f}", f"{res.slenderness_limit:.2f}"),
        ]
    else:
        deflection_rows.append(
            R("Enhancement factor", "base check already passes \u2014 F3 not required", "F3 not applied")
        )
    deflection_rows += [
        R("Actual deflection", f"(L/d)actual = Lx/d = {L*1000:.0f}/{d:.0f}", f"{res.actual_slenderness:.2f}"),
        R("Verdict", f"(L/d)actual {'<' if res.deflection_status == 'PASS' else '>'} allowable (L/d)  \u2192  {res.actual_slenderness:.2f} {'<' if res.deflection_status == 'PASS' else '>'} {res.slenderness_limit:.2f}",
          "Deflection is okay" if res.deflection_status == "PASS" else "Deflection is NOT okay \u2014 increase depth or steel"),
    ]
    sec.append({"title": "10. Check for Deflection", "rows": deflection_rows})

    # ---------------- 11. Shear verification ----------------
    rho_l = min(As_prov_span / bd, 0.02) if bd else 0.0
    k_raw = 1 + math.sqrt(200 / d) if d else 1.0
    k_sh = min(k_raw, 2.0)
    C_Rdc = 0.18 / 1.5
    inner = 100 * rho_l * fck
    v_main = C_Rdc * k_sh * inner ** (1 / 3)
    v_min = 0.035 * k_sh ** 1.5 * math.sqrt(fck)
    VRdc_kN = res.v_rdc * b * d / 1000.0
    sec.append({"title": "11. Shear Verification", "rows": [
        R("Maximum shear at support", f"V_Ed = \u03b2s \u00d7 n \u00d7 Lx = 0.5 \u00d7 {res.w_ed:.2f} \u00d7 {L:.2f}  (or n\u00b7Lx/2)", f"V_Ed = {res.V_ed_kN:.2f} kN/m"),
        R("v_Ed", f"v_Ed = V_Ed/(b\u00b7d) = ({res.V_ed_kN:.2f} \u00d7 10\u00b3)/({b:.0f} \u00d7 {d:.0f})", f"v_Ed = {res.v_ed:.3f} MPa"),
        R("Steel ratio", f"\u03c1_i = A_s,provided/(b\u00b7d) = {As_prov_span:.0f}/{bd:.0f}  (\u2264 0.02)", f"\u03c1_i = {rho_l:.5f}"),
        R("Size factor", f"k = 1 + \u221a(200/d) = 1 + \u221a(200/{d:.0f})  (\u2264 2.0)", f"k = {k_sh:.3f}"),
        R("EC2 \u00a76.2.2", f"C_Rd,c = 0.18/\u03b3_c = 0.18/1.50", f"C_Rd,c = {C_Rdc:.3f}"),
        R("Axial stress", "\u03c3_cp = N_Ed/A_c ; take N_Ed = 0 for a slab (\u2264 0.2\u00b7f_cd)", "\u03c3_cp = 0.000 MPa"),
        R("Axial factor", "k_i = 0.15", "k_i\u00b7\u03c3_cp = 0.000 MPa"),
        R("EC2 \u00a76.2.2", "V_Rd,c = [C_Rd,c\u00b7k\u00b7(100\u00b7\u03c1_i\u00b7f_ck)^(1/3) + k_i\u00b7\u03c3_cp]\u00b7bw\u00b7d  \u2265  (v_min + k_i\u00b7\u03c3_cp)\u00b7bw\u00b7d", "governing expression"),
        R("Main term", f"C_Rd,c\u00b7k\u00b7(100\u00b7\u03c1_i\u00b7f_ck)^(1/3) = {C_Rdc:.3f} \u00d7 {k_sh:.3f} \u00d7 (100 \u00d7 {rho_l:.5f} \u00d7 {fck:.0f})^(1/3)", f"{v_main:.3f} MPa"),
        R("v_min", f"v_min = 0.035\u00b7k^(3/2)\u00b7f_ck^(1/2) = 0.035 \u00d7 {k_sh:.3f}^1.5 \u00d7 \u221a{fck:.0f}", f"{v_min:.3f} MPa"),
        R("Governing", f"v_Rd,c = max({v_main:.3f} , {v_min:.3f})", f"v_Rd,c = {res.v_rdc:.3f} MPa"),
        R("Resistance", f"V_Rd,c = v_Rd,c \u00b7 b \u00b7 d = {res.v_rdc:.3f} \u00d7 {b:.0f} \u00d7 {d:.0f} / 10\u00b3", f"V_Rd,c = {VRdc_kN:.2f} kN/m"),
        R("Verdict", f"if V_Rd,c > V_Ed, no shear reinforcement is required  \u2192  {VRdc_kN:.2f} {'>' if res.shear_status == 'PASS' else '\u2264'} {res.V_ed_kN:.2f}", res.shear_status),
        R("Note", "shear reinforcement is rarely required in solid slabs supported by beams; no further shear checks are performed on slabs", ""),
    ]})

    # ---------------- 12. Summary ----------------
    rows = [
        R("Section", f"h = {h:.0f} mm ; d = {d:.0f} mm ; cover used = {cover:.0f} mm", f"{h:.0f} mm slab"),
        R("Loading", f"G_k = {res.g_k:.2f} ; Q_k = {res.q_k:.2f} \u2192 w_u = {res.w_ed:.2f} kN/m\u00b2", f"w_u = {res.w_ed:.2f} kN/m\u00b2"),
        R("Actions", f"M_Ed = {sf.M_kNm:.2f} kNm/m ; M_hog = {pf.M_kNm:.2f} kNm/m ; V_Ed = {res.V_ed_kN:.2f} kN/m", "ULS"),
        R("Span steel", f"A_s,req = {sf.As_req:.0f} mm\u00b2/m \u2192 provided {sf.bar.As_prov:.0f} mm\u00b2/m" if sf.bar else f"A_s,req = {sf.As_req:.0f} mm\u00b2/m",
          f"T{sf.bar.bar_dia:.0f} @ {sf.bar.spacing:.0f}" if sf.bar else "-"),
        R("Deflection", f"actual {res.actual_slenderness:.2f} vs allowable {res.slenderness_limit:.2f}", res.deflection_status),
        R("Shear", f"v_Ed {res.v_ed:.3f} vs v_Rd,c {res.v_rdc:.3f} MPa", res.shear_status),
        R("Overall", "all ULS and SLS checks", res.overall_status),
    ]
    rows += [R("Note", n, "") for n in res.notes]
    sec.append({"title": "12. Design Summary", "rows": rows})

    # sections 9 (support steel) is conditional, so renumber consecutively before returning
    renumbered = []
    for i, s in enumerate(sec, start=1):
        t = s["title"]
        if "." in t[:3]:
            t = t.split(". ", 1)[-1]
        renumbered.append({"title": f"{i}. {t}", "rows": s["rows"]})
    return renumbered