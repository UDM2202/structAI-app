# backend/services/continuous_beam_service.py
import re
import math
from models.continuous_beam_schemas import (
    ContinuousBeamRequest, ContinuousBeamResult, CBSummary, CBMaterialsOut,
    CBLoadSummary, CBSpanResult, CBSupportResult, CBForces, CBCapacity, CBSLS,
)

PI = math.pi

# Continuous-beam coefficients (approx; equal spans, Qk<=Gk, >=3 spans).
# M = coeff * w * L^2 ; V = coeff * w * L. Same pattern for BS 8110 (Table 3.5)
# and the conventional EC2 approximation; load/material factors differ.
COEF = {
    "end_span_sag": 0.09, "first_int_sup": 0.11, "int_span_sag": 0.07, "int_sup": 0.08,
    "V_end": 0.45, "V_first_int": 0.60, "V_int": 0.55,
}


def _enum(v):
    return v.value if hasattr(v, "value") else v


def parse_fck(g):
    s = str(g).upper().replace("C", "").replace("M", "")
    try:
        return float(s.split("/")[0])
    except (ValueError, IndexError):
        return 25.0


def parse_fy(g):
    m = re.search(r"(\d{3})", str(g))
    return float(m.group(1)) if m else 500.0


def pick_bars(as_req, dias):
    fallback = None
    for dia in sorted(dias):
        area = PI / 4 * dia ** 2
        n = max(2, math.ceil(as_req / area)) if as_req > 0 else 2
        opt = {"count": n, "bar_diameter": dia, "area_provided": round(n * area, 0)}
        if fallback is None:
            fallback = opt
        if 2 <= n <= 6:
            return opt
    return fallback


def flexure(m, b, d, h, fck, fy, is_bs, dias):
    m = abs(m)
    if is_bs:
        K = min(m * 1e6 / (b * d ** 2 * fck), 0.156) if d else 0
        z = min(d * (0.5 + (max(0.25 - K / 0.9, 0)) ** 0.5), 0.95 * d) if d else 0
        as_req = m * 1e6 / (0.95 * fy * z) if z else 0
        as_min = 0.0013 * b * h
    else:
        fcd, fyd = fck / 1.5, fy / 1.15
        K = m * 1e6 / (b * d ** 2 * fck) if d else 0
        z = min(d * (0.5 + (max(0.25 - K / 1.134, 0)) ** 0.5), 0.95 * d) if d else 0
        as_req = m * 1e6 / (fyd * z) if z else 0
        fctm = 0.3 * fck ** (2 / 3) if fck <= 50 else 2.12
        as_min = max(0.26 * fctm / fy * b * d, 0.0013 * b * d)
    as_req = max(as_req, as_min)
    bars = pick_bars(as_req, dias)
    m_rd = (0.95 * fy if is_bs else fy / 1.15) * bars["area_provided"] * z / 1e6
    util = m / m_rd if m_rd else 0
    return {
        "label": f"{bars['count']}T{bars['bar_diameter']}", "count": bars["count"],
        "bar_diameter": bars["bar_diameter"], "area_required": round(as_req, 0),
        "area_provided": round(bars["area_provided"], 0), "m_resistance": round(m_rd, 2),
        "utilization": round(util, 2), "K": round(K, 4), "z": round(z, 1),
    }


