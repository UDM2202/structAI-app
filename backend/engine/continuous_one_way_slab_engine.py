# backend/engine/continuous_one_way_slab_engine.py
"""
Multi-span continuous one-way slab engine (EC2).

Uses the banded LDLᵀ solver (banded_symmetric_solver) for the beam-element FEM:
each span is one Euler-Bernoulli element, every node is a support (vertical
restrained), end nodes pinned or fixed per request. Nodal rotations are solved,
then the bending-moment diagram is recovered with the CORRECTED sign convention:

        BM(x) = -Mi + Vi·x - w·x²/2

validated against textbook continuous-beam coefficients (2-span support
-wL²/8 & span 9wL²/128; 3-span support -wL²/10 & end-span 0.080wL²).

Section design / deflection / shear / cost follow the user's EC2 routine.

Spans are in METRES (converted to mm internally).
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import math

from banded_symmetric_solver import BandedSymmetricMatrix, solve_banded_symmetric

FCTM_TABLE = {
    "C20/25": 2.2, "C25/30": 2.6, "C30/37": 2.9, "C35/45": 3.2,
    "C40/50": 3.5, "C45/55": 3.8, "C50/60": 4.1,
}
BAR_SPACINGS = [100, 125, 150, 175, 200, 225, 250]


@dataclass
class ContinuousInput:
    span_lengths_m: List[float]
    start_support: str = "pinned"     # pinned | fixed
    end_support: str = "pinned"
    thickness_mm: float = 175.0
    clear_cover_mm: float = 25.0
    concrete_grade: str = "C30/37"
    steel_grade: str = "B500"
    bar_diameters: List[int] = field(default_factory=lambda: [10, 12, 16])
    dead_load: float = 0.0
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
class SpanResult:
    index: int
    length_m: float
    M_sag_kNm: float
    As_req: float
    As_min: float
    bar: Optional[BarChoice]
    status: str


@dataclass
class SupportResult:
    index: int
    position: str           # "Start" | "Interior k" | "End"
    M_hog_kNm: float        # positive magnitude (hogging)
    shear_kN: float         # design shear at this support (max of adjacent ends)
    As_req: float
    As_min: float
    bar: Optional[BarChoice]
    status: str


@dataclass
class ContinuousResult:
    n_spans: int
    d_mm: float
    cover_mm: float
    fck: int
    fyk: int
    fctm: float
    self_weight: float
    g_k: float
    q_k: float
    w_ed: float
    spans: List[SpanResult]
    supports: List[SupportResult]
    env_sag_kNm: float
    env_hog_kNm: float
    env_shear_kN: float
    actual_slenderness: float
    slenderness_limit: float
    deflection_status: str
    v_ed: float
    v_rdc: float
    shear_status: str
    overall_status: str
    # full-beam diagram (per metre width), x in metres
    x_m: List[float] = field(default_factory=list)
    bmd_kNm: List[float] = field(default_factory=list)
    sfd_kN: List[float] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


# ---------- FEM core ----------
def _beam_k(EI: float, L: float):
    f = EI / L ** 3
    return [[f*12, f*6*L, -f*12, f*6*L],
            [f*6*L, f*4*L*L, -f*6*L, f*2*L*L],
            [-f*12, -f*6*L, f*12, -f*6*L],
            [f*6*L, f*2*L*L, -f*6*L, f*4*L*L]]


def _beam_f(w: float, L: float):
    p = w * L / 2.0
    m = w * L * L / 12.0
    return [-p, -m, -p, +m]


def _solve_continuous(L_list_mm: List[float], w: float, EI: float, start: str, end: str):
    """Returns per-element [Vi,Mi,Vj,Mj] (N, Nmm) for w in N/mm, L in mm."""
    nn = len(L_list_mm) + 1
    nd = 2 * nn
    K = [[0.0] * nd for _ in range(nd)]
    F = [0.0] * nd
    for i, L in enumerate(L_list_mm):
        ke = _beam_k(EI, L); fe = _beam_f(w, L); dm = [2*i, 2*i+1, 2*i+2, 2*i+3]
        for a in range(4):
            F[dm[a]] += fe[a]
            for b in range(4):
                K[dm[a]][dm[b]] += ke[a][b]
    restr = set(2 * i for i in range(nn))      # all verticals restrained (supports)
    if start == "fixed": restr.add(1)
    if end == "fixed": restr.add(2 * (nn - 1) + 1)
    free = [i for i in range(nd) if i not in restr]
    d = [0.0] * nd
    if free:
        Kr = [[K[i][j] for j in free] for i in free]
        Fr = [F[i] for i in free]
        hb = 0
        for a in range(len(free)):
            for b in range(len(free)):
                if abs(Kr[a][b]) > 0:
                    hb = max(hb, abs(a - b))
        Kb = BandedSymmetricMatrix.from_full(Kr, hb)
        xr, _ = solve_banded_symmetric(Kb, Fr)
        for idx, i in enumerate(free):
            d[i] = xr[idx]
    elems = []
    for i, L in enumerate(L_list_mm):
        ke = _beam_k(EI, L); fe = _beam_f(w, L); dm = [2*i, 2*i+1, 2*i+2, 2*i+3]
        de = [d[k] for k in dm]
        qe = [sum(ke[a][b] * de[b] for b in range(4)) - fe[a] for a in range(4)]
        elems.append({"Vi": qe[0], "Mi": qe[1], "Vj": qe[2], "Mj": qe[3], "L": L})
    return elems


def _element_bm(el, w, x):
    """Corrected sagging-positive bending moment at distance x (mm) from left node (Nmm)."""
    return -el["Mi"] + el["Vi"] * x - w * x * x / 2.0


# ---------- material / section helpers ----------
def _fck(g): return int(g.split("C")[1].split("/")[0])
def _fyk(g): return int(g.replace("B", ""))


def _cover_depth(h, bar, clear_cover):
    c_min = max(max(bar, 20), 20.0, 10.0)
    nominal = c_min + 5.0
    cover = max(clear_cover, nominal) if clear_cover else nominal
    return cover, h - cover - bar / 2.0


def _design_As(M_kNm, b, d, fck, fyk, fctm):
    ys = 1.15; fyd = fyk / ys
    M = abs(M_kNm) * 1e6
    M_bal = 0.167 * fck * b * d ** 2
    if M <= M_bal:
        k = M / (fck * b * d ** 2) if (fck*b*d**2) else 0.0
        z = min(d * (0.5 + math.sqrt(max(0.25 - k / 1.134, 0.0))), 0.9 * d)
        As = M / (z * fyd) if z else 0.0
    else:
        z = 0.82 * d
        As = M_bal / (0.87 * fyk * z) + (M - M_bal) / (0.87 * fyk * (0.9 * d))
    As_min = max((0.26 * fctm / fyk) * b * d, 0.0013 * b * d)
    return max(As, As_min), As_min


def _choose_bar(As_req, bar_diameters):
    for dia in sorted(bar_diameters):
        area = math.pi * dia ** 2 / 4.0
        feas = [(s, area * 1000.0 / s) for s in BAR_SPACINGS if area * 1000.0 / s >= As_req]
        if feas:
            s, ap = max(feas, key=lambda t: t[0])
            return BarChoice(dia, s, ap)
    dia = max(bar_diameters); area = math.pi * dia ** 2 / 4.0
    return BarChoice(dia, BAR_SPACINGS[0], area * 1000.0 / BAR_SPACINGS[0])


def design_continuous_slab(inp: ContinuousInput) -> ContinuousResult:
    b = 1000.0
    fck = _fck(inp.concrete_grade); fyk = _fyk(inp.steel_grade)
    fctm = FCTM_TABLE.get(inp.concrete_grade, 2.9)
    bar_guess = sorted(inp.bar_diameters)[0] if inp.bar_diameters else 12
    cover, d = _cover_depth(inp.thickness_mm, bar_guess, inp.clear_cover_mm)
    E = 33000.0  # MPa (uniform EI; value does not affect moments for prismatic continuous beam)
    I = b * inp.thickness_mm ** 3 / 12.0
    EI = E * I

    self_weight = inp.gamma_concrete * (inp.thickness_mm / 1000.0)
    g_k = self_weight + inp.dead_load + inp.floor_finish + inp.additional_dead_load
    q_k = inp.live_load + inp.additional_live_load
    w_ed = 1.35 * g_k + 1.5 * q_k          # kN/m^2 == N/mm on 1 m strip

    L_mm = [Lm * 1000.0 for Lm in inp.span_lengths_m]
    elems = _solve_continuous(L_mm, w_ed, EI, inp.start_support, inp.end_support)

    # ---- per-span sagging + per-support hogging + full diagram ----
    spans: List[SpanResult] = []
    x_all: List[float] = []; bmd: List[float] = []; sfd: List[float] = []
    x_offset = 0.0
    node_moments: List[float] = []   # BM at each node (left->right)
    for i, el in enumerate(elems):
        L = el["L"]
        # sample diagram
        max_sag = -1e30
        for t in range(0, 51):
            x = L * t / 50.0
            M = _element_bm(el, w_ed, x)          # Nmm
            V = el["Vi"] - w_ed * x               # N
            x_all.append((x_offset + x) / 1000.0)
            bmd.append(M / 1e6)                   # kNm
            sfd.append(V / 1000.0)                # kN
            if M > max_sag:
                max_sag = M
        if i == 0:
            node_moments.append(_element_bm(el, w_ed, 0.0))
        node_moments.append(_element_bm(el, w_ed, L))
        As_req, As_min = _design_As(max_sag / 1e6, b, d, fck, fyk, fctm)
        bar = _choose_bar(As_req, inp.bar_diameters)
        st = "PASS" if bar and bar.As_prov >= As_req else "FAIL"
        spans.append(SpanResult(i + 1, inp.span_lengths_m[i], max(max_sag / 1e6, 0.0), As_req, As_min, bar, st))
        x_offset += L

    # supports: nodes 0..n (hogging = negative node moments)
    supports: List[SupportResult] = []
    n_nodes = len(elems) + 1
    for n in range(n_nodes):
        Mn = node_moments[n] / 1e6   # kNm
        if n == 0:
            pos = "Start"
        elif n == n_nodes - 1:
            pos = "End"
        else:
            pos = f"Interior {n}"
        hog = -Mn if Mn < 0 else 0.0
        # design shear at this support node: max |V| of adjacent element ends
        v_left = abs(elems[n - 1]["Vi"] - w_ed * elems[n - 1]["L"]) if n > 0 else 0.0
        v_right = abs(elems[n]["Vi"]) if n < len(elems) else 0.0
        shear_node = max(v_left, v_right) / 1000.0   # kN
        As_req, As_min = _design_As(hog, b, d, fck, fyk, fctm)
        bar = _choose_bar(As_req, inp.bar_diameters)
        st = "PASS" if (hog == 0 or (bar and bar.As_prov >= As_req)) else "FAIL"
        supports.append(SupportResult(n, pos, hog, shear_node, As_req, As_min, bar, st))

    # envelopes
    env_sag = max(s.M_sag_kNm for s in spans)
    env_hog = max((s.M_hog_kNm for s in supports), default=0.0)
    env_shear = max(abs(el["Vi"]) for el in elems + [{"Vi": 0}]) / 1000.0
    env_shear = max(max(abs(el["Vi"]), abs(el["Vj"])) for el in elems) / 1000.0

    # governing steel
    as_prov_span = max((s.bar.As_prov for s in spans if s.bar), default=0.0)
    as_prov_supp = max((s.bar.As_prov for s in supports if s.bar), default=0.0)
    as_prov_gov = max(as_prov_span, as_prov_supp)
    as_req_gov = max(max((s.As_req for s in spans), default=0.0),
                     max((s.As_req for s in supports), default=0.0))

    # deflection: governing span (longest / max sag)
    gov_span = max(spans, key=lambda s: s.M_sag_kNm)
    L_gov_mm = gov_span.length_m * 1000.0
    actual_slenderness = L_gov_mm / d if d else 0.0
    p = (gov_span.As_req / (b * d) * 100) if d else 0.0
    po = (1 / 1000.0) * math.sqrt(fck) * 100
    f3 = min((gov_span.bar.As_prov / gov_span.As_req), 1.5) if (gov_span.bar and gov_span.As_req) else 1.5
    if p and p <= po:
        slenderness_limit = (11 + 1.5 * math.sqrt(fck) * (po / p)) * f3
    else:
        slenderness_limit = (11 + 1.5 * math.sqrt(fck)) * f3
    deflection_status = "PASS" if actual_slenderness <= slenderness_limit else "FAIL"

    # shear
    C_Rdc = 0.18 / 1.5
    k_sh = min(2.0, 1 + (200.0 / d) ** 0.5) if d else 1.0
    v_ed = env_shear * 1000.0 / (b * d) if d else 0.0
    rho_l = min(as_prov_gov / (b * d), 0.02) if d else 0.0
    v_rdc = max(C_Rdc * k_sh * (100 * rho_l * fck) ** (1 / 3), 0.035 * k_sh ** 1.5 * fck ** 0.5)
    shear_status = "PASS" if v_ed <= v_rdc else "FAIL"

    checks = [s.status for s in spans] + [s.status for s in supports] + [deflection_status, shear_status]
    overall = "PASS" if all(c == "PASS" for c in checks) else "FAIL"

    notes = [
        "Continuous beam-element FEM; 1 element per span, every node a support.",
        "Moment recovery: BM(x) = -Mi + Vi·x - wx²/2 (validated vs textbook coefficients).",
        "Secondary (distribution) steel: provide >= 20% of main and not less than As,min.",
    ]

    return ContinuousResult(
        n_spans=len(elems), d_mm=d, cover_mm=cover, fck=fck, fyk=fyk, fctm=fctm,
        self_weight=self_weight, g_k=g_k, q_k=q_k, w_ed=w_ed,
        spans=spans, supports=supports,
        env_sag_kNm=env_sag, env_hog_kNm=env_hog, env_shear_kN=env_shear,
        actual_slenderness=actual_slenderness, slenderness_limit=slenderness_limit,
        deflection_status=deflection_status, v_ed=v_ed, v_rdc=v_rdc, shear_status=shear_status,
        overall_status=overall, x_m=x_all, bmd_kNm=bmd, sfd_kN=sfd, notes=notes,
    )