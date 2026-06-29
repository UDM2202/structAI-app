# backend/services/continuous_slab_service.py
import sys, os, json

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
        thickness=request.geometry_thickness, effective_depth=round(res.d_mm, 1),
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
        shear=round(s.shear_kN, 2),
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
    sec = []
    sec.append({"title": "1. Geometry & Cover", "rows": [
        R("EC2 §4.4.1.2", f"cover (clear {request.clear_cover:.0f}) + allowance", f"c_nom = {res.cover_mm:.0f} mm"),
        R("EC2 §6.1", f"d = h − c − φ/2 = {request.geometry_thickness:.0f} − {res.cover_mm:.0f} − φ/2", f"d = {res.d_mm:.0f} mm"),
        R("Spans", f"{res.n_spans} spans: {', '.join(f'{L:.2f}' for L in request.span_lengths)} m", f"{_enum(request.start_support)}–{_enum(request.end_support)}"),
    ]})
    sec.append({"title": "2. Loads & Combination", "rows": [
        R("Self weight", f"25 × {request.geometry_thickness/1000:.3f}", f"{res.self_weight:.2f} kN/m²"),
        R("Permanent", "G_k = self + finishes + partition + extra dead", f"G_k = {res.g_k:.2f} kN/m²"),
        R("Variable", "Q_k = live + additional live", f"Q_k = {res.q_k:.2f} kN/m²"),
        R("EN 1990", f"w_Ed = 1.35×{res.g_k:.2f} + 1.50×{res.q_k:.2f}", f"w_Ed = {res.w_ed:.2f} kN/m²"),
    ]})
    sec.append({"title": "3. Analysis (continuous FEM)", "rows": [
        R("Stiffness method", "beam-element FEM, banded LDLᵀ solver", f"{res.n_spans} elements"),
        R("Recovery", "BM(x) = -Mi + Vi·x - wx²/2", "validated vs textbook"),
        R("Envelope", f"max span {res.env_sag_kNm:.2f} / max support {res.env_hog_kNm:.2f} kNm/m", f"V_max {res.env_shear_kN:.2f} kN/m"),
    ]})
    span_rows = []
    for s in res.spans:
        bar = f"T{s.bar.bar_dia}@{s.bar.spacing}" if s.bar else "-"
        span_rows.append(R(f"Span {s.index} (L={s.length_m:.2f} m)", f"M_sag = {s.M_sag_kNm:.2f} kNm/m → A_s,req = {s.As_req:.0f}", f"{bar} ({s.status})"))
    sec.append({"title": "4. Span (Sagging) Reinforcement", "rows": span_rows})
    sup_rows = []
    for s in res.supports:
        bar = f"T{s.bar.bar_dia}@{s.bar.spacing}" if s.bar else "-"
        sup_rows.append(R(s.position, f"M_hog = {s.M_hog_kNm:.2f} kNm/m → A_s,req = {s.As_req:.0f}", f"{bar} ({s.status})"))
    sec.append({"title": "5. Support (Hogging) Reinforcement", "rows": sup_rows})
    sec.append({"title": "6. Deflection (governing span)", "rows": [
        R("EC2 §7.4.2", f"actual L/d = {res.actual_slenderness:.1f}", f"limit {res.slenderness_limit:.1f} ({res.deflection_status})"),
    ]})
    sec.append({"title": "7. Shear (EC2 6.2.2)", "rows": [
        R("EC2 §6.2.2", f"v_Ed = {res.v_ed:.3f} ; v_Rd,c = {res.v_rdc:.3f} N/mm²", res.shear_status),
    ]})
    sec.append({"title": "8. Checks & Notes", "rows": [R("System", "overall", res.overall_status)] +
                [R("Note", n, "") for n in res.notes]})
    return sec