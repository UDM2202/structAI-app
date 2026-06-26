# backend/services/beam_service.py
import re
import math
from models.beam_schemas import (
    BeamDesignRequest, BeamDesignResult, BeamSummary, BeamMaterialsOut,
    BeamLoadSummary, BeamForces, BeamCapacity, BeamReinforcement, BeamSLS,
)

PI = math.pi


def _enum(v):
    return v.value if hasattr(v, "value") else v


def parse_fck(grade):
    g = str(grade).upper().replace("C", "").replace("M", "")
    try:
        return float(g.split("/")[0])
    except (ValueError, IndexError):
        return 25.0


def parse_fy(grade):
    m = re.search(r"(\d{3})", str(grade))
    return float(m.group(1)) if m else 500.0


# moment / shear coefficients:  M = cM * w * L^2 ,  V = cV * w * L
SUPPORT_COEFFS = {
    "both_ends_simply_supported": (1 / 8, 1 / 2, "Simply Supported"),
    "both_ends_fixed": (1 / 12, 1 / 2, "Both Ends Fixed"),
    "one_fixed_one_simple": (1 / 8, 5 / 8, "Propped Cantilever"),
    "one_fixed_one_free": (1 / 2, 1.0, "Cantilever"),
}


def pick_bars(as_req, dias):
    """Choose bar count/diameter for a beam (prefers 2–6 bars)."""
    fallback = None
    for dia in sorted(dias):
        area = PI / 4 * dia ** 2
        n = max(2, math.ceil(as_req / area))
        opt = {"count": n, "bar_diameter": dia, "area_provided": round(n * area, 0)}
        if fallback is None:
            fallback = opt
        if 2 <= n <= 6:
            return opt
    return fallback


