# backend/engine/one_way_slab_engine.py
"""
One-way slab design engine (single span).

Design moments are taken from standard closed-form coefficients per continuity
type (exact for a single span). The section design, deflection (span/depth),
shear (EC2 6.2.2) and cost logic mirror the user's validated routine.

EN 1990 / EN 1991-1-1 / EN 1992-1-1 (UK NA).

NOTE: span is in METRES (consistent with the rest of the backend). Internally
converted to mm for reinforcement design.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import math

# Closed-form single-span coefficients: (c_span_sag, c_support_hog, c_shear)
# Moment = c * w * L^2  ; Shear = c_shear * w * L
MOMENT_COEFFS = {
    "simply_supported":     (1.0 / 8.0,   0.0,        0.5),
    "one_end_continuous":   (9.0 / 128.0, 1.0 / 8.0,  0.625),   # propped cantilever
    "both_ends_continuous": (1.0 / 24.0,  1.0 / 12.0, 0.5),     # fixed-fixed
    "cantilever":           (0.0,         1.0 / 2.0,  1.0),
}

FCTM_TABLE = {
    "C20/25": 2.2, "C25/30": 2.6, "C30/37": 2.9, "C35/45": 3.2,
    "C40/50": 3.5, "C45/55": 3.8, "C50/60": 4.1,
}

BAR_SPACINGS = [100, 125, 150, 175, 200, 225, 250]


@dataclass
class OneWayInput:
    span_m: float
    continuity: str                 # simply_supported | one_end_continuous | both_ends_continuous | cantilever
    thickness_mm: float
    clear_cover_mm: float
    concrete_grade: str = "C30/37"
    steel_grade: str = "B500"
    bar_diameters: List[int] = field(default_factory=lambda: [10, 12, 16])
    # loads (kN/m^2)
    dead_load: float = 0.0          # extra permanent (partition etc.)
    floor_finish: float = 0.0
    additional_dead_load: float = 0.0
    live_load: float = 0.0
    additional_live_load: float = 0.0
    gamma_concrete: float = 25.0


@dataclass
class BarChoice:
    bar_dia: int
    spacing: int
    As_prov: float


@dataclass
class FaceDesign:
    """Design at one face (span/sagging or support/hogging)."""
    M_kNm: float
    As_req: float
    As_min: float
    As: float
    z_mm: float
    k: float
    singly: bool
    bar: Optional[BarChoice]


@dataclass
class OneWayResult:
    d_mm: float
    cover_mm: float
    fck: int
    fyk: int
    fctm: float
    self_weight: float
    g_k: float
    q_k: float
    w_ed: float
    span_face: FaceDesign
    support_face: FaceDesign
    V_ed_kN: float
    v_ed: float
    v_rdc: float
    shear_status: str
    actual_slenderness: float
    slenderness_limit: float
    deflection_status: str
    overall_status: str
    notes: List[str] = field(default_factory=list)


def _fck(grade: str) -> int:
    return int(grade.split("C")[1].split("/")[0])


def _fyk(grade: str) -> int:
    return int(grade.replace("B", ""))


def _cover_and_depth(h: float, bar_dia: float, clear_cover: float):
    c_min_b = max(bar_dia, 20)
    c_min_dur = 20.0
    c_min = max(c_min_b, c_min_dur, 10.0)
    # honor the user's clear_cover if it is at least the computed minimum, else use computed nominal
    nominal = c_min + 5.0
    cover = max(clear_cover, nominal) if clear_cover else nominal
    d = h - cover - bar_dia / 2.0
    return cover, d


def _design_face(M_kNm: float, b: float, d: float, fck: int, fyk: int, fctm: float,
                 bar_dia: float, cover: float, bar_diameters: List[int]) -> FaceDesign:
    ys = 1.15
    fyd = fyk / ys
    M = M_kNm * 1e6  # Nmm
    M_bal = 0.167 * fck * b * d ** 2

    if M <= M_bal:
        k = M / (fck * b * d ** 2) if (fck * b * d ** 2) else 0.0
        z = d * (0.5 + math.sqrt(max(0.25 - (k / 1.134), 0.0)))
        z = min(z, 0.9 * d)
        As = M / (z * fyd) if z else 0.0
        singly = True
    else:
        d_p = bar_dia / 2.0 + cover
        As_prime = (M - M_bal) / (0.87 * fyk * (d - d_p)) if (d - d_p) else 0.0
        z_bal = 0.82 * d
        As = (M_bal / (0.87 * fyk * z_bal)) + As_prime if z_bal else 0.0
        z = z_bal
        k = M / (fck * b * d ** 2) if (fck * b * d ** 2) else 0.0
        singly = False

    bd = b * d
    As_min = max((0.26 * fctm / fyk) * bd, 0.0013 * bd)
    As_req = max(As, As_min)

    bar = _choose_bar(As_req, bar_diameters)
    return FaceDesign(M_kNm=M_kNm, As_req=As_req, As_min=As_min, As=As, z_mm=z, k=k, singly=singly, bar=bar)


def _choose_bar(As_req: float, bar_diameters: List[int]) -> Optional[BarChoice]:
    """Smallest diameter that meets As_req within available spacings; for that
    diameter choose the largest feasible spacing (most economical)."""
    for dia in sorted(bar_diameters):
        area = math.pi * dia ** 2 / 4.0
        feasible = [(s, area * 1000.0 / s) for s in BAR_SPACINGS if area * 1000.0 / s >= As_req]
        if feasible:
            spacing, As_prov = max(feasible, key=lambda t: t[0])  # largest spacing
            return BarChoice(bar_dia=dia, spacing=spacing, As_prov=As_prov)
    # nothing meets it: use largest dia at tightest spacing
    dia = max(bar_diameters)
    area = math.pi * dia ** 2 / 4.0
    return BarChoice(bar_dia=dia, spacing=BAR_SPACINGS[0], As_prov=area * 1000.0 / BAR_SPACINGS[0])


def design_one_way_slab(inp: OneWayInput) -> OneWayResult:
    cont = inp.continuity if inp.continuity in MOMENT_COEFFS else "simply_supported"
    c_span, c_supp, c_shear = MOMENT_COEFFS[cont]

    b = 1000.0
    fck = _fck(inp.concrete_grade)
    fyk = _fyk(inp.steel_grade)
    fctm = FCTM_TABLE.get(inp.concrete_grade, 2.9)

    bar_guess = sorted(inp.bar_diameters)[0] if inp.bar_diameters else 12
    cover, d = _cover_and_depth(inp.thickness_mm, bar_guess, inp.clear_cover_mm)

    # loads
    self_weight = inp.gamma_concrete * (inp.thickness_mm / 1000.0)
    g_k = self_weight + inp.dead_load + inp.floor_finish + inp.additional_dead_load
    q_k = inp.live_load + inp.additional_live_load
    w_ed = 1.35 * g_k + 1.5 * q_k

    L = inp.span_m
    M_span = c_span * w_ed * L ** 2     # kNm/m
    M_supp = c_supp * w_ed * L ** 2     # kNm/m
    V_ed = c_shear * w_ed * L           # kN/m

    span_face = _design_face(M_span, b, d, fck, fyk, fctm, bar_guess, cover, inp.bar_diameters)
    support_face = _design_face(M_supp, b, d, fck, fyk, fctm, bar_guess, cover, inp.bar_diameters)

    # governing steel for deflection/shear (span controls deflection; larger As for shear)
    As_req_gov = max(span_face.As_req, support_face.As_req)
    As_prov_span = span_face.bar.As_prov if span_face.bar else 0.0
    As_prov_supp = support_face.bar.As_prov if support_face.bar else 0.0
    As_prov_gov = max(As_prov_span, As_prov_supp)

    # ---- shear (EC2 6.2.2) ----
    C_Rdc = 0.18 / 1.5
    k_sh = min(2.0, 1 + (200.0 / d) ** 0.5) if d else 1.0
    v_ed = V_ed * 1000.0 / (b * d) if d else 0.0          # N/mm^2 (V_ed kN/m -> N over b*d)
    rho_l = min(As_prov_gov / (b * d), 0.02) if d else 0.0
    v_rdc = max(C_Rdc * k_sh * (100 * rho_l * fck) ** (1 / 3), 0.035 * k_sh ** 1.5 * fck ** 0.5)
    shear_status = "PASS" if v_ed <= v_rdc else "FAIL"

    # ---- deflection (span/depth, EC2 7.4.2) ----
    actual_slenderness = (L * 1000.0) / d if d else 0.0
    p = (As_req_gov / (b * d) * 100) if d else 0.0
    po = (1 / 1000.0) * math.sqrt(fck) * 100
    k_factor = 1.0
    f3 = min(As_prov_span / span_face.As_req, 1.5) if span_face.As_req else 1.5
    if p and p <= po:
        slenderness_limit = k_factor * (11 + 1.5 * math.sqrt(fck) * (po / p)) * f3
    else:
        slenderness_limit = k_factor * (11 + 1.5 * math.sqrt(fck)) * f3
    deflection_status = "PASS" if actual_slenderness <= slenderness_limit else "FAIL"

    checks = [
        "PASS" if As_prov_span >= span_face.As_req else "FAIL",
        "PASS" if (M_supp == 0 or As_prov_supp >= support_face.As_req) else "FAIL",
        "PASS" if As_prov_span >= span_face.As_min else "FAIL",
        shear_status, deflection_status,
    ]
    overall = "PASS" if all(c == "PASS" for c in checks) else "FAIL"

    notes = []
    if cont == "cantilever":
        notes.append("Cantilever: sagging is zero; bottom steel is nominal/minimum, top steel governs.")
    notes.append("Single-span idealisation; moments from closed-form coefficients per continuity type.")
    notes.append("Secondary (distribution) steel: provide >= 20% of main steel and not less than As,min.")

    return OneWayResult(
        d_mm=d, cover_mm=cover, fck=fck, fyk=fyk, fctm=fctm,
        self_weight=self_weight, g_k=g_k, q_k=q_k, w_ed=w_ed,
        span_face=span_face, support_face=support_face,
        V_ed_kN=V_ed, v_ed=v_ed, v_rdc=v_rdc, shear_status=shear_status,
        actual_slenderness=actual_slenderness, slenderness_limit=slenderness_limit,
        deflection_status=deflection_status, overall_status=overall, notes=notes,
    )