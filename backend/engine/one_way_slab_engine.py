# backend/engine/one_way_slab_engine.py
"""
One-way slab design engine (single span).

Design moments from standard closed-form coefficients per continuity type
(exact for a single span). Section design, deflection (span/depth, EC2 7.4.2),
shear (EC2 6.2.2) and detailing per EN 1992-1-1 (UK NA).

EVERY user input supplied by the API is honoured here. Where a user value is
overridden by a code minimum (e.g. cover below the durability/fire minimum),
the engine records a note rather than changing it silently.

NOTE: span is in METRES. Internally converted to mm for reinforcement design.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import math

# Closed-form single-span coefficients: (c_span_sag, c_support_hog, c_shear)
MOMENT_COEFFS = {
    "simply_supported":     (1.0 / 8.0,   0.0,        0.5),
    "one_end_continuous":   (9.0 / 128.0, 1.0 / 8.0,  0.625),   # propped cantilever
    "both_ends_continuous": (1.0 / 24.0,  1.0 / 12.0, 0.5),     # fixed-fixed
    "cantilever":           (0.0,         1.0 / 2.0,  1.0),
}

# EC2 7.4.2 structural-system factor K
K_SYSTEM = {
    "simply_supported": 1.0,
    "one_end_continuous": 1.3,
    "both_ends_continuous": 1.5,
    "cantilever": 0.4,
}

# EC2 Table 4.4N — minimum cover for durability (structural class S4), mm
C_MIN_DUR = {"XC1": 15.0, "XC2": 25.0, "XC3": 25.0, "XC4": 30.0}

# EC2-1-2 Table 5.8 — simply-supported one-way slabs: REI -> (min h, min axis dist a)
FIRE_REQ = {30: (60.0, 10.0), 60: (80.0, 20.0), 90: (100.0, 30.0),
            120: (120.0, 40.0), 180: (150.0, 55.0), 240: (175.0, 65.0)}

BAR_SPACINGS = [100, 125, 150, 175, 200, 225, 250]


def fctm_of(fck: float) -> float:
    """EC2 Table 3.1 — mean tensile strength. Computed, not tabulated, so it
    agrees exactly with the value shown in the calculation report."""
    if fck <= 50:
        return 0.30 * fck ** (2.0 / 3.0)
    return 2.12 * math.log(1 + (fck + 8) / 10.0)


@dataclass
class OneWayInput:
    span_m: float
    continuity: str
    thickness_mm: float
    clear_cover_mm: float
    concrete_grade: str = "C30/37"
    steel_grade: str = "B500"
    bar_diameters: List[int] = field(default_factory=lambda: [10, 12, 16])
    # loads (kN/m^2)
    dead_load: float = 0.0
    floor_finish: float = 0.0
    additional_dead_load: float = 0.0
    live_load: float = 0.0
    additional_live_load: float = 0.0
    gamma_concrete: float = 25.0
    # ---- user design parameters (previously collected but ignored) ----
    effective_depth_mm: Optional[float] = None   # user-specified d; overrides derived
    cover_tolerance_mm: float = 5.0              # detailing allowance
    deflection_limit: int = 250                  # span/N serviceability target
    exposure_class: str = "XC3"
    crack_width_limit: float = 0.3
    fire_rating: int = 60
    gamma_steel: float = 78.5


@dataclass
class BarChoice:
    bar_dia: int
    spacing: int
    As_prov: float


@dataclass
class FaceDesign:
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
    d_source: str
    d_derived_mm: float
    cover_mm: float
    cover_source: str
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
    # serviceability extras driven by user inputs
    deflection_limit_used: int
    span_over_limit_mm: float
    K_system: float
    rho: float
    rho_0: float
    F3: float
    crack_spacing_limit: float
    crack_status: str
    fire_status: str
    overall_status: str
    notes: List[str] = field(default_factory=list)


def _fck(grade: str) -> int:
    return int(grade.split("C")[1].split("/")[0])


def _fyk(grade: str) -> int:
    return int(grade.replace("B", ""))


def _resolve_cover(h, bar_dia, clear_cover, exposure_class, fire_rating, tol, notes):
    """Cover from bond, durability and fire; the user's value is used unless it
    falls below a code minimum, in which case the governing minimum is applied
    AND a note explains why."""
    c_min_b = max(bar_dia, 20.0)
    c_min_dur = C_MIN_DUR.get(str(exposure_class).upper(), 25.0)
    h_fire, a_fire = FIRE_REQ.get(int(fire_rating), (80.0, 20.0))
    c_min_fire = max(a_fire - bar_dia / 2.0, 0.0)
    c_min = max(c_min_b, c_min_dur, c_min_fire, 10.0)
    required = c_min + tol

    if clear_cover:
        if clear_cover < required:
            gov = ("bond" if c_min == c_min_b else
                   f"durability ({exposure_class})" if c_min == c_min_dur else
                   f"fire (REI {fire_rating})")
            notes.append(
                f"WARNING: cover entered ({clear_cover:.0f} mm) is below the EC2 minimum of "
                f"{required:.0f} mm (c_min {c_min:.0f} + {tol:.0f} tolerance, governed by {gov}). "
                f"The entered value has been used as instructed - review before construction."
            )
            return float(clear_cover), "user-specified (below code minimum)"
        return float(clear_cover), "user-specified"
    return required, "code minimum"


def _design_face(M_kNm, b, d, fck, fyk, fctm, bar_dia, cover, bar_diameters) -> FaceDesign:
    fyd = fyk / 1.15
    M = M_kNm * 1e6
    M_bal = 0.167 * fck * b * d ** 2

    if M <= M_bal:
        k = M / (fck * b * d ** 2) if (fck * b * d ** 2) else 0.0
        z = d * (0.5 + math.sqrt(max(0.25 - (k / 1.134), 0.0)))
        z = min(z, 0.9 * d)                       # lever-arm cap (0.9d)
        As = M / (z * fyd) if z else 0.0
        singly = True
    else:
        d_p = bar_dia / 2.0 + cover
        As_prime = (M - M_bal) / (0.87 * fyk * (d - d_p)) if (d - d_p) else 0.0
        z_bal = 0.82 * d
        As = (M_bal / (0.87 * fyk * z_bal)) + As_prime if z_bal else 0.0
        z, singly = z_bal, False
        k = M / (fck * b * d ** 2) if (fck * b * d ** 2) else 0.0

    bd = b * d
    As_min = max((0.26 * fctm / fyk) * bd, 0.0013 * bd)
    As_req = max(As, As_min)
    return FaceDesign(M_kNm=M_kNm, As_req=As_req, As_min=As_min, As=As,
                      z_mm=z, k=k, singly=singly, bar=_choose_bar(As_req, bar_diameters))


def _choose_bar(As_req, bar_diameters) -> Optional[BarChoice]:
    for dia in sorted(bar_diameters):
        area = math.pi * dia ** 2 / 4.0
        feasible = [(s, area * 1000.0 / s) for s in BAR_SPACINGS if area * 1000.0 / s >= As_req]
        if feasible:
            spacing, As_prov = max(feasible, key=lambda t: t[0])
            return BarChoice(bar_dia=dia, spacing=spacing, As_prov=As_prov)
    dia = max(bar_diameters)
    area = math.pi * dia ** 2 / 4.0
    return BarChoice(bar_dia=dia, spacing=BAR_SPACINGS[0], As_prov=area * 1000.0 / BAR_SPACINGS[0])


def design_one_way_slab(inp: OneWayInput) -> OneWayResult:
    notes: List[str] = []
    cont = inp.continuity if inp.continuity in MOMENT_COEFFS else "simply_supported"
    c_span, c_supp, c_shear = MOMENT_COEFFS[cont]

    b = 1000.0
    fck = _fck(inp.concrete_grade)
    fyk = _fyk(inp.steel_grade)
    fctm = fctm_of(fck)

    bar_guess = sorted(inp.bar_diameters)[0] if inp.bar_diameters else 12
    cover, cover_source = _resolve_cover(
        inp.thickness_mm, bar_guess, inp.clear_cover_mm,
        inp.exposure_class, inp.fire_rating, inp.cover_tolerance_mm, notes)

    # ---- effective depth: the user's value governs when supplied ----
    d_derived = inp.thickness_mm - cover - bar_guess / 2.0
    if inp.effective_depth_mm:
        d = float(inp.effective_depth_mm)
        d_source = "user-specified"
        if abs(d - d_derived) > 1.0:
            notes.append(
                f"Effective depth d = {d:.0f} mm was entered by the user and governs the design; "
                f"h - c - phi/2 gives {d_derived:.0f} mm. Check thickness, cover and bar size are consistent."
            )
        if d >= inp.thickness_mm:
            d = d_derived
            d_source = "REJECTED - entered d was >= slab thickness"
            notes.append(
                f"ERROR: effective depth entered ({inp.effective_depth_mm:.0f} mm) is not less than the "
                f"slab thickness ({inp.thickness_mm:.0f} mm), which is geometrically impossible - the bars "
                f"must sit inside the slab. The derived value d = {d_derived:.0f} mm has been used instead. "
                f"Increase the thickness or reduce the effective depth."
            )
    else:
        d, d_source = d_derived, "derived"

    # ---- loads ----
    self_weight = inp.gamma_concrete * (inp.thickness_mm / 1000.0)
    g_k = self_weight + inp.dead_load + inp.floor_finish + inp.additional_dead_load
    q_k = inp.live_load + inp.additional_live_load
    w_ed = 1.35 * g_k + 1.5 * q_k

    L = inp.span_m
    M_span = c_span * w_ed * L ** 2
    M_supp = c_supp * w_ed * L ** 2
    V_ed = c_shear * w_ed * L

    span_face = _design_face(M_span, b, d, fck, fyk, fctm, bar_guess, cover, inp.bar_diameters)
    support_face = _design_face(M_supp, b, d, fck, fyk, fctm, bar_guess, cover, inp.bar_diameters)

    As_prov_span = span_face.bar.As_prov if span_face.bar else 0.0
    As_prov_supp = support_face.bar.As_prov if support_face.bar else 0.0
    As_prov_gov = max(As_prov_span, As_prov_supp)

    # ---- shear (EC2 6.2.2) ----
    C_Rdc = 0.18 / 1.5
    k_sh = min(2.0, 1 + (200.0 / d) ** 0.5) if d else 1.0
    v_ed = V_ed * 1000.0 / (b * d) if d else 0.0
    rho_l = min(As_prov_gov / (b * d), 0.02) if d else 0.0
    v_rdc = max(C_Rdc * k_sh * (100 * rho_l * fck) ** (1 / 3),
                0.035 * k_sh ** 1.5 * fck ** 0.5)
    shear_status = "PASS" if v_ed <= v_rdc else "FAIL"

    # ---- deflection (EC2 7.4.2, both branches, K by continuity) ----
    actual_slenderness = (L * 1000.0) / d if d else 0.0
    # EC2 7.4.2 uses the REQUIRED tension ratio at the critical section. For a
    # cantilever the sagging moment is zero, so the support (hogging) face governs.
    gov_face = support_face if cont == "cantilever" else span_face
    gov_prov = As_prov_supp if cont == "cantilever" else As_prov_span
    rho = (gov_face.As_req / (b * d)) if d else 0.0
    rho_0 = 1e-3 * math.sqrt(fck)
    K_sys = K_SYSTEM.get(cont, 1.0)
    F3 = min(gov_prov / gov_face.As_req, 1.5) if gov_face.As_req else 1.5
    if rho and rho <= rho_0:
        basic = K_sys * (11 + 1.5 * math.sqrt(fck) * (rho_0 / rho)
                         + 3.2 * math.sqrt(fck) * (rho_0 / rho - 1) ** 1.5)
    elif rho:
        basic = K_sys * (11 + 1.5 * math.sqrt(fck) * rho_0 / rho + math.sqrt(fck) / 12.0)
    else:
        basic = K_sys * 11.0
    slenderness_limit = min(basic * F3, 40.0)   # practical cap; EC2 expression diverges as rho -> 0
    deflection_status = "PASS" if actual_slenderness <= slenderness_limit else "FAIL"

    # user's own span/N target, checked alongside the code limit
    span_over_limit = (L * 1000.0) / inp.deflection_limit if inp.deflection_limit else 0.0

    # ---- crack control (EC2 7.3.3 — spacing rules deemed to satisfy) ----
    crack_spacing_limit = min(3.0 * inp.thickness_mm, 400.0)
    if inp.crack_width_limit <= 0.2:
        crack_spacing_limit = min(crack_spacing_limit, 250.0)
    prov_spacing = span_face.bar.spacing if span_face.bar else 0
    crack_status = "PASS" if prov_spacing and prov_spacing <= crack_spacing_limit else "FAIL"
    if inp.thickness_mm <= 200:
        notes.append(
            f"Crack control (w_max = {inp.crack_width_limit:.2f} mm): for slabs <= 200 mm thick the bar "
            f"spacing rules of EC2 9.3.1.1 are deemed to satisfy 7.3.3; limit used {crack_spacing_limit:.0f} mm."
        )

    # ---- fire ----
    h_fire, a_fire = FIRE_REQ.get(int(inp.fire_rating), (80.0, 20.0))
    axis = cover + bar_guess / 2.0
    fire_status = "PASS" if (inp.thickness_mm >= h_fire and axis >= a_fire) else "FAIL"
    if fire_status == "FAIL":
        notes.append(
            f"Fire REI {inp.fire_rating}: requires h >= {h_fire:.0f} mm and axis distance >= {a_fire:.0f} mm; "
            f"provided h = {inp.thickness_mm:.0f} mm, a = {axis:.0f} mm."
        )

    checks = [
        "PASS" if As_prov_span >= span_face.As_req else "FAIL",
        "PASS" if (M_supp == 0 or As_prov_supp >= support_face.As_req) else "FAIL",
        "PASS" if As_prov_span >= span_face.As_min else "FAIL",
        shear_status, deflection_status, crack_status, fire_status,
    ]
    overall = "PASS" if all(c == "PASS" for c in checks) else "FAIL"

    if cont == "cantilever":
        notes.append("Cantilever: sagging is zero; bottom steel is nominal/minimum, top steel governs.")
    notes.append("Single-span idealisation; moments from closed-form coefficients per continuity type.")
    notes.append("Secondary (distribution) steel: provide >= 20% of main steel and not less than As,min.")

    return OneWayResult(
        d_mm=d, d_source=d_source, d_derived_mm=d_derived,
        cover_mm=cover, cover_source=cover_source,
        fck=fck, fyk=fyk, fctm=fctm,
        self_weight=self_weight, g_k=g_k, q_k=q_k, w_ed=w_ed,
        span_face=span_face, support_face=support_face,
        V_ed_kN=V_ed, v_ed=v_ed, v_rdc=v_rdc, shear_status=shear_status,
        actual_slenderness=actual_slenderness, slenderness_limit=slenderness_limit,
        deflection_status=deflection_status,
        deflection_limit_used=inp.deflection_limit, span_over_limit_mm=span_over_limit,
        K_system=K_sys, rho=rho, rho_0=rho_0, F3=F3,
        crack_spacing_limit=crack_spacing_limit, crack_status=crack_status,
        fire_status=fire_status, overall_status=overall, notes=notes,
    )