def calculate_beam_design(request: BeamDesignRequest) -> BeamDesignResult:
    code = _enum(request.design_code)
    is_bs = code == "BS8110"
    support = _enum(request.support_condition)
    restraint = _enum(request.top_restraint)

    g = request.geometry
    b, h = g.width, g.depth
    cover = g.effective_cover
    L = g.span / 1000.0  # m

    fck = parse_fck(request.materials.concrete_grade)
    fy = parse_fy(request.materials.steel_grade)
    link = request.link_diameter

    # ---- loads (kN/m) ----
    self_w = (b / 1000.0) * (h / 1000.0) * request.materials.unit_weight_concrete if request.loads.self_weight_auto else 0.0
    comps = [
        {"name": "Beam Self Weight", "kind": "DL", "value": round(self_w, 2)},
        {"name": "Wall Load (Uniform)", "kind": "DL", "value": round(request.loads.wall_load, 2)},
        {"name": "Finishes", "kind": "DL", "value": round(request.loads.finishes, 2)},
        {"name": "Additional Dead Load (DDL)", "kind": "DL", "value": round(request.loads.additional_dead_load, 2)},
        {"name": "Live Load (LL)", "kind": "LL", "value": round(request.loads.live_load, 2)},
        {"name": "Other Live Load", "kind": "LL", "value": round(request.loads.other_live_load, 2)},
    ]
    gk = self_w + request.loads.wall_load + request.loads.finishes + request.loads.additional_dead_load
    qk = request.loads.live_load + request.loads.other_live_load
    service = gk + qk

    if is_bs:
        w_d = 1.4 * gk + 1.6 * qk
        combo = "1.4 Gk + 1.6 Qk (BS 8110)"
    else:
        w_d = 1.35 * gk + 1.5 * qk
        combo = "1.35 Gk + 1.50 Qk (EN 1990)"

    cM, cV, support_label = SUPPORT_COEFFS.get(support, SUPPORT_COEFFS["both_ends_simply_supported"])
    m_ed = cM * w_d * L ** 2   # kNm
    v_ed = cV * w_d * L        # kN

    # ---- flexure ----
    d0 = h - cover - link - 10  # first guess (assume 20mm bar)
    if is_bs:
        fcu = fck
        K = m_ed * 1e6 / (b * d0 ** 2 * fcu)
        K = min(K, 0.156)
        z = min(d0 * (0.5 + (max(0.25 - K / 0.9, 0)) ** 0.5), 0.95 * d0)
        as_req = m_ed * 1e6 / (0.95 * fy * z)
        fcd = 0.45 * fcu
        fyd = 0.95 * fy
    else:
        fcd = fck / 1.5
        fyd = fy / 1.15
        K = m_ed * 1e6 / (b * d0 ** 2 * fck)
        z = min(d0 * (0.5 + (max(0.25 - K / 1.134, 0)) ** 0.5), 0.95 * d0)
        as_req = m_ed * 1e6 / (fyd * z)

    # min/max steel
    if is_bs:
        as_min = 0.0013 * b * h
    else:
        fctm = 0.3 * fck ** (2 / 3) if fck <= 50 else 2.12
        as_min = max(0.26 * fctm / fy * b * d0, 0.0013 * b * d0)
    as_req = max(as_req, as_min)

    bars = pick_bars(as_req, request.bar_diameters)
    d = h - cover - link - bars["bar_diameter"] / 2  # refined effective depth
    # recompute z & resistance with refined d
    if is_bs:
        K = min(m_ed * 1e6 / (b * d ** 2 * fck), 0.156)
        z = min(d * (0.5 + (max(0.25 - K / 0.9, 0)) ** 0.5), 0.95 * d)
        m_rd = 0.95 * fy * bars["area_provided"] * z / 1e6
    else:
        K = m_ed * 1e6 / (b * d ** 2 * fck)
        z = min(d * (0.5 + (max(0.25 - K / 1.134, 0)) ** 0.5), 0.95 * d)
        m_rd = fyd * bars["area_provided"] * z / 1e6
    util_bend = m_ed / m_rd if m_rd else 0

    # nominal compression / hanger steel: 2 × smallest bar
    comp_dia = min(request.bar_diameters)
    comp_area = 2 * PI / 4 * comp_dia ** 2

    # ---- shear ----
    as_prov = bars["area_provided"]
    rho = min(as_prov / (b * d), 0.02 if not is_bs else 0.03)
    v_ed_n = v_ed * 1000.0  # N
    if is_bs:
        fcu_f = min(fck, 40) / 25.0
        vc = 0.79 * (100 * rho) ** (1 / 3) * (400 / d) ** 0.25 / 1.25 * fcu_f ** (1 / 3)
        v_rdc = vc * b * d  # N
    else:
        kf = min(2.0, 1 + (200 / d) ** 0.5)
        v_min = 0.035 * kf ** 1.5 * fck ** 0.5
        v_rdc = max(0.12 * kf * (100 * rho * fck) ** (1 / 3), v_min) * b * d  # N
    util_shear = v_ed_n / v_rdc if v_rdc else 0

    # links: minimum if within concrete capacity, else design spacing
    asw = 2 * PI / 4 * link ** 2  # 2-leg area
    if v_ed_n <= v_rdc:
        link_spacing = int(min(0.75 * d, 300) // 25 * 25)
    else:
        fywd = (0.95 * fy) if is_bs else (fy / 1.15)
        s = asw * z * fywd / (v_ed_n)  # cotθ = 1
        link_spacing = max(75, int(min(s, 0.75 * d, 300) // 25 * 25))

    # ---- SLS: deflection (short-term, gross section) ----
    Ecm = 22000 * ((fck + 8) / 10) ** 0.3 if not is_bs else 24000  # N/mm²
    I_gross = b * h ** 3 / 12.0
    w_sls = service  # N/mm  (1 kN/m == 1 N/mm)
    span_mm = g.span
    if support == "one_fixed_one_free":  # cantilever
        defl = w_sls * span_mm ** 4 / (8 * Ecm * I_gross)
    elif support == "both_ends_fixed":
        defl = w_sls * span_mm ** 4 / (384 * Ecm * I_gross)
    else:
        defl = 5 * w_sls * span_mm ** 4 / (384 * Ecm * I_gross)
    defl_limit = span_mm / 250.0
    defl_status = "PASS" if defl <= defl_limit else "FAIL"

    # ---- SLS: crack width (simplified EC2 7.3.4) ----
    Es = 200000.0
    psi2 = 0.3
    m_qp = cM * (gk + psi2 * qk) * L ** 2  # quasi-permanent moment, kNm
    sigma_s = (m_qp * 1e6) / (as_prov * z) if (as_prov and z) else 0
    fct_eff = 0.3 * fck ** (2 / 3) if fck <= 50 else 2.9
    ac_eff = b * min(2.5 * (h - d), h / 2)
    rho_eff = as_prov / ac_eff if ac_eff else 0.01
    alpha_e = Es / Ecm
    phi = bars["bar_diameter"]
    sr_max = 3.4 * cover + 0.425 * 0.8 * 0.5 * phi / rho_eff if rho_eff else 0
    eps = max((sigma_s - 0.4 * fct_eff / rho_eff * (1 + alpha_e * rho_eff)) / Es, 0.6 * sigma_s / Es) if rho_eff else 0
    crack = sr_max * eps
    crack_limit = 0.30
    crack_status = "PASS" if crack <= crack_limit else "FAIL"

    overall = "PASS" if (util_bend <= 1 and util_shear <= 1 and defl_status == "PASS" and crack_status == "PASS") else "FAIL"
    code_label = "BS 8110:1997" if is_bs else ("ACI 318" if code == "ACI318" else "EN 1992-1-1 (EC2)")

    notes = [
        f"Design in accordance with {code_label}.",
        "Design UDL includes beam self-weight." if request.loads.self_weight_auto else "Self-weight excluded by user.",
        "Deflection is short-term on the gross (uncracked) section; long-term values will be higher.",
        "Crack width is a simplified EC2 7.3.4 estimate (quasi-permanent, ψ2 = 0.3).",
        "Dimensions in mm; forces in kN and kNm.",
    ]

    return BeamDesignResult(
        summary=BeamSummary(
            beam_id=request.beam_id, support_condition=support_label,
            top_restraint=restraint.replace("_", " ").title(),
            span=g.span, width=b, depth=h, effective_depth=round(d, 1), effective_cover=cover,
            concrete_grade=request.materials.concrete_grade, steel_grade=request.materials.steel_grade,
            design_code=code_label, analysis="Elastic (Linear)", status=overall,
        ),
        materials=BeamMaterialsOut(
            fck=fck, fcd=round(fcd, 1), fyk=fy, fyd=round(fyd, 0),
            modular_ratio=15.0, unit_weight_concrete=request.materials.unit_weight_concrete,
        ),
        loads=BeamLoadSummary(
            components=comps, total_dead=round(gk, 2), total_live=round(qk, 2), total_service=round(service, 2),
        ),
        forces=BeamForces(
            design_udl=round(w_d, 2), max_moment=round(m_ed, 2), max_shear=round(v_ed, 2), ultimate_combo=combo,
        ),
        capacity=BeamCapacity(
            moment_resistance=round(m_rd, 2), shear_resistance=round(v_rdc / 1000, 2),
            utilization_bending=round(util_bend, 2), utilization_shear=round(util_shear, 2),
        ),
        reinforcement=BeamReinforcement(
            tension={"count": bars["count"], "bar_diameter": bars["bar_diameter"],
                     "area_required": round(as_req, 0), "area_provided": round(as_prov, 0),
                     "label": f"{bars['count']}T{bars['bar_diameter']}"},
            compression={"count": 2, "bar_diameter": comp_dia, "area_provided": round(comp_area, 0),
                         "label": f"2T{comp_dia}"},
            stirrups={"bar_diameter": link, "spacing": link_spacing, "legs": 2,
                      "label": f"\u00d8{link} @ {link_spacing} mm c/c"},
            cover=cover,
        ),
        sls=BeamSLS(
            deflection_actual=round(defl, 1), deflection_limit=round(defl_limit, 1), deflection_status=defl_status,
            crack_width=round(crack, 2), crack_limit=crack_limit, crack_status=crack_status,
        ),
        notes=notes,
    )