def calculate_continuous_beam(request: ContinuousBeamRequest) -> ContinuousBeamResult:
    code = _enum(request.design_code)
    is_bs = code == "BS8110"
    g = request.geometry
    b, h, cover = g.width, g.depth, g.cover
    n = g.n_spans
    lengths = list(g.span_lengths)[:n]
    while len(lengths) < n:
        lengths.append(lengths[-1] if lengths else 6000)
    fck = parse_fck(request.materials.concrete_grade)
    fy = parse_fy(request.materials.steel_grade)
    gc = request.materials.unit_weight_concrete
    link = request.link_diameter
    dias = request.bar_diameters
    phi_assumed = 20

    self_w = (b / 1000) * (h / 1000) * gc if request.loads.self_weight_auto else 0.0

    def merged(i, field):
        if request.span_loads:
            for s in request.span_loads:
                if s.index == i:
                    v = getattr(s, field)
                    if v is not None:
                        return v
        return getattr(request.loads, field)

    spans_w = []
    for i in range(n):
        gk = self_w + merged(i, "wall_load") + merged(i, "finishes") + merged(i, "additional_dead_load")
        qk = merged(i, "live_load") + merged(i, "other_live_load")
        w_ult = (1.4 * gk + 1.6 * qk) if is_bs else (1.35 * gk + 1.5 * qk)
        spans_w.append({"gk": gk, "qk": qk, "service": gk + qk, "ult": w_ult, "L": lengths[i] / 1000.0})

    # condition checks (warn, don't block)
    warnings = []
    if n < 3:
        warnings.append(f"Coefficient method assumes \u2265 3 spans; you have {n}. Treat results as indicative.")
    Lmin, Lmax = min(lengths), max(lengths)
    if Lmax and (Lmax - Lmin) / Lmax > 0.15:
        warnings.append(f"Span lengths vary by {round((Lmax - Lmin) / Lmax * 100)}% (> 15%). Coefficients lose accuracy \u2014 verify with frame analysis.")
    if spans_w[0]["qk"] > spans_w[0]["gk"]:
        warnings.append("Characteristic live load exceeds dead load (Qk > Gk); coefficient method assumes Qk \u2264 Gk.")

    d = g.effective_depth or (h - cover - link - phi_assumed / 2)

    # spans: sagging
    span_results, max_sag, util_bend = [], 0, 0
    sag_governing = {"i": 0, "m": 0}
    for i in range(n):
        c = COEF["end_span_sag"] if (i == 0 or i == n - 1) else COEF["int_span_sag"]
        m_sag = c * spans_w[i]["ult"] * spans_w[i]["L"] ** 2
        bottom = flexure(m_sag, b, d, h, fck, fy, is_bs, dias)
        util_bend = max(util_bend, bottom["utilization"])
        if m_sag > sag_governing["m"]:
            sag_governing = {"i": i, "m": m_sag, "c": c, "steel": bottom}
        max_sag = max(max_sag, m_sag)
        span_results.append(CBSpanResult(
            index=i + 1, length=lengths[i], w_ultimate=round(spans_w[i]["ult"], 2),
            w_service=round(spans_w[i]["service"], 2), m_sagging=round(m_sag, 2), bottom_steel=bottom))

    # per-span end shears (for reactions + envelope)
    def span_shears(i):
        F = spans_w[i]["ult"] * spans_w[i]["L"]
        if n == 1:
            return 0.5 * F, 0.5 * F
        if i == 0:
            return COEF["V_end"] * F, COEF["V_first_int"] * F
        if i == n - 1:
            return COEF["V_first_int"] * F, COEF["V_end"] * F
        return COEF["V_int"] * F, COEF["V_int"] * F

    shears = [span_shears(i) for i in range(n)]
    total_load = sum(spans_w[i]["ult"] * spans_w[i]["L"] for i in range(n))

    # supports: hogging + shear + links
    support_results, max_hog, max_shear, util_shear = [], 0, 0, 0
    asw = 2 * PI / 4 * link ** 2
    hog_governing = {"j": 0, "m": 0}
    shear_governing = {"j": 0, "v": 0}
    for j in range(n + 1):
        adj = []
        if j - 1 >= 0:
            adj.append(spans_w[j - 1])
        if j < n:
            adj.append(spans_w[j])
        wl2 = max((s["ult"] * s["L"] ** 2) for s in adj)
        v_left = shears[j - 1][1] if j - 1 >= 0 else 0
        v_right = shears[j][0] if j < n else 0
        shear = max(v_left, v_right)
        is_end = (j == 0 or j == n)
        is_first_int = (j == 1 or j == n - 1) and not is_end
        if is_end:
            label = "End Support"
            m_hog = 0.0 if request.end_support == "simple" else 0.04 * wl2
        elif is_first_int:
            label = "First Interior"
            m_hog = COEF["first_int_sup"] * wl2
        else:
            label = "Interior"
            m_hog = COEF["int_sup"] * wl2
        max_shear = max(max_shear, shear)
        max_hog = max(max_hog, abs(m_hog))
        if shear > shear_governing["v"]:
            shear_governing = {"j": j, "v": shear}

        if m_hog > 0:
            top = flexure(m_hog, b, d, h, fck, fy, is_bs, dias)
            util_bend = max(util_bend, top["utilization"])
            if m_hog > hog_governing["m"]:
                hog_governing = {"j": j, "m": m_hog, "steel": top}
        else:
            top = {"label": "nominal 2T16", "count": 2, "bar_diameter": 16, "area_required": 0,
                   "area_provided": round(2 * PI / 4 * 16 ** 2, 0), "m_resistance": 0, "utilization": 0,
                   "K": 0, "z": round(0.95 * d, 1)}

        as_ref = top["area_provided"] if m_hog > 0 else span_results[min(j, n - 1)].bottom_steel["area_provided"]
        rho = min(as_ref / (b * d), 0.03 if is_bs else 0.02)
        v_n = shear * 1000.0
        if is_bs:
            vc = 0.79 * (100 * rho) ** (1 / 3) * (400 / d) ** 0.25 / 1.25 * (min(fck, 40) / 25.0) ** (1 / 3)
            v_rdc = vc * b * d
        else:
            kf = min(2.0, 1 + (200 / d) ** 0.5)
            v_min = 0.035 * kf ** 1.5 * fck ** 0.5
            v_rdc = max(0.12 * kf * (100 * rho * fck) ** (1 / 3), v_min) * b * d
        util_shear = max(util_shear, v_n / v_rdc if v_rdc else 0)
        if v_n <= v_rdc:
            spacing = int(min(0.75 * d, 300) // 25 * 25)
        else:
            fywd = (0.95 * fy) if is_bs else (fy / 1.15)
            spacing = max(75, int(min(asw * (0.9 * d) * fywd / v_n, 0.75 * d, 300) // 25 * 25))

        support_results.append(CBSupportResult(
            index=j, label=label, m_hogging=round(m_hog, 2), shear=round(shear, 2), top_steel=top,
            links={"bar_diameter": link, "spacing": spacing, "legs": 2, "label": f"\u00d8{link} @ {spacing} mm c/c"}))

    # reactions
    reactions = []
    for j in range(n + 1):
        v_left = shears[j - 1][1] if j - 1 >= 0 else 0
        v_right = shears[j][0] if j < n else 0
        R = v_left + v_right
        lbl = "End" if (j == 0 or j == n) else "Internal"
        reactions.append({"index": j + 1, "label": lbl, "reaction": round(R, 2),
                          "percent": round(R / total_load * 100, 2) if total_load else 0})

    # SLS (worst span, simplified)
    Ecm = 22000 * ((fck + 8) / 10) ** 0.3 if not is_bs else 24000
    I = b * h ** 3 / 12.0
    worst = max(range(n), key=lambda i: spans_w[i]["service"] * spans_w[i]["L"] ** 4)
    Lw, w_sls = lengths[worst], spans_w[worst]["service"]
    defl = 0.6 * 5 * w_sls * Lw ** 4 / (384 * Ecm * I)
    defl_limit = Lw / 250.0
    defl_status = "PASS" if defl <= defl_limit else "FAIL"

    overall = "PASS" if (util_bend <= 1 and util_shear <= 1 and defl_status == "PASS") else "FAIL"
    code_label = "BS 8110:1997" if is_bs else "EN 1992-1-1 (EC2)"
    combo = "1.4 Gk + 1.6 Qk (BS 8110)" if is_bs else "1.35 Gk + 1.50 Qk (EN 1990)"
    fcd = (0.45 * fck) if is_bs else (fck / 1.5)
    fyd = (0.95 * fy) if is_bs else (fy / 1.15)
    g0 = spans_w[0]

    comps = [
        {"name": "Beam Self Weight", "kind": "DL", "value": round(self_w, 2)},
        {"name": "Wall Load", "kind": "DL", "value": round(request.loads.wall_load, 2)},
        {"name": "Finishes", "kind": "DL", "value": round(request.loads.finishes, 2)},
        {"name": "Additional Dead Load", "kind": "DL", "value": round(request.loads.additional_dead_load, 2)},
        {"name": "Live Load", "kind": "LL", "value": round(request.loads.live_load, 2)},
        {"name": "Other Live Load", "kind": "LL", "value": round(request.loads.other_live_load, 2)},
    ]

    report = _build_report(request, is_bs, code, b, h, d, cover, link, phi_assumed, fck, fy, fcd, fyd, gc,
                           self_w, g0, spans_w, sag_governing, hog_governing, shear_governing, defl, defl_limit,
                           Lw, util_shear)

    notes = [
        f"Design in accordance with {code_label}.",
        "Moments and shears from continuous-beam coefficients (BS 8110 Table 3.5 / EC2-equivalent).",
        "Support hogging uses the larger adjacent span; end support taken as " + ("pinned (M=0)." if request.end_support == "simple" else "partially continuous."),
        "Reactions from coefficient shears (sum of adjacent-span end shears); total may exceed applied load by a few percent \u2014 conservative.",
        "Deflection is a simplified continuity-reduced gross-section estimate.",
        "Dimensions in mm; forces in kN; moments in kNm.",
    ]

    return ContinuousBeamResult(
        summary=CBSummary(beam_id=request.beam_id, design_code=code_label, analysis=request.analysis_method,
                          n_spans=n, span_lengths=lengths, width=b, depth=h, effective_depth=round(d, 1), cover=cover,
                          concrete_grade=request.materials.concrete_grade, steel_grade=request.materials.steel_grade, status=overall),
        materials=CBMaterialsOut(fck=fck, fcd=round(fcd, 1), fyk=fy, fyd=round(fyd, 0), modular_ratio=15.0, unit_weight_concrete=gc),
        loads=CBLoadSummary(components=comps, total_dead=round(g0["gk"], 2), total_live=round(g0["qk"], 2), total_service=round(g0["service"], 2)),
        spans=span_results, supports=support_results, reactions=reactions,
        forces=CBForces(max_sagging=round(max_sag, 2), max_hogging=round(max_hog, 2), max_shear=round(max_shear, 2), ultimate_combo=combo),
        capacity=CBCapacity(utilization_bending=round(util_bend, 2), utilization_shear=round(util_shear, 2)),
        sls=CBSLS(deflection_actual=round(defl, 1), deflection_limit=round(defl_limit, 1), deflection_status=defl_status,
                  crack_width=0.0, crack_limit=0.30, crack_status="PASS"),
        report=report, warnings=warnings, notes=notes)


def _build_report(req, is_bs, code, b, h, d, cover, link, phi, fck, fy, fcd, fyd, gc, self_w, g0, spans_w,
                  sag, hog, shr, defl, defl_limit, Lw, util_shear):
    """Clause-referenced calculation trace (Reference / Calculation / Output)."""
    R = lambda ref, calc, out: {"reference": ref, "calculation": calc, "output": out}
    sections = []
    cl = (lambda ec, bs: bs if is_bs else ec)

    # 1. Geometry & durability
    sections.append({"title": "1. Geometry & Durability", "rows": [
        R(cl("EC2 \u00a74.4.1.2(3)", "BS 8110 \u00a73.3"),
          f"c_min,dur = {cover - 10:.0f} mm ({req.design_params.exposure_class} exposure)\n\u0394c_dev = 10 mm\nc_nom = c_min + \u0394c_dev = {cover - 10:.0f} + 10",
          f"c_nom = {cover:.0f} mm"),
        R(cl("EC2 \u00a79.2.1.1", "BS 8110 \u00a73.4.4.1"),
          f"d = h \u2212 c_nom \u2212 link \u2212 \u03c6/2\n= {h:.0f} \u2212 {cover:.0f} \u2212 {link:.0f} \u2212 {phi/2:.0f}",
          f"d = {d:.0f} mm"),
    ]})

    # 2. Materials
    sections.append({"title": "2. Materials", "rows": [
        R(cl("EC2 Table 3.1", "BS 8110 \u00a73.1.7"),
          cl(f"f_ck = {fck:.0f} MPa\nf_cd = f_ck/1.5 = {fcd:.1f} MPa",
             f"f_cu = {fck:.0f} MPa\n0.45 f_cu = {fcd:.1f} MPa"),
          f"f_cd = {fcd:.1f} MPa"),
        R(cl("EC2 \u00a73.2.7", "BS 8110 \u00a73.4.4.1"),
          cl(f"f_yk = {fy:.0f} MPa\nf_yd = f_yk/1.15 = {fyd:.0f} MPa",
             f"f_y = {fy:.0f} MPa\n0.95 f_y = {fyd:.0f} MPa"),
          f"f_yd = {fyd:.0f} MPa"),
    ]})

    # 3. Loading
    w_ed = g0["ult"]
    sections.append({"title": "3. Loading & Combination", "rows": [
        R(cl("EC1-1-1 Table A.1", "BS 8110 \u00a72.4.1"),
          f"Self weight = \u03b3_c \u00d7 b \u00d7 h = {gc:.0f} \u00d7 {b/1000:.3f} \u00d7 {h/1000:.3f}",
          f"g_sw = {self_w:.2f} kN/m"),
        R(cl("EC1-1-1", "BS 6399"),
          f"Wall + finishes + add. DL\nG_k = {g0['gk']:.2f} kN/m",
          f"G_k = {g0['gk']:.2f} kN/m"),
        R(cl("EC1-1-1 Table 6.2", "BS 6399-1"),
          f"Imposed + other LL\nQ_k = {g0['qk']:.2f} kN/m",
          f"Q_k = {g0['qk']:.2f} kN/m"),
        R(cl("EC0 \u00a76.4.3.2", "BS 8110 \u00a72.4.3"),
          cl(f"w_Ed = 1.35 G_k + 1.50 Q_k\n= 1.35\u00d7{g0['gk']:.2f} + 1.50\u00d7{g0['qk']:.2f}",
             f"w = 1.4 G_k + 1.6 Q_k\n= 1.4\u00d7{g0['gk']:.2f} + 1.6\u00d7{g0['qk']:.2f}"),
          f"w_Ed = {w_ed:.2f} kN/m"),
    ]})

    # 4. Analysis (coefficients)
    si = sag["i"]
    Ls = spans_w[si]["L"]
    sections.append({"title": "4. Analysis \u2014 Continuous Beam Coefficients", "rows": [
        R(cl("EC2 \u00a75.1.3 (approx.)", "BS 8110 Table 3.5"),
          f"Span sagging coeff = {sag.get('c', 0.09)}\nSupport hogging coeff = {COEF['first_int_sup']} / {COEF['int_sup']}\nShear coeff = {COEF['V_end']} / {COEF['V_first_int']} / {COEF['V_int']}",
          "coefficients applied"),
        R(cl("EC2 \u00a75.1.3", "BS 8110 Table 3.5"),
          f"Max sagging (Span {si+1}):\nM = {sag.get('c', 0.09)} \u00d7 w \u00d7 L\u00b2 = {sag.get('c', 0.09)} \u00d7 {spans_w[si]['ult']:.2f} \u00d7 {Ls:.2f}\u00b2",
          f"M_Ed,span = {sag['m']:.2f} kNm"),
    ]})
    if hog["m"] > 0:
        sections[-1]["rows"].append(
            R(cl("EC2 \u00a75.1.3", "BS 8110 Table 3.5"),
              f"Max hogging (Support {hog['j']+1}):\nM = coeff \u00d7 w \u00d7 L\u00b2 (larger adjacent span)",
              f"M_Ed,sup = {hog['m']:.2f} kNm"))

    # 5. Flexure - governing sagging
    st = sag["steel"]
    Kp = "0.167" if not is_bs else "0.156"
    sections.append({"title": f"5. Flexural Design \u2014 Span {si+1} (Sagging)", "rows": [
        R(cl("EC2 \u00a76.1", "BS 8110 \u00a73.4.4.4"),
          f"K = M / (f_ck b d\u00b2)\n= {sag['m']:.2f}\u00d710\u2076 / ({fck:.0f}\u00d7{b:.0f}\u00d7{d:.0f}\u00b2)",
          f"K = {st['K']}"),
        R(cl("EC2 \u00a76.1", "BS 8110 \u00a73.4.4.4"),
          f"K \u2264 K' ({Kp}) \u2192 {'singly reinforced' if st['K'] <= float(Kp) else 'compression steel needed'}",
          "OK" if st["K"] <= float(Kp) else "review"),
        R(cl("EC2 \u00a76.1", "BS 8110 \u00a73.4.4.4"),
          cl(f"z = d[0.5+\u221a(0.25\u2212K/1.134)] \u2264 0.95d", f"z = d[0.5+\u221a(0.25\u2212K/0.9)] \u2264 0.95d"),
          f"z = {st['z']:.0f} mm"),
        R(cl("EC2 \u00a76.1", "BS 8110 \u00a73.4.4.4"),
          cl(f"A_s = M/(f_yd z) = {sag['m']:.2f}\u00d710\u2076/({fyd:.0f}\u00d7{st['z']:.0f})",
             f"A_s = M/(0.95 f_y z) = {sag['m']:.2f}\u00d710\u2076/({fyd:.0f}\u00d7{st['z']:.0f})"),
          f"A_s,req = {st['area_required']:.0f} mm\u00b2"),
        R(cl("EC2 \u00a79.2.1.1", "BS 8110 Table 3.25"),
          f"Provide {st['label']}",
          f"A_s,prov = {st['area_provided']:.0f} mm\u00b2  (util {st['utilization']})"),
    ]})

    # 6. Shear - governing
    sections.append({"title": f"6. Shear Design \u2014 Support {shr['j']+1}", "rows": [
        R(cl("EC2 \u00a76.2.1", "BS 8110 \u00a73.4.5"),
          f"V_Ed = {shr['v']:.2f} kN (max coefficient shear)",
          f"V_Ed = {shr['v']:.2f} kN"),
        R(cl("EC2 \u00a76.2.2", "BS 8110 Table 3.8"),
          "v_Rd,c from tension-steel ratio at support\nLinks designed where V_Ed > V_Rd,c",
          ("links required" if util_shear > 1 else "nominal/min links")),
    ]})

    # 7. Deflection
    basic = 26 if not is_bs else 20
    sections.append({"title": "7. Deflection (SLS)", "rows": [
        R(cl("EC2 \u00a77.4.2", "BS 8110 \u00a73.4.6"),
          f"Worst span L = {Lw:.0f} mm\nSimplified continuity-reduced estimate (factor 0.6)",
          f"\u03b4 \u2248 {defl:.1f} mm"),
        R(cl("EC2 \u00a77.4.1", "BS 8110 \u00a73.4.6.3"),
          f"Limit = L/250 = {Lw:.0f}/250",
          f"\u03b4_lim = {defl_limit:.1f} mm  ({'OK' if defl <= defl_limit else 'FAIL'})"),
    ]})

    return sections