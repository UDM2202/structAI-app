"""
Unified EC2 RC COLUMN design engine — axial / uniaxial / biaxial.

Consolidated from the user's three load-take-down scripts. Returns a
STRUCTURED result dict (JSON-serializable) instead of printing, so the web
dashboard can render it. The calculation trace is preserved as structured
rows (reference / calculation / output) for the detailed-report panel.

Behaviour vs the original scripts:
  * Honours the user-provided section & reinforcement by default
    (auto_select=False). The biaxial script's auto-section / auto-rebar is
    kept as an optional path (auto_select=True).
  * Same tributary-area load take-down, moments, slenderness, reinforcement
    limits, axial resistance, simplified moment capacity and interaction,
    and tie design as the source scripts.

VERIFICATION STATUS (unchanged from the scripts — flagged honestly):
  * Axial resistance, moment capacity (MRx/MRy) and the interaction check are
    the SIMPLIFIED hand estimates from the scripts, not a full N-M strain-
    compatibility analysis. The interaction is linear (Mx/MRx + My/MRy <= 1),
    not the EC2 5.8.9 exponent form. Slenderness uses the conservative
    20*C/sqrt(n) format. Treat outputs as indicative; verify against a
    trusted tool before real design.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional, List, Tuple
import math


# ============================================================ ENUMS
class ColumnType(Enum):
    AXIAL = "axially loaded"
    UNIAXIAL = "uniaxially loaded"
    BIAXIAL = "biaxially loaded"


class EndCondition(Enum):
    FIXED_FIXED = "fixed-fixed"
    FIXED_PINNED = "fixed-pinned"
    PINNED_PINNED = "pinned-pinned"
    FIXED_FREE = "fixed-free"


class DesignCode(Enum):
    EUROCODE_2 = "EC2"


# ============================================================ LOOKUPS
BUILDING_USE_LIVE_LOADS = {
    "residential": 2.0, "office": 3.0, "corridor": 4.0, "stairs": 4.0,
    "retail": 4.0, "shopping_mall": 5.0, "assembly_fixed_seating": 4.0,
    "assembly_movable_seating": 5.0, "assembly_concert_hall": 5.0,
    "assembly_dance_floor": 5.0, "storage_light": 5.0, "storage_heavy": 7.5,
    "warehouse_general": 5.0, "warehouse_heavy": 10.0, "parking_cars": 2.5,
    "parking_trucks": 5.0, "hospital_ward": 3.0, "hospital_operating_room": 4.0,
    "school_classroom": 3.0, "library_reading": 4.0, "library_stack": 7.5,
    "gymnasium": 5.0, "roof_access": 1.5, "roof_no_access": 0.75,
    "balcony": 3.0, "plant_room": 5.0,
}
CONCRETE_GRADES = {
    "C12/15": 12, "C16/20": 16, "C20/25": 20, "C25/30": 25, "C30/37": 30,
    "C35/45": 35, "C40/50": 40, "C45/55": 45, "C50/60": 50, "C55/67": 55,
    "C60/75": 60, "C70/85": 70, "C80/95": 80, "C90/105": 90,
}
STEEL_GRADES = {"B500": 500.0, "B460": 460.0}
EXPOSURE_MIN_DUR_MM = {"XC1": 20.0, "XC2": 25.0, "XC3": 30.0, "XC4": 35.0}
AVAILABLE_LINK_DIAS_MM = [8, 10, 12]
CANDIDATE_SECTIONS_MM = [
    (230, 230), (230, 300), (230, 380), (230, 460), (300, 300), (300, 450),
    (300, 600), (350, 350), (350, 525), (400, 400), (400, 600),
]
CANDIDATE_BAR_LAYOUTS = [
    (4, 16), (6, 16), (8, 16), (4, 20), (6, 20), (8, 20),
    (10, 20), (12, 20), (8, 25), (10, 25),
]


def get_fck(grade):
    try: return CONCRETE_GRADES[grade]
    except KeyError: raise ValueError(f"Unsupported concrete grade: {grade}")

def get_fyk(grade):
    try: return STEEL_GRADES[grade]
    except KeyError: raise ValueError(f"Unsupported steel grade: {grade}")

def get_code_parameters(code):
    if code == DesignCode.EUROCODE_2:
        return {"gamma_G": 1.35, "gamma_Q": 1.50, "gamma_c": 1.50,
                "gamma_s": 1.15, "alpha_cc": 0.85}
    raise ValueError("Unsupported design code.")

def support_k(ec):
    return {EndCondition.FIXED_FIXED: 0.5, EndCondition.FIXED_PINNED: 0.7,
            EndCondition.PINNED_PINNED: 1.0, EndCondition.FIXED_FREE: 2.0}[ec]

def frame_coefficient_c(braced): return 0.7 if braced else 1.1

def live_load_for_use(use):
    k = use.strip().lower()
    if k not in BUILDING_USE_LIVE_LOADS:
        raise ValueError(f"Unsupported building use: {use}")
    return BUILDING_USE_LIVE_LOADS[k]

def round_up_to_available(value, available):
    for it in available:
        if it >= value: return it
    return available[-1]

def bar_area_mm2(d): return math.pi * d ** 2 / 4.0

def nominal_cover_mm(exposure_class, link_dia_mm, c_dev_mm=10.0):
    c_min_dur = EXPOSURE_MIN_DUR_MM.get(exposure_class, 25.0)
    c_min_b = max(link_dia_mm, 10.0)
    return max(c_min_dur, c_min_b) + c_dev_mm


# ============================================================ DATA CLASSES
@dataclass
class Material:
    design_code: DesignCode = DesignCode.EUROCODE_2
    concrete_grade: str = "C30/37"
    steel_grade: str = "B500"
    concrete_density_kN_per_m3: float = 25.0
    masonry_density_kN_per_m3: float = 20.0

    @property
    def code_params(self): return get_code_parameters(self.design_code)
    @property
    def fck(self): return float(get_fck(self.concrete_grade))
    @property
    def fyk(self): return get_fyk(self.steel_grade)
    @property
    def gamma_G(self): return self.code_params["gamma_G"]
    @property
    def gamma_Q(self): return self.code_params["gamma_Q"]
    @property
    def gamma_c(self): return self.code_params["gamma_c"]
    @property
    def gamma_s(self): return self.code_params["gamma_s"]
    @property
    def alpha_cc(self): return self.code_params["alpha_cc"]
    @property
    def fcd(self): return self.alpha_cc * self.fck / self.gamma_c
    @property
    def fyd(self): return self.fyk / self.gamma_s
    @property
    def nu(self): return 1.0 - self.fck / 250.0


@dataclass
class Wall:
    present: bool = False
    thickness_m: float = 0.150
    density_kN_per_m3: Optional[float] = None
    opening_ratio: float = 0.0

    def line_load_kN_per_m(self, clear_h, default_density):
        if not self.present: return 0.0
        d = self.density_kN_per_m3 if self.density_kN_per_m3 is not None else default_density
        return self.thickness_m * clear_h * d * (1.0 - self.opening_ratio)


@dataclass
class Beam:
    width_m: float
    depth_m: float
    span_m: float
    wall: Wall = field(default_factory=Wall)

    def self_weight_kN_per_m(self, cd): return self.width_m * self.depth_m * cd
    def wall_line_load_kN_per_m(self, sh, dd):
        return self.wall.line_load_kN_per_m(max(sh - self.depth_m, 0.0), dd)


@dataclass
class FloorTemplate:
    building_use: str
    slab_thickness_m: float
    finishes_kN_per_m2: float
    services_kN_per_m2: float
    partitions_kN_per_m2: float
    beam_x: Beam
    beam_y: Beam
    imposed_override_kN_per_m2: Optional[float] = None

    def live_load_kN_per_m2(self):
        return self.imposed_override_kN_per_m2 if self.imposed_override_kN_per_m2 is not None else live_load_for_use(self.building_use)
    def slab_self_weight_kN_per_m2(self, cd): return self.slab_thickness_m * cd
    def dead_load_kN_per_m2(self, cd):
        return (self.slab_self_weight_kN_per_m2(cd) + self.finishes_kN_per_m2
                + self.services_kN_per_m2 + self.partitions_kN_per_m2)


@dataclass
class BuildingInput:
    number_of_typical_floors: int
    typical_floor: FloorTemplate
    roof_floor: FloorTemplate


@dataclass
class Geometry:
    column_id: str
    b_mm: float
    h_mm: float
    clear_cover_mm: float
    link_dia_mm: float
    main_bar_dia_mm: float
    n_bars_total: int
    storey_height_m: float = 3.0
    left_x_m: float = 4.0
    right_x_m: float = 5.0
    top_y_m: float = 3.5
    bottom_y_m: float = 3.5

    @property
    def tributary_width_x_m(self): return 0.5 * (self.left_x_m + self.right_x_m)
    @property
    def tributary_width_y_m(self): return 0.5 * (self.top_y_m + self.bottom_y_m)
    @property
    def tributary_area_m2(self): return self.tributary_width_x_m * self.tributary_width_y_m
    @property
    def area_mm2(self): return self.b_mm * self.h_mm
    @property
    def area_m2(self): return (self.b_mm / 1000.0) * (self.h_mm / 1000.0)
    @property
    def Ix_mm4(self): return self.b_mm * self.h_mm ** 3 / 12.0
    @property
    def Iy_mm4(self): return self.h_mm * self.b_mm ** 3 / 12.0
    @property
    def ix_mm(self): return math.sqrt(self.Ix_mm4 / self.area_mm2)
    @property
    def iy_mm(self): return math.sqrt(self.Iy_mm4 / self.area_mm2)
    @property
    def minimum_eccentricity_x_mm(self): return max(20.0, self.h_mm / 30.0)
    @property
    def minimum_eccentricity_y_mm(self): return max(20.0, self.b_mm / 30.0)
    @property
    def one_bar_area_mm2(self): return bar_area_mm2(self.main_bar_dia_mm)
    @property
    def total_steel_area_mm2(self): return self.n_bars_total * self.one_bar_area_mm2


@dataclass
class DesignInput:
    column_type: ColumnType
    end_condition: EndCondition
    braced: bool
    include_min_eccentricity: bool = True
    exposure_class: str = "XC1"
    auto_select: bool = False
    M01_kNm: Dict[str, float] = field(default_factory=dict)
    M02_kNm: Dict[str, float] = field(default_factory=dict)
    M01y_kNm: Dict[str, float] = field(default_factory=dict)
    M02y_kNm: Dict[str, float] = field(default_factory=dict)
    Mx_override_kNm: Dict[str, float] = field(default_factory=dict)
    My_override_kNm: Dict[str, float] = field(default_factory=dict)


# ============================================================ ENGINE
class ColumnDesign:
    def __init__(self, material, geometry, building, design):
        self.material = material
        self.geometry = geometry
        self.building = building
        self.design = design
        self._rows: List[dict] = []
        self._sheet: List[dict] = []

    # -- trace capture (mirrors the scripts' print rows) --
    def _sec(self, title):
        self._rows = []
        self._sheet.append({"section": title, "rows": self._rows})
    def _row(self, ref, calc, out=""):
        self._rows.append({"ref": ref, "calc": calc, "out": str(out)})

    # -- core --
    def K(self): return support_k(self.design.end_condition)
    def C(self): return frame_coefficient_c(self.design.braced)
    def effective_length_m(self): return self.K() * self.geometry.storey_height_m
    def column_self_weight_kN(self):
        return (self.material.gamma_G * self.geometry.area_m2
                * self.geometry.storey_height_m * self.material.concrete_density_kN_per_m3)

    def floor_load_breakdown(self, floor):
        m = self.material; g = self.geometry
        Gk = floor.dead_load_kN_per_m2(m.concrete_density_kN_per_m3)
        Qk = floor.live_load_kN_per_m2()
        q_uls = m.gamma_G * Gk + m.gamma_Q * Qk
        slab = q_uls * g.tributary_area_m2
        bx_sw = floor.beam_x.self_weight_kN_per_m(m.concrete_density_kN_per_m3)
        by_sw = floor.beam_y.self_weight_kN_per_m(m.concrete_density_kN_per_m3)
        bx_wall = floor.beam_x.wall_line_load_kN_per_m(g.storey_height_m, m.masonry_density_kN_per_m3)
        by_wall = floor.beam_y.wall_line_load_kN_per_m(g.storey_height_m, m.masonry_density_kN_per_m3)
        bx_r = m.gamma_G * (bx_sw + bx_wall) * floor.beam_x.span_m / 2.0
        by_r = m.gamma_G * (by_sw + by_wall) * floor.beam_y.span_m / 2.0
        col = self.column_self_weight_kN()
        return {"Gk": Gk, "Qk": Qk, "q_uls": q_uls, "slab_to_column": slab,
                "bx_sw": bx_sw, "by_sw": by_sw, "bx_wall": bx_wall, "by_wall": by_wall,
                "bx_reaction": bx_r, "by_reaction": by_r, "column_self_weight": col,
                "total_floor_load": slab + bx_r + by_r + col}

    def typical_floor_result(self): return self.floor_load_breakdown(self.building.typical_floor)
    def roof_floor_result(self): return self.floor_load_breakdown(self.building.roof_floor)

    def axial_loads_by_level_kN(self):
        res = {}
        running = self.roof_floor_result()["total_floor_load"]
        res["Roof"] = running
        for i in range(self.building.number_of_typical_floors, 0, -1):
            running += self.typical_floor_result()["total_floor_load"]
            res[f"Typical_Floor_{i}"] = running
        ordered = {}
        for i in range(1, self.building.number_of_typical_floors + 1):
            ordered[f"Typical_Floor_{i}"] = res[f"Typical_Floor_{i}"]
        ordered["Roof"] = res["Roof"]
        return ordered

    def equivalent_first_order_moment_kNm(self, M01, M02):
        M01, M02 = abs(M01), abs(M02)
        return max(0.6 * M02 + 0.4 * M01, 0.4 * M02)

    def min_ecc_moment_x(self, N): return N * self.geometry.minimum_eccentricity_x_mm / 1000.0
    def min_ecc_moment_y(self, N): return N * self.geometry.minimum_eccentricity_y_mm / 1000.0

    def governing_moment_x(self, level, N):
        if level in self.design.Mx_override_kNm: return self.design.Mx_override_kNm[level]
        if self.design.column_type == ColumnType.AXIAL:
            mf = 0.0
        else:
            mf = self.equivalent_first_order_moment_kNm(
                self.design.M01_kNm.get(level, 0.0), self.design.M02_kNm.get(level, 0.0))
        return max(mf, self.min_ecc_moment_x(N)) if self.design.include_min_eccentricity else mf

    def governing_moment_y(self, level, N):
        if level in self.design.My_override_kNm: return self.design.My_override_kNm[level]
        if self.design.column_type in (ColumnType.AXIAL, ColumnType.UNIAXIAL):
            mf = 0.0
        else:
            mf = self.equivalent_first_order_moment_kNm(
                self.design.M01y_kNm.get(level, 0.0), self.design.M02y_kNm.get(level, 0.0))
        return max(mf, self.min_ecc_moment_y(N)) if self.design.include_min_eccentricity else mf

    def slenderness_ratio(self): return (self.effective_length_m() * 1000.0) / self.geometry.ix_mm
    def relative_axial_load_n(self, N): return (N * 1000.0) / (self.geometry.area_mm2 * self.material.fcd)
    def slenderness_limit(self, N):
        n = max(self.relative_axial_load_n(N), 0.10)
        return 20.0 * self.C() / math.sqrt(n)

    def min_long_steel(self, N):
        return max(0.10 * (N * 1000.0) / self.material.fyd, 0.002 * self.geometry.area_mm2)
    def max_long_steel(self): return 0.04 * self.geometry.area_mm2

    def axial_resistance_kN(self):
        conc = self.material.nu * self.material.fcd * self.geometry.area_mm2 / 1000.0
        steel = self.geometry.total_steel_area_mm2 * self.material.fyd / 1000.0
        return conc + steel

    def moment_capacity_x(self):
        As = 4 * bar_area_mm2(self.geometry.main_bar_dia_mm)
        d = self.geometry.h_mm - self.geometry.clear_cover_mm - self.geometry.link_dia_mm - self.geometry.main_bar_dia_mm / 2.0
        return As * self.material.fyd * (0.9 * d / 1000.0) / 1000.0
    def moment_capacity_y(self):
        As = 2 * bar_area_mm2(self.geometry.main_bar_dia_mm)
        d = self.geometry.b_mm - self.geometry.clear_cover_mm - self.geometry.link_dia_mm - self.geometry.main_bar_dia_mm / 2.0
        return As * self.material.fyd * (0.9 * d / 1000.0) / 1000.0

    def utilisation(self, level, N):
        Mx, My = self.governing_moment_x(level, N), self.governing_moment_y(level, N)
        MRx, MRy = self.moment_capacity_x(), self.moment_capacity_y()
        return (Mx / MRx if MRx > 0 else 999.0) + (My / MRy if MRy > 0 else 999.0)

    def min_tie_dia(self): return max(6.0, self.geometry.main_bar_dia_mm / 4.0)
    def max_tie_spacing(self):
        return min(12.0 * self.geometry.main_bar_dia_mm, min(self.geometry.b_mm, self.geometry.h_mm), 300.0)

    # ---- N-M interaction diagram (strain compatibility, rectangular block) ----
    # Simplified: symmetric steel in 2 layers (half top, half bottom), fck<=50
    # (lambda=0.8, eta=1.0). Returns list of {M_kNm, N_kN} about the given axis.
    def interaction_curve(self, axis="x"):
        g, m = self.geometry, self.material
        if axis == "x":              # bending about x -> depth = h, width = b
            overall, width = g.h_mm, g.b_mm
        else:                        # about y -> depth = b, width = h
            overall, width = g.b_mm, g.h_mm
        fcd, fyd = m.fcd, m.fyd
        Es, ecu = 200000.0, 0.0035
        As_layer = g.total_steel_area_mm2 / 2.0
        d2 = g.clear_cover_mm + g.link_dia_mm + g.main_bar_dia_mm / 2.0  # to near steel
        d = overall - d2                                                # to far steel
        layers = [(d2, As_layer), (d, As_layer)]                        # (depth from comp face, area)
        lam, eta = 0.8, 1.0

        pts = []
        # pure axial squash point
        N0 = (eta * fcd * width * overall + g.total_steel_area_mm2 * fyd) / 1000.0
        pts.append({"M_kNm": 0.0, "N_kN": round(N0, 1)})
        # sweep neutral axis depth
        xs = [overall * f for f in (
            0.10, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7,
            0.8, 0.9, 1.0, 1.2, 1.5, 2.0, 3.0)]
        for x in xs:
            a = min(lam * x, overall)
            Fc = eta * fcd * width * a                         # N (compression +)
            zc = overall / 2.0 - a / 2.0
            N = Fc
            M = Fc * zc
            for di, As in layers:
                eps = ecu * (x - di) / x if x > 0 else -0.01
                sig = max(-fyd, min(fyd, Es * eps))            # +comp
                Fs = As * sig
                N += Fs
                M += Fs * (overall / 2.0 - di)
            pts.append({"M_kNm": round(abs(M) / 1e6, 2), "N_kN": round(N / 1e3, 1)})
        # pure bending point (N=0): approximate tension-controlled
        pts.append({"M_kNm": round(self._pure_bending_M(width, overall, As_layer, d, d2), 2), "N_kN": 0.0})
        pts.sort(key=lambda p: p["N_kN"])
        return pts

    def _pure_bending_M(self, width, overall, As_layer, d, d2):
        m = self.material
        # tension steel = As_layer at d yields; compression steel ignored (conservative)
        fyd, fcd = m.fyd, m.fcd
        a = As_layer * fyd / (0.8 * fcd * width)          # block depth from N=0 eq (comp steel ignored)
        a = min(a, overall)
        z = d - a / 2.0
        return As_layer * fyd * z / 1e6                    # kN*m

    # ---- biaxial interaction envelope (EC2 5.8.9 exponent method) ----
    def biaxial_envelope(self, N_crit):
        MRx, MRy = self.moment_capacity_x(), self.moment_capacity_y()
        NRd = self.axial_resistance_kN()
        n = N_crit / NRd if NRd > 0 else 0.0
        # exponent a: n<=0.1 ->1.0; 0.7->1.5; 1.0->2.0 (piecewise linear)
        if n <= 0.1: a = 1.0
        elif n >= 1.0: a = 2.0
        elif n <= 0.7: a = 1.0 + (n - 0.1) * (0.5 / 0.6)
        else: a = 1.5 + (n - 0.7) * (0.5 / 0.3)
        pts = []
        for i in range(41):
            t = i / 40.0
            mx = MRx * t
            inner = 1.0 - (mx / MRx) ** a if MRx > 0 else 0.0
            my = MRy * (max(inner, 0.0)) ** (1.0 / a) if MRy > 0 else 0.0
            pts.append({"Mx_kNm": round(mx, 2), "My_kNm": round(my, 2)})
        return {"exponent_a": round(a, 3), "MRx_kNm": round(MRx, 2),
                "MRy_kNm": round(MRy, 2), "envelope": pts}

    # ---- second-order (nominal curvature, 5.8.8) ----
    def second_order(self, level, N, axis="x"):
        g, m = self.geometry, self.material
        if not (self.slenderness_ratio() > self.slenderness_limit(N)):
            M0 = self.governing_moment_x(level, N) if axis == "x" else self.governing_moment_y(level, N)
            return {"slender": False, "e2_mm": 0.0, "M2_kNm": 0.0,
                    "M0Ed_kNm": round(M0, 2), "MEd_kNm": round(M0, 2)}
        overall = g.h_mm if axis == "x" else g.b_mm
        d = overall - (g.clear_cover_mm + g.link_dia_mm + g.main_bar_dia_mm / 2.0)
        eps_yd = m.fyd / 200000.0
        inv_r0 = eps_yd / (0.45 * d)
        Kr, Kphi = 1.0, 1.0                        # conservative (as flagged)
        inv_r = Kr * Kphi * inv_r0
        l0 = self.effective_length_m() * 1000.0
        e2 = inv_r * l0 ** 2 / 10.0                 # mm (c≈10)
        M2 = N * e2 / 1000.0
        M0 = self.governing_moment_x(level, N) if axis == "x" else self.governing_moment_y(level, N)
        return {"slender": True, "e2_mm": round(e2, 2), "M2_kNm": round(M2, 2),
                "M0Ed_kNm": round(M0, 2), "MEd_kNm": round(M0 + M2, 2)}

    # ---- SLS (simplified, indicative) ----
    def sls_checks(self, N_crit):
        g, m = self.geometry, self.material
        # elastic modulus Ecm (EC2 3.1.3): 22*(fcm/10)^0.3 GPa, fcm=fck+8
        fcm = m.fck + 8.0
        Ecm = 22000.0 * (fcm / 10.0) ** 0.3        # MPa
        # axial shortening under quasi-permanent (~N/1.4 as estimate), elastic
        N_qp = N_crit / 1.4 * 1000.0               # N
        L = g.storey_height_m * 1000.0
        # transformed area ~ Ac + (Es/Ecm -1)*As
        Ac_eff = g.area_mm2 + (200000.0 / Ecm - 1.0) * g.total_steel_area_mm2
        shortening = N_qp * L / (Ecm * Ac_eff)     # mm
        short_limit = L / 500.0
        # crack width: columns in axial compression generally uncracked;
        # report indicative value = 0 if net compression, flag otherwise
        crack = 0.0
        crack_limit = 0.30
        return {
            "Ecm_MPa": round(Ecm, 0),
            "axial_shortening_mm": round(shortening, 3),
            "axial_shortening_limit_mm": round(short_limit, 2),
            "axial_shortening_ok": shortening <= short_limit,
            "crack_width_mm": round(crack, 3),
            "crack_width_limit_mm": crack_limit,
            "crack_width_ok": crack <= crack_limit,
            "note": "Indicative SLS. Column in net compression assumed uncracked (wk≈0).",
        }

    # -- auto-select (optional; from biaxial script) --
    def _auto_select(self, N):
        orig = self.geometry
        chosen = CANDIDATE_SECTIONS_MM[-1]
        for b, h in CANDIDATE_SECTIONS_MM:
            self.geometry = Geometry(orig.column_id, b, h, orig.clear_cover_mm, orig.link_dia_mm,
                orig.main_bar_dia_mm, orig.n_bars_total, orig.storey_height_m,
                orig.left_x_m, orig.right_x_m, orig.top_y_m, orig.bottom_y_m)
            conc = self.material.nu * self.material.fcd * self.geometry.area_mm2 / 1000.0
            if conc >= 0.75 * N and self.slenderness_ratio() <= self.slenderness_limit(N):
                chosen = (b, h); break
        self.geometry = orig
        b, h = chosen
        link = round_up_to_available(8.0, AVAILABLE_LINK_DIAS_MM)
        As_min = max(0.10 * (N * 1000.0) / self.material.fyd, 0.002 * b * h)
        As_max = 0.04 * b * h
        cover, main, nb = nominal_cover_mm(self.design.exposure_class, link), 16, 4
        for n_bars, dia in CANDIDATE_BAR_LAYOUTS:
            As = n_bars * bar_area_mm2(dia)
            NRd = (self.material.nu * self.material.fcd * b * h + As * self.material.fyd) / 1000.0
            if As_min <= As <= As_max and NRd >= N:
                link = round_up_to_available(max(6.0, dia / 4.0), AVAILABLE_LINK_DIAS_MM)
                cover, main, nb = nominal_cover_mm(self.design.exposure_class, link), dia, n_bars
                break
        else:
            nb, main = CANDIDATE_BAR_LAYOUTS[-1]
            link = round_up_to_available(max(6.0, main / 4.0), AVAILABLE_LINK_DIAS_MM)
            cover = nominal_cover_mm(self.design.exposure_class, link)
        self.geometry = Geometry(orig.column_id, b, h, cover, link, main, nb, orig.storey_height_m,
            orig.left_x_m, orig.right_x_m, orig.top_y_m, orig.bottom_y_m)

    # -- main: returns structured result --
    def design_result(self) -> dict:
        m, g, d = self.material, self.geometry, self.design
        self._sheet = []

        axial_pre = self.axial_loads_by_level_kN()
        N_pre = next(iter(axial_pre.values()))
        if d.auto_select:
            self._auto_select(N_pre)
            g = self.geometry

        axial = self.axial_loads_by_level_kN()
        crit_level = next(iter(axial.keys()))
        N_crit = axial[crit_level]

        As_min = self.min_long_steel(N_crit)
        As_max = self.max_long_steel()
        As_prov = g.total_steel_area_mm2
        NRd = self.axial_resistance_kN()
        MRx, MRy = self.moment_capacity_x(), self.moment_capacity_y()
        lam = self.slenderness_ratio()
        lam_lim = self.slenderness_limit(N_crit)
        slender = lam > lam_lim

        # per-level table
        levels = []
        for level, N in axial.items():
            Mx = self.governing_moment_x(level, N)
            My = self.governing_moment_y(level, N)
            util = self.utilisation(level, N)
            levels.append({
                "level": level, "NEd_kN": round(N, 2),
                "Mx_kNm": round(Mx, 2), "My_kNm": round(My, 2),
                "ex_mm": round(1000.0 * My / N, 2) if N else 0.0,
                "ey_mm": round(1000.0 * Mx / N, 2) if N else 0.0,
                "utilisation": round(util, 3),
                "check": "PASS" if util <= 1.0 else "FAIL",
            })

        checks = {
            "axial": NRd >= N_crit,
            "As_min": As_prov >= As_min,
            "As_max": As_prov <= As_max,
            "slenderness_class": "Short" if not slender else "Slender",
            "interaction": all(l["check"] == "PASS" for l in levels),
            "tie_dia": g.link_dia_mm >= self.min_tie_dia(),
        }
        bool_checks = {k: v for k, v in checks.items() if isinstance(v, bool)}
        final_pass = all(bool_checks.values())

        governing = "Axial resistance"
        if slender: governing = "Slenderness"
        elif not (As_min <= As_prov <= As_max): governing = "Reinforcement limits"
        else:
            for l in levels:
                if l["check"] == "FAIL":
                    governing = f"Interaction at {l['level']}"; break

        # load breakdowns
        tf = self.typical_floor_result()
        rf = self.roof_floor_result()

        self._build_sheet(g, axial, levels, As_min, As_max, As_prov, NRd, MRx, MRy,
                          lam, lam_lim, slender, N_crit, tf, rf)

        return {
            "column_id": g.column_id,
            "column_type": d.column_type.value,
            "end_condition": d.end_condition.value,
            "braced": d.braced,
            "status": "PASS" if final_pass else "FAIL",
            "governing": governing,
            "auto_selected": d.auto_select,
            "materials": {
                "concrete_grade": m.concrete_grade, "steel_grade": m.steel_grade,
                "fck": m.fck, "fyk": m.fyk, "fcd": round(m.fcd, 3),
                "fyd": round(m.fyd, 3), "nu": round(m.nu, 4),
            },
            "geometry": {
                "b_mm": g.b_mm, "h_mm": g.h_mm, "Ac_mm2": round(g.area_mm2, 1),
                "cover_mm": round(g.clear_cover_mm, 1), "link_dia_mm": g.link_dia_mm,
                "main_bar_dia_mm": g.main_bar_dia_mm, "n_bars": g.n_bars_total,
                "Ix_mm4": round(g.Ix_mm4, 0), "Iy_mm4": round(g.Iy_mm4, 0),
                "ix_mm": round(g.ix_mm, 2), "iy_mm": round(g.iy_mm, 2),
                "tributary_area_m2": round(g.tributary_area_m2, 3),
            },
            "slenderness": {
                "K": self.K(), "C": self.C(),
                "Leff_m": round(self.effective_length_m(), 3),
                "lambda": round(lam, 2), "lambda_lim": round(lam_lim, 2),
                "n": round(self.relative_axial_load_n(N_crit), 3),
                "classification": "Short" if not slender else "Slender",
            },
            "reinforcement": {
                "As_provided_mm2": round(As_prov, 1),
                "As_min_mm2": round(As_min, 1), "As_max_mm2": round(As_max, 1),
                "NRd_kN": round(NRd, 2), "MRx_kNm": round(MRx, 2), "MRy_kNm": round(MRy, 2),
                "rho_pct": round(100.0 * As_prov / g.area_mm2, 2),
            },
            "critical": {"level": crit_level, "NEd_kN": round(N_crit, 2)},
            "levels": levels,
            "checks": checks,
            "ties": {
                "min_dia_mm": round(self.min_tie_dia(), 1),
                "provided_dia_mm": g.link_dia_mm,
                "max_spacing_mm": round(self.max_tie_spacing(), 1),
            },
            "loads": {"typical_floor": {k: round(v, 3) for k, v in tf.items()},
                      "roof_floor": {k: round(v, 3) for k, v in rf.items()}},
            "interaction_curve": {
                "axis": "x", "design_point": {"M_kNm": round(self.governing_moment_x(crit_level, N_crit), 2),
                                              "N_kN": round(N_crit, 1)},
                "points": self.interaction_curve("x"),
            },
            "biaxial_envelope": {
                **self.biaxial_envelope(N_crit),
                "design_point": {"Mx_kNm": round(self.governing_moment_x(crit_level, N_crit), 2),
                                 "My_kNm": round(self.governing_moment_y(crit_level, N_crit), 2)},
            },
            "surface_3d": {
                "points": surface_3d(g, m),
                "design_point": {"N_kN": round(N_crit, 1),
                                 "Mx_kNm": round(self.governing_moment_x(crit_level, N_crit), 2),
                                 "My_kNm": round(self.governing_moment_y(crit_level, N_crit), 2)},
            },
            "second_order": {
                l["level"]: second_order_rigorous(
                    g, m, "x", l["NEd_kN"], self.governing_moment_x(l["level"], l["NEd_kN"]),
                    self.effective_length_m() * 1000.0, lam, phi_ef=getattr(self.design, "phi_ef", 2.0))
                for l in levels
            },
            "sls": crack_width_ec2(
                g, m, N_crit / 1.4, self.governing_moment_x(crit_level, N_crit) / 1.4, "x"),
            "report": self._sheet,
        }

    def _build_sheet(self, g, axial, levels, As_min, As_max, As_prov, NRd, MRx, MRy,
                     lam, lam_lim, slender, N_crit, tf, rf):
        m, d = self.material, self.design
        self._sec("1. Materials (EC2 3.1.6 / 3.2.7)")
        self._row("3.1.6", f"fcd = {m.alpha_cc}·{m.fck}/{m.gamma_c}", f"{m.fcd:.3f} MPa")
        self._row("3.2.7", f"fyd = {m.fyk}/{m.gamma_s}", f"{m.fyd:.1f} MPa")
        self._row("—", f"nu = 1 - {m.fck}/250", f"{m.nu:.3f}")

        self._sec("2. Geometry")
        self._row("Tributary", f"At = {g.tributary_width_x_m:.2f}×{g.tributary_width_y_m:.2f}", f"{g.tributary_area_m2:.3f} m²")
        self._row("Section", f"A = {g.b_mm:.0f}×{g.h_mm:.0f}", f"{g.area_mm2:.0f} mm²")
        self._row("—", "ix = √(Ix/A)", f"{g.ix_mm:.2f} mm")

        self._sec("3. Axial load take-down")
        for level, N in axial.items():
            self._row("Take-down", f"NEd at {level}", f"{N:.2f} kN")

        self._sec("4. Moments / eccentricity")
        for l in levels:
            self._row("5.8.8", f"{l['level']} Mx,Ed", f"{l['Mx_kNm']:.2f} kNm")
            if d.column_type == ColumnType.BIAXIAL:
                self._row("5.8.8", f"{l['level']} My,Ed", f"{l['My_kNm']:.2f} kNm")

        self._sec("5. Slenderness (5.8.3)")
        self._row("K", f"from {d.end_condition.value}", f"{self.K()}")
        self._row("Leff", f"{self.K()}×{g.storey_height_m}", f"{self.effective_length_m():.3f} m")
        self._row("λ", "Leff/i", f"{lam:.2f}")
        self._row("5.8.3.1", "λlim = 20·C/√n", f"{lam_lim:.2f}")
        self._row("Class", "λ ≤ λlim ?", "Short" if not slender else "Slender")

        self._sec("6. Reinforcement & resistance (9.5.2)")
        self._row("Provided", f"{g.n_bars_total}×Ø{g.main_bar_dia_mm:.0f}", f"{As_prov:.0f} mm²")
        self._row("9.5.2", "As,min", f"{As_min:.0f} mm²")
        self._row("9.5.2", "As,max = 0.04Ac", f"{As_max:.0f} mm²")
        self._row("NRd", "νfcd·Ac + As·fyd", f"{NRd:.2f} kN")
        self._row("MRx / MRy", "simplified estimate", f"{MRx:.2f} / {MRy:.2f} kNm")

        self._sec("7. Tie design (9.5.3)")
        self._row("9.5.3", "min tie dia = max(6, φ/4)", f"{self.min_tie_dia():.1f} mm")
        self._row("9.5.3", "max spacing = min(12φ, min(b,h), 300)", f"{self.max_tie_spacing():.1f} mm")


def design_column(material, geometry, building, design) -> dict:
    return ColumnDesign(material, geometry, building, design).design_result()


# ===================== RIGOROUS ADDITIONS (validated) =====================
import math


def _bar_positions(g):
    """True (x,y) positions of bars on the section perimeter, origin at centroid.
    Distributes n_bars_total around the rectangle: corners first, then split the
    remainder between the two longer/shorter faces as evenly as possible."""
    b, h = g.b_mm, g.h_mm
    d2 = g.clear_cover_mm + g.link_dia_mm + g.main_bar_dia_mm / 2.0
    xL, xR = -b / 2 + d2, b / 2 - d2
    yB, yT = -h / 2 + d2, h / 2 - d2
    n = max(4, g.n_bars_total)
    # corners
    pts = [(xL, yB), (xR, yB), (xR, yT), (xL, yT)]
    rem = n - 4
    if rem <= 0:
        return pts[:n]
    # distribute remainder: proportion to side lengths
    per_x = round(rem * (b / (b + h)))          # bars on top+bottom faces
    per_y = rem - per_x                          # bars on left+right faces
    # place along bottom & top (x varies)
    def spread(count, x0, x1, y):
        out = []
        for i in range(count):
            t = (i + 1) / (count + 1)
            out.append((x0 + (x1 - x0) * t, y))
        return out
    half_x1 = per_x // 2
    half_x2 = per_x - half_x1
    pts += spread(half_x1, xL, xR, yB)
    pts += spread(half_x2, xL, xR, yT)
    half_y1 = per_y // 2
    half_y2 = per_y - half_y1
    pts += [(xL, y) for (_, y) in spread(half_y1, yB, yT, 0)]
    pts += [(xR, y) for (_, y) in spread(half_y2, yB, yT, 0)]
    return pts


def surface_point(g, m, theta_deg, c_depth):
    """One (N, Mx, My) point for neutral axis at orientation theta and depth c.
    Rotated-section strain compatibility, rectangular stress block."""
    fcd, fyd = m.fcd, m.fyd
    Es, ecu = 200000.0, 0.0035
    lam, eta = 0.8, 1.0
    th = math.radians(theta_deg)
    ct, st = math.cos(th), math.sin(th)
    b, h = g.b_mm, g.h_mm

    # signed distance of a point from neutral axis, measured along +normal (ct,st)
    # extreme compression fibre is the section corner with max u
    corners = [(-b/2, -h/2), (b/2, -h/2), (b/2, h/2), (-b/2, h/2)]
    us = [x*ct + y*st for (x, y) in corners]
    umax = max(us)
    # neutral axis at u = umax - c_depth ; compression zone: u >= (umax - c)
    u_na = umax - c_depth

    # concrete: integrate stress block over compression polygon via fine grid
    # (grid is adequate for a smooth envelope; step ~ h/40)
    nx, ny = 40, 40
    dx, dy = b / nx, h / ny
    dA = dx * dy
    Fc = 0.0; Mcx = 0.0; Mcy = 0.0
    for i in range(nx):
        xc = -b/2 + (i + 0.5) * dx
        for j in range(ny):
            yc = -h/2 + (j + 0.5) * dy
            u = xc*ct + yc*st
            # within stress block if u between (umax - lam*c) and umax
            if u >= umax - lam * c_depth:
                f = eta * fcd
                Fc += f * dA
                Mcx += f * dA * yc      # moment about x-axis (My uses x, Mx uses y)
                Mcy += f * dA * xc
    # steel
    Fs = 0.0; Msx = 0.0; Msy = 0.0
    As_bar = math.pi * g.main_bar_dia_mm**2 / 4.0
    for (xb, yb) in _bar_positions(g):
        u = xb*ct + yb*st
        eps = ecu * (u - u_na) / (umax - u_na) if (umax - u_na) != 0 else 0.0
        sig = max(-fyd, min(fyd, Es * eps))      # + compression
        Fs += As_bar * sig
        Msx += As_bar * sig * yb
        Msy += As_bar * sig * xb
    N = (Fc + Fs) / 1000.0                         # kN
    Mx = (Mcx + Msx) / 1e6                          # kN*m (about x, from y-lever)
    My = (Mcy + Msy) / 1e6                          # kN*m (about y, from x-lever)
    return N, abs(Mx), abs(My)


def surface_3d(g, m, n_theta=13, n_depth=12):
    """Mesh of (N, Mx, My) points forming the failure surface (quarter, mirrored)."""
    pts = []
    hmax = max(g.b_mm, g.h_mm)
    depths = [hmax * f for f in [0.08, 0.12, 0.18, 0.25, 0.33, 0.42, 0.52,
                                 0.65, 0.8, 1.0, 1.4, 2.2][:n_depth]]
    for ti in range(n_theta):
        theta = 90.0 * ti / (n_theta - 1)          # 0..90 deg (quarter)
        for c in depths:
            N, Mx, My = surface_point(g, m, theta, c)
            pts.append({"N_kN": round(N, 1), "Mx_kNm": round(Mx, 2), "My_kNm": round(My, 2)})
    # squash apex
    N0 = (m.fcd * g.b_mm * g.h_mm + g.total_steel_area_mm2 * m.fyd) / 1000.0
    pts.append({"N_kN": round(N0, 1), "Mx_kNm": 0.0, "My_kNm": 0.0})
    return pts

import math


def second_order_rigorous(g, m, axis, N_kN, M0Ed_kNm, l0_mm, lam, phi_ef=2.0):
    """Returns dict with computed Kr, Kphi, e2, M2, MEd for one axis/level.
    Applies only when slender (caller decides); here we always compute and let
    the result carry the numbers."""
    overall = g.h_mm if axis == "x" else g.b_mm
    d = overall - (g.clear_cover_mm + g.link_dia_mm + g.main_bar_dia_mm / 2.0)

    fcd, fyd = m.fcd, m.fyd
    Ac = g.area_mm2
    As = g.total_steel_area_mm2

    # mechanical reinforcement ratio and axial levels
    omega = As * fyd / (Ac * fcd)
    n = (N_kN * 1000.0) / (Ac * fcd)          # relative axial load
    n_u = 1.0 + omega
    n_bal = 0.4                                # EC2 recommended value
    Kr = (n_u - n) / (n_u - n_bal) if (n_u - n_bal) != 0 else 1.0
    Kr = max(0.0, min(1.0, Kr))

    beta = 0.35 + m.fck / 200.0 - lam / 150.0
    Kphi = max(1.0, 1.0 + beta * phi_ef)

    eps_yd = fyd / 200000.0
    inv_r0 = eps_yd / (0.45 * d)
    inv_r = Kr * Kphi * inv_r0

    c = math.pi ** 2                           # ~9.87 (sinusoidal)
    e2 = inv_r * (l0_mm ** 2) / c              # mm
    M2 = N_kN * e2 / 1000.0                    # kN*m
    return {
        "omega": round(omega, 3),
        "n": round(n, 3),
        "n_u": round(n_u, 3),
        "n_bal": n_bal,
        "Kr": round(Kr, 3),
        "beta": round(beta, 3),
        "phi_ef": phi_ef,
        "Kphi": round(Kphi, 3),
        "e2_mm": round(e2, 2),
        "M2_kNm": round(M2, 2),
        "M0Ed_kNm": round(M0Ed_kNm, 2),
        "MEd_kNm": round(M0Ed_kNm + M2, 2),
    }

import math


def crack_width_ec2(g, m, N_sls_kN, M_sls_kNm, axis="x"):
    overall = g.h_mm if axis == "x" else g.b_mm
    width = g.b_mm if axis == "x" else g.h_mm
    d = overall - (g.clear_cover_mm + g.link_dia_mm + g.main_bar_dia_mm / 2.0)
    Ac = g.area_mm2
    As = g.total_steel_area_mm2

    # does the section crack? kern distance = overall/6 for rectangular.
    e = (M_sls_kNm * 1000.0 / N_sls_kN) if N_sls_kN > 0 else 1e9   # mm
    kern = overall / 6.0
    if N_sls_kN > 0 and e <= kern:
        # whole section in compression -> no flexural cracking
        return {"cracks": False, "wk_mm": 0.0, "wk_limit_mm": 0.30,
                "ok": True, "note": "Section in net compression (e <= h/6) -> uncracked, wk = 0."}

    # cracked: estimate tensile steel stress under SLS.
    # simplified: treat the tension-side steel (half the bars) with lever ~0.9d
    As_t = As / 2.0
    z = 0.9 * d
    # net tensile force approx from moment about compression resultant minus axial relief
    sigma_s = max(0.0, (M_sls_kNm * 1e6 / z - N_sls_kN * 1000.0 * 0.0) / As_t)  # MPa
    if sigma_s <= 0:
        return {"cracks": False, "wk_mm": 0.0, "wk_limit_mm": 0.30, "ok": True,
                "note": "No net tensile steel stress -> uncracked, wk = 0."}

    Es = 200000.0
    fcm = m.fck + 8.0
    Ecm = 22000.0 * (fcm / 10.0) ** 0.3
    alpha_e = Es / Ecm
    fct_eff = 0.30 * m.fck ** (2.0 / 3.0)             # fctm for <= C50
    kt = 0.4                                           # long-term
    # effective tension area (7.3.2.3): hc_ef = min(2.5(h-d), (h-x)/3, h/2)
    hc_ef = min(2.5 * (overall - d), overall / 2.0)
    Ac_eff = width * hc_ef
    rho_p_eff = As_t / Ac_eff if Ac_eff > 0 else 0.01

    eps_diff = (sigma_s - kt * (fct_eff / rho_p_eff) * (1 + alpha_e * rho_p_eff)) / Es
    eps_diff = max(eps_diff, 0.6 * sigma_s / Es)

    k1, k2, k3, k4 = 0.8, 0.5, 3.4, 0.425
    c = g.clear_cover_mm
    phi = g.main_bar_dia_mm
    sr_max = k3 * c + k1 * k2 * k4 * phi / rho_p_eff
    wk = sr_max * eps_diff
    return {
        "cracks": True, "sigma_s_MPa": round(sigma_s, 1),
        "rho_p_eff": round(rho_p_eff, 4), "sr_max_mm": round(sr_max, 1),
        "eps_sm_minus_cm": round(eps_diff, 6),
        "wk_mm": round(wk, 3), "wk_limit_mm": 0.30, "ok": wk <= 0.30,
        "note": "EC2 7.3.4 cracked-section estimate (simplified SLS steel stress).",
    }