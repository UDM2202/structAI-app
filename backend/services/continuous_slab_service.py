# backend/services/continuous_slab_service.py
import sys, os, json, math

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'engine'))

from models.schemas import (
    ContinuousSlabRequest, ContinuousSlabResult, DesignSummary, EnvelopeOut,
    SpanDesignOut, SupportDesignOut, DeflectionResult, ShearResult,
    ComplianceCheck, CostBreakdown, DiagramOut, ReportSection,
)

try:
    from engine.continuous_one_way_slab_engine import design_continuous_slab, ContinuousInput
except ImportError:
    from continuous_one_way_slab_engine import design_continuous_slab, ContinuousInput


def _enum(v):
    return v.value if hasattr(v, "value") else v


def _load_rates():
    path = os.path.join(os.path.dirname(__file__), '..', 'engine', 'rates_db.json')
    try:
        with open(path) as fp:
            return json.load(fp)
    except FileNotFoundError:
        return {}


def _rate(table, key, default):
    if key in table:
        return table[key]
    for k, v in table.items():
        if str(k).lower() == str(key).lower():
            return v
    return default


def _resolve_rates(db, region):
    regions = db.get("regions", {})
    r = regions.get(region) or regions.get("UK") or {}
    mats = r.get("materials", {})
    return mats.get("concrete", {}), mats.get("reinforcement", {}), mats.get("formwork", {}).get("flat_slab", 0)


def calculate_continuous_slab(request: ContinuousSlabRequest) -> ContinuousSlabResult:
    mats = request.materials
    loads = request.loads

    inp = ContinuousInput(
        span_lengths_m=request.span_lengths,
        start_support=_enum(request.start_support),
        end_support=_enum(request.end_support),
        thickness_mm=request.geometry_thickness,
        clear_cover_mm=request.clear_cover,
        concrete_grade=mats.concrete_grade,
        steel_grade=mats.steel_grade,
        bar_diameters=request.bar_diameters or [10, 12, 16],
        dead_load=loads.dead_load or 0.0,
        floor_finish=loads.floor_finish or 0.0,
        additional_dead_load=loads.additional_dead_load or 0.0,
        live_load=loads.live_load or 0.0,
        additional_live_load=loads.additional_live_load or 0.0,
        gamma_concrete=mats.unit_weight_concrete or 25.0,
    )

    res = design_continuous_slab(inp)
    b = 1000.0

    # governing span steel for the summary
    gov_span = max(res.spans, key=lambda s: s.M_sag_kNm)
    gov_bar = gov_span.bar
    total_len = sum(request.span_lengths)

    # ---- cost (1 m strip over whole beam length) ----
    db = _load_rates()
    conc_tbl, steel_tbl, formwork_rate = _resolve_rates(db, request.region)
    concrete_rate = _rate(conc_tbl, mats.concrete_grade, 105000)
    steel_rate = _rate(steel_tbl, mats.steel_grade, 950000)
    volume_concrete = request.geometry_thickness / 1000.0 * total_len   # m^3 for 1 m strip
    cost_concrete = volume_concrete * concrete_rate
    as_span = max((s.bar.As_prov for s in res.spans if s.bar), default=0.0)
    as_supp = max((s.bar.As_prov for s in res.supports if s.bar), default=0.0)
    steel_weight = (as_span + as_supp) * total_len * 7850 / 1e6           # kg for 1 m strip
    cost_steel = steel_weight * steel_rate / 1000
    cost_formwork = total_len * formwork_rate
    total_cost = cost_concrete + cost_steel + cost_formwork

    util = min(gov_span.As_req / gov_bar.As_prov, 1.0) if (gov_bar and gov_bar.As_prov) else 0.0

    summary = DesignSummary(
        status=res.overall_status, slab_type="Continuous One-Way Slab",
        continuity=f"{res.n_spans} spans ({_enum(request.start_support)}–{_enum(request.end_support)})",
        span_lx=request.span_lengths[0], span_ly=total_len,
        thickness=request.geometry_thickness, effective_depth=round(res.d_mm, 1), clear_cover=round(res.cover_mm, 1),
        concrete_grade=mats.concrete_grade, steel_grade=mats.steel_grade,
        selected_bar_diameter=gov_bar.bar_dia if gov_bar else 0,
        selected_spacing=gov_bar.spacing if gov_bar else 0,
        total_cost=round(total_cost, 2), optimization_rank=1, utilization_ratio=round(util, 2),
    )

    envelope = EnvelopeOut(
        max_sagging_moment=round(res.env_sag_kNm, 2),
        max_hogging_moment=round(-res.env_hog_kNm, 2),
        max_shear_force=round(res.env_shear_kN, 2),
        ultimate_load=round(res.w_ed, 2),
        service_load=round(res.g_k + res.q_k, 2),
    )

    spans_out = [SpanDesignOut(
        index=s.index, length=s.length_m, max_sagging_moment=round(s.M_sag_kNm, 2),
        area_required=round(s.As_req, 1), area_provided=round(s.bar.As_prov, 1) if s.bar else 0,
        bar_diameter=s.bar.bar_dia if s.bar else 0, spacing=s.bar.spacing if s.bar else 0, status=s.status,
    ) for s in res.spans]

    supports_out = [SupportDesignOut(
        index=s.index, position=s.position, hogging_moment=round(s.M_hog_kNm, 2),
        shear=round(s.shear_kN, 2), shear_reduced=round(getattr(s, 'shear_reduced_kN', 0.0), 2),
        area_required=round(s.As_req, 1), area_provided=round(s.bar.As_prov, 1) if s.bar else 0,
        bar_diameter=s.bar.bar_dia if s.bar else 0, spacing=s.bar.spacing if s.bar else 0, status=s.status,
    ) for s in res.supports]

    deflection = DeflectionResult(
        actual_deflection=round(res.actual_slenderness, 1),
        allowable_deflection=round(res.slenderness_limit, 1),
        status=res.deflection_status,
        ratio=round(res.actual_slenderness / res.slenderness_limit, 2) if res.slenderness_limit else 0,
    )

    shear = ShearResult(
        design_shear=round(res.env_shear_kN, 2),
        shear_resistance=round(res.v_rdc * b * res.d_mm / 1000.0, 2),
        status=res.shear_status,
        ratio=round(res.v_ed / res.v_rdc, 2) if res.v_rdc else 0,
    )

    compliance = (
        [ComplianceCheck(check=f"Flexure — span {s.index}", status=s.status,
                         ratio=round(s.area_required / s.area_provided, 2) if s.area_provided else 0, limit=1.0)
         for s in spans_out] +
        [ComplianceCheck(check=f"Flexure — {s.position}", status=s.status,
                         ratio=round(s.area_required / s.area_provided, 2) if s.area_provided else 0, limit=1.0)
         for s in supports_out if s.hogging_moment > 0] +
        [ComplianceCheck(check="Deflection (span/depth)", status=res.deflection_status,
                         ratio=round(res.actual_slenderness / res.slenderness_limit, 2) if res.slenderness_limit else 0, limit=1.0),
         ComplianceCheck(check="Shear (v_Ed / v_Rd,c)", status=res.shear_status,
                         ratio=round(res.v_ed / res.v_rdc, 2) if res.v_rdc else 0, limit=1.0)]
    )

    cost_breakdown = CostBreakdown(
        concrete={"volume": round(volume_concrete, 3), "rate": concrete_rate, "cost": round(cost_concrete, 2)},
        steel={"weight": round(steel_weight, 1), "rate": steel_rate / 1000, "cost": round(cost_steel, 2)},
        formwork={"area": round(total_len, 2), "rate": formwork_rate, "cost": round(cost_formwork, 2)},
        total=round(total_cost, 2),
        total_per_sqm=round(total_cost / total_len, 2) if total_len else 0,
    )

    diagram = DiagramOut(
        x=[round(v, 3) for v in res.x_m],
        bmd=[round(v, 2) for v in res.bmd_kNm],
        sfd=[round(v, 2) for v in res.sfd_kN],
    )

    report = _build_report(request, res)

    return ContinuousSlabResult(
        task_id="completed", status="completed", summary=summary, envelope=envelope,
        spans=spans_out, supports=supports_out, deflection=deflection, shear=shear,
        compliance=compliance, cost_breakdown=cost_breakdown, diagram=diagram, report=report,
    )


def _build_report(request, res):
    R = lambda ref, calc, out: {"reference": ref, "calculation": calc, "output": out}
    fyd = res.fyk / 1.15
    fcd = res.fck / 1.5
    sec = []

    # ---------------- 1. Geometry & Cover ----------------
    sec.append({"title": "1. Geometry & Cover", "rows": [
        R("Cover input", f"clear cover specified by user, Cc = {request.clear_cover:.0f} mm", f"Cc,input = {request.clear_cover:.0f} mm"),
        R("Tolerance", "a fixed 5 mm fixing/detailing allowance is added to the clear cover specified above -- this is not user-editable", "+5 mm"),
        R("Cover used", f"Cc,used = Cc,input + 5 mm = {request.clear_cover:.0f} + 5", f"Cc = {res.cover_mm:.0f} mm"),
        R("EC2 §6.1", f"d = h − Cc − φ/2 = {request.geometry_thickness:.0f} − {res.cover_mm:.0f} − φ/2", f"d = {res.d_mm:.0f} mm"),
        R("Spans", f"{res.n_spans} spans: {', '.join(f'{L:.2f}' for L in request.span_lengths)} m (each ≤ 4.5 m, the practical one-way slab limit)", f"{_enum(request.start_support)}–{_enum(request.end_support)}"),
    ]})

    # ---------------- 2. Materials ----------------
    sec.append({"title": "2. Materials", "rows": [
        R("EC2 Table 3.1", f"f_ctm = {res.fctm:.2f} MPa (grade {request.materials.concrete_grade})", f"f_ctm = {res.fctm:.2f} MPa"),
        R("EC2 §3.1.6", f"f_cd = f_ck/γ_c = {res.fck:.0f}/1.50", f"f_cd = {fcd:.2f} MPa"),
        R("EC2 §3.2.7", f"f_yd = f_yk/γ_s = {res.fyk:.0f}/1.15", f"f_yd = {fyd:.1f} MPa"),
    ]})

    # ---------------- 3. Loads & Combination ----------------
    sec.append({"title": "3. Loads & Combination", "rows": [
        R("Self weight", f"25 × {request.geometry_thickness/1000:.3f}", f"{res.self_weight:.2f} kN/m²"),
        R("Permanent", "G_k = self + finishes + partition + extra dead", f"G_k = {res.g_k:.2f} kN/m²"),
        R("Variable", "Q_k = live + additional live", f"Q_k = {res.q_k:.2f} kN/m²"),
        R("EN 1990", f"w_Ed = 1.35×{res.g_k:.2f} + 1.50×{res.q_k:.2f}", f"w_Ed = {res.w_ed:.2f} kN/m²"),
    ]})

    # ---------------- 4. Load patterns considered ----------------
    pattern_rows = [
        R("UK/EC2 practice", "the moment envelope must come from load patterns, not a single all-spans-loaded case -- an unloaded alternate span can govern sagging elsewhere, and a support between two loaded (with adjacent unloaded) spans can govern hogging there", f"{len(res.load_patterns_used)} patterns considered"),
    ]
    for lbl in res.load_patterns_used:
        pattern_rows.append(R("Pattern", lbl, "solved"))
    sec.append({"title": "4. Load Patterns Considered", "rows": pattern_rows})

    # ---------------- 5. FEM trace (all-spans-loaded, reference) ----------------
    fem_rows = [
        R("Section", f"b·h³/12 = 1000 × {request.geometry_thickness:.0f}³/12", f"I_g = {res.Ig_mm4:.3e} mm⁴"),
        R("Rigidity", f"EI = E·I_g = 33000 × {res.Ig_mm4:.3e}", f"EI = {res.EI_Nmm2:.3e} N·mm²"),
        R("Element stiffness", "k = (EI/L³)[[12,6L,−12,6L],[6L,4L²,−6L,2L²],[−12,−6L,12,−6L],[6L,2L²,−6L,4L²]]", f"{res.n_spans} elements"),
        R("Fixed-end (UDL)", "f = [wL/2, wL²/12, wL/2, −wL²/12] per element", "assembled into global F"),
        R("Solve", "K·θ = F  (all vertical DOFs restrained; solve nodal rotations) -- shown for the ALL-SPANS-LOADED case; governing design moments come from the full pattern-loading envelope", f"{len(res.rotations_rad)} nodes"),
    ]
    for i, th in enumerate(res.rotations_rad):
        fem_rows.append(R(f"θ node {i}", "nodal rotation (all-spans-loaded case)", f"{th:+.6e} rad"))
    sec.append({"title": "5. Continuous Analysis — FEM Trace (All-Spans-Loaded)", "rows": fem_rows})

    nm_rows = []
    for i, m in enumerate(res.node_moments_kNm):
        tag = "end support (pinned) → 0" if (i == 0 or i == len(res.node_moments_kNm) - 1) else "interior support (hogging), all-spans-loaded case"
        nm_rows.append(R(f"Node {i}", tag, f"M = {m:+.2f} kNm/m"))
    sec.append({"title": "5b. Node Moments — All-Spans-Loaded (Reference)", "rows": nm_rows})

    # ---------------- 6. Span (sagging) reinforcement -- full K/Z/As derivation ----------------
    span_rows = [R("EC2 §6.1", "M(x) = -Mi + Vi·x − wx²/2, peak sampled along each element; GOVERNING value taken as the envelope maximum across every load pattern in Section 4, not just all-spans-loaded", "pattern envelope")]
    b = 1000.0
    for s in res.spans:
        root = max(0.25 - s.k / 1.134, 0.0)
        span_rows.append(R(f"Span {s.index} (L={s.length_m:.2f} m)", f"K = M_sag/(f_ck·b·d²) = ({s.M_sag_kNm:.2f}×10⁶)/({res.fck:.0f}×{b:.0f}×{res.d_mm:.0f}²) [governed by: {s.governing_pattern}]", f"K = {s.k:.4f}"))
        span_rows.append(R("EC2 §6.1", f"Z = d(0.5+√(0.25−K/1.134)) = {res.d_mm:.0f}(0.5+√{root:.4f})", f"Z = {s.z_mm:.1f} mm"))
        span_rows.append(R("EC2 §6.1", f"A_s = M_sag×10⁶/(f_yd·Z) = ({s.M_sag_kNm:.2f}×10⁶)/(435×{s.z_mm:.1f})", f"A_s,req = {s.As_req:.0f} mm²/m"))
        bar = f"T{s.bar.bar_dia}@{s.bar.spacing} ({s.bar.As_prov:.0f} mm²/m)" if s.bar else "-"
        span_rows.append(R("Provide", f"A_s,min = {s.As_min:.0f} ; A_s,req = max(bending, min) = {s.As_req:.0f}", f"{bar} ({s.status})"))
    sec.append({"title": "6. Span (Sagging) Reinforcement", "rows": span_rows})

    # ---------------- 7. Support (hogging) reinforcement -- full K/Z/As derivation ----------------
    sup_rows = []
    for s in res.supports:
        if s.M_hog_kNm > 0:
            root = max(0.25 - s.k / 1.134, 0.0)
            sup_rows.append(R(s.position, f"K = M_hog/(f_ck·b·d²) [governed by: {s.governing_pattern}]", f"K = {s.k:.4f}"))
            sup_rows.append(R("EC2 §6.1", f"Z = d(0.5+√(0.25−K/1.134)) = {res.d_mm:.0f}(0.5+√{root:.4f})", f"Z = {s.z_mm:.1f} mm"))
            sup_rows.append(R("EC2 §6.1", f"A_s = M_hog×10⁶/(f_yd·Z)", f"A_s,req = {s.As_req:.0f} mm²/m"))
        else:
            sup_rows.append(R(s.position, "no hogging at this support -- nominal minimum steel only", f"A_s,req = {s.As_req:.0f} mm²/m"))
        bar = f"T{s.bar.bar_dia}@{s.bar.spacing} ({s.bar.As_prov:.0f} mm²/m)" if s.bar else "-"
        sup_rows.append(R("Provide", f"M_hog = {s.M_hog_kNm:.2f} kNm/m ; A_s,min = {s.As_min:.0f}", f"{bar} ({s.status})"))
    sec.append({"title": "7. Support (Hogging) Reinforcement", "rows": sup_rows})

    # ---------------- 8. Minimum reinforcement basis (shared across the member -- same d/fctm/fyk) ----------------
    d = res.d_mm
    t1 = 0.26 * res.fctm / res.fyk * b * d
    t2 = 0.0013 * b * d
    gov = "concrete tensile strength basis" if t1 >= t2 else "0.13% minimum basis"
    sec.append({"title": "8. Minimum Reinforcement Check", "rows": [
        R("EC2 §9.2.1.1", "A_s,min = max( 0.26·f_ctm/f_yk·b·d , 0.0013·b·d ) -- same d applies at every span and support on this member", "As,min formula"),
        R("Basis 1 — concrete tensile strength", f"0.26 × {res.fctm:.2f}/{res.fyk:.0f} × {b:.0f}×{d:.0f}", f"{t1:.0f} mm²/m"),
        R("Basis 2 — 0.13% of section", f"0.0013 × {b:.0f}×{d:.0f}", f"{t2:.0f} mm²/m"),
        R("Governing", f"A_s,min = max({t1:.0f}, {t2:.0f}) ← {gov} governs", f"A_s,min = {max(t1,t2):.0f} mm²/m"),
    ]})

    # ---------------- 9. Deflection (governing span) -- full derivation ----------------
    gov_span = max(res.spans, key=lambda s: s.M_sag_kNm)
    branch = "A (ρ ≤ ρ₀, lightly reinforced)" if res.rho <= res.rho0 else "B (ρ > ρ₀, heavily reinforced)"
    defl_rows = [
        R("Governing span", f"Span {gov_span.index} (L={gov_span.length_m:.2f} m) -- highest sagging demand", f"L = {gov_span.length_m:.2f} m"),
        R("Note", "K = 1.3 for an end span (one end continuous, other simply supported); K = 1.5 for a true interior span (EC2 Table 7.4N)", f"K = {res.K_sys:.2f}"),
        R("Basic span/depth ratio", f"ρ = A_s,required/(b·d) = {gov_span.As_req:.0f}/({b:.0f}×{d:.0f})", f"ρ = {res.rho:.5f}"),
        R("Basic span/depth ratio", f"ρ₀ = 10⁻³ × √f_ck = 10⁻³ × √{res.fck:.0f}", f"ρ₀ = {res.rho0:.5f}"),
        R("Branch", f"ρ = {res.rho:.5f} vs ρ₀ = {res.rho0:.5f}", f"branch {branch}"),
        R("EC2 §7.4.2", ("(L/d) = K[11 + 1.5√f_ck·(ρ₀/ρ) + 3.2√f_ck·(ρ₀/ρ − 1)^1.5]" if res.rho <= res.rho0
                         else "(L/d) = K[11 + 1.5√f_ck]"),
          f"(L/d)_basic = {res.ld_basic:.2f}"),
        R("Actual deflection", f"(L/d)_actual = L/d = {gov_span.length_m*1000:.0f}/{d:.0f}", f"{res.actual_slenderness:.2f}"),
        R("Base check", f"(L/d)_actual {'≤' if res.deflection_base_status == 'PASS' else '>'} (L/d)_basic (before any enhancement) → {res.actual_slenderness:.2f} {'≤' if res.deflection_base_status == 'PASS' else '>'} {res.ld_basic:.2f}", res.deflection_base_status),
    ]
    if res.deflection_enhanced:
        defl_rows += [
            R("Enhancement factor", f"base check failed → F3 = A_s,prov/A_s,req = {gov_span.bar.As_prov:.0f}/{gov_span.As_req:.0f}  (≤ 1.5)" if gov_span.bar else "F3 = 1.0", f"F3 = {res.F3:.3f}"),
            R("Allowable span/depth ratio", f"(L/d)_allow = (L/d)_basic × F3 = {res.ld_basic:.2f} × {res.F3:.3f}", f"{res.slenderness_limit:.2f}"),
        ]
    else:
        defl_rows.append(R("Enhancement factor", "base check already passes -- F3 not required", "F3 not applied"))
    defl_rows.append(R("Verdict", f"(L/d)_actual {'<' if res.deflection_status == 'PASS' else '>'} allowable (L/d) → {res.actual_slenderness:.2f} {'<' if res.deflection_status == 'PASS' else '>'} {res.slenderness_limit:.2f}",
                        "Deflection is okay" if res.deflection_status == "PASS" else "Deflection is NOT okay — increase depth or steel"))
    sec.append({"title": "9. Deflection (Governing Span)", "rows": defl_rows})

    # ---------------- 10. Shear -- full term breakdown ----------------
    as_prov_gov = max((s.bar.As_prov for s in res.spans + res.supports if s.bar), default=0.0)
    rho_l = min(as_prov_gov / (b * d), 0.02) if d else 0.0
    k_sh = min(1 + math.sqrt(200 / d), 2.0) if d else 1.0
    C_Rdc = 0.18 / 1.5
    v_main = C_Rdc * k_sh * (100 * rho_l * res.fck) ** (1 / 3)
    v_min_val = 0.035 * k_sh ** 1.5 * math.sqrt(res.fck)
    shear_rows = [
        R("EC2 §6.2.1(8)", f"critical section at distance d = {d:.0f} mm from the support face; V_Ed = V_face − w·d", "reduction applied"),
    ]
    for sp in res.supports:
        if sp.shear_kN:
            shear_rows.append(R(sp.position, f"V_face = {sp.shear_kN:.2f} kN [{sp.governing_pattern}] → V_Ed = {sp.shear_reduced_kN:.2f} kN", ""))
    shear_rows += [
        R("Steel ratio", f"ρ_i = A_s,provided/(b·d) = {as_prov_gov:.0f}/({b:.0f}×{d:.0f})  (≤ 0.02)", f"ρ_i = {rho_l:.5f}"),
        R("Size factor", f"k = 1 + √(200/d) = 1 + √(200/{d:.0f})  (≤ 2.0)", f"k = {k_sh:.3f}"),
        R("EC2 §6.2.2", f"C_Rd,c = 0.18/γ_c = 0.18/1.50", f"C_Rd,c = {C_Rdc:.3f}"),
        R("Main term", f"C_Rd,c·k·(100·ρ_i·f_ck)^(1/3) = {C_Rdc:.3f}×{k_sh:.3f}×(100×{rho_l:.5f}×{res.fck:.0f})^(1/3)", f"{v_main:.3f} MPa"),
        R("v_min", f"v_min = 0.035·k^1.5·f_ck^0.5 = 0.035×{k_sh:.3f}^1.5×√{res.fck:.0f}", f"{v_min_val:.3f} MPa"),
        R("Governing", f"v_Rd,c = max({v_main:.3f}, {v_min_val:.3f})", f"v_Rd,c = {res.v_rdc:.3f} MPa"),
        R("EC2 §6.2.2", f"v_Ed = {res.v_ed:.3f} MPa vs v_Rd,c = {res.v_rdc:.3f} MPa", res.shear_status),
    ]
    sec.append({"title": "10. Shear (EC2 6.2.2, with reduction at support)", "rows": shear_rows})

    # ---------------- 11. Checks & Notes -- itemized, so a FAIL is always traceable ----------------
    check_rows = []
    for s in res.spans:
        check_rows.append(R(f"Flexure — Span {s.index}", f"A_s,req {s.As_req:.0f} vs A_s,prov {s.bar.As_prov:.0f}" if s.bar else "no bar selected", s.status))
    for sp in res.supports:
        check_rows.append(R(f"Flexure — {sp.position}", f"A_s,req {sp.As_req:.0f} vs A_s,prov {sp.bar.As_prov:.0f}" if sp.bar else "no bar selected", sp.status))
    check_rows.append(R("Deflection", f"(L/d) actual {res.actual_slenderness:.1f} vs allowable {res.slenderness_limit:.1f}", res.deflection_status))
    check_rows.append(R("Shear", f"v_Ed {res.v_ed:.3f} vs v_Rd,c {res.v_rdc:.3f} MPa", res.shear_status))
    failed = [r["reference"] for r in check_rows if r["output"] == "FAIL"]
    check_rows.append(R("Overall", "FAILED checks: " + (", ".join(failed) if failed else "none") if res.overall_status == "FAIL" else "all checks pass", res.overall_status))
    for n in res.notes:
        check_rows.append(R("Note", n, ""))
    sec.append({"title": "11. Checks & Notes", "rows": check_rows})

    return sec