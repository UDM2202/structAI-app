# backend/models/column_schemas.py
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from models.schemas import DesignCode


# ============================================================
# ENUMS
# ============================================================

class ColumnType(str, Enum):
    AXIAL = "axial"
    UNIAXIAL = "uniaxial"
    BIAXIAL = "biaxial"


class EffectiveLengthMethod(str, Enum):
    IDEALISED = "idealised"      # K from the end condition
    K_FACTORS = "k_factors"      # EC2 Eq. 5.15 / 5.16 joint flexibilities
    DIRECT = "direct"            # l0 entered per axis


class EndCondition(str, Enum):
    FIXED_FIXED = "fixed-fixed"
    FIXED_PINNED = "fixed-pinned"
    PINNED_PINNED = "pinned-pinned"
    FIXED_FREE = "fixed-free"


VALID_EXPOSURE = {
    "X0", "XC1", "XC2", "XC3", "XC4",
    "XD1", "XD2", "XD3", "XS1", "XS2", "XS3",
}

VALID_CONCRETE = {
    "C12/15", "C16/20", "C20/25", "C25/30", "C30/37", "C35/45", "C40/50",
    "C45/55", "C50/60", "C55/67", "C60/75", "C70/85", "C80/95", "C90/105",
}

VALID_STEEL = {"B500", "B460"}

VALID_BUILDING_USE = {
    "residential", "office", "corridor", "stairs", "retail", "shopping_mall",
    "assembly_fixed_seating", "assembly_movable_seating", "assembly_concert_hall",
    "assembly_dance_floor", "storage_light", "storage_heavy", "warehouse_general",
    "warehouse_heavy", "parking_cars", "parking_trucks", "hospital_ward",
    "hospital_operating_room", "school_classroom", "library_reading",
    "library_stack", "gymnasium", "roof_access", "roof_no_access",
    "balcony", "plant_room",
}


# ============================================================
# REQUEST
# ============================================================

class ColWall(BaseModel):
    present: bool = False
    thickness_m: float = Field(0.15, ge=0)
    density_kN_per_m3: Optional[float] = Field(None, gt=0)
    opening_ratio: float = Field(0.0, ge=0, le=0.9)


class ColBeam(BaseModel):
    """
    The PAIR of beams framing into the column in one direction.

    There is no span field on purpose. Spans come from the tributary
    geometry (left_x_m/right_x_m for the x pair, top_y_m/bottom_y_m for
    the y pair), so a span here could contradict them.
    """
    width_m: float = Field(0.23, gt=0)
    depth_m: float = Field(0.45, gt=0)
    wall: ColWall = ColWall()


class ColFloorTemplate(BaseModel):
    building_use: str = "office"
    slab_thickness_m: float = Field(0.150, gt=0)
    finishes_kN_per_m2: float = Field(1.0, ge=0)
    services_kN_per_m2: float = Field(0.5, ge=0)
    partitions_kN_per_m2: float = Field(1.0, ge=0)
    beam_x: ColBeam = ColBeam()
    beam_y: ColBeam = ColBeam()
    imposed_override_kN_per_m2: Optional[float] = Field(None, ge=0)

    @field_validator("building_use")
    @classmethod
    def _use_known(cls, v: str) -> str:
        key = (v or "").strip().lower()
        if key not in VALID_BUILDING_USE:
            raise ValueError(
                f"Unsupported building use '{v}'. Expected one of: "
                + ", ".join(sorted(VALID_BUILDING_USE))
            )
        return key


class ColGeometry(BaseModel):
    b_mm: float = Field(230.0, gt=0, description="Section width, x direction")
    h_mm: float = Field(460.0, gt=0, description="Section depth, y direction")
    storey_height_m: float = Field(3.0, gt=0)
    clear_height_m: Optional[float] = Field(
        None, gt=0,
        description="Clear height between restraints. Defaults to storey_height_m.",
    )

    left_x_m: float = Field(4.0, ge=0)
    right_x_m: float = Field(5.0, ge=0)
    top_y_m: float = Field(3.5, ge=0)
    bottom_y_m: float = Field(3.5, ge=0)


class ColEffectiveLength(BaseModel):
    """
    Effective length, in order of precedence:
        1. l0_override_*_mm  — a value computed elsewhere
        2. k1/k2             — EC2 Cl. 5.8.3.2 Eq. 5.15 (braced) / 5.16
        3. neither           — idealised K from end_condition

    The k-factor route matters for real frame columns: the same clear height
    gives a different l0 about each axis because the restraining beams differ.
    """
    l0_override_x_mm: Optional[float] = Field(None, gt=0)
    l0_override_y_mm: Optional[float] = Field(None, gt=0)
    k1_x: Optional[float] = Field(None, ge=0)
    k2_x: Optional[float] = Field(None, ge=0)
    k1_y: Optional[float] = Field(None, ge=0)
    k2_y: Optional[float] = Field(None, ge=0)

    @model_validator(mode="after")
    def _k_pairs_complete(self):
        for a, b, axis in ((self.k1_x, self.k2_x, "x"), (self.k1_y, self.k2_y, "y")):
            if (a is None) != (b is None):
                raise ValueError(
                    f"Give both k1_{axis} and k2_{axis}, or neither. A single "
                    f"joint flexibility is not enough to evaluate Eq. 5.15."
                )
        return self


class ColReinforcement(BaseModel):
    # Frontend sends the preferred diameter first; the engine respects the
    # given order and must not sort it.
    main_bar_dia_mm: float = Field(16.0, gt=0)
    n_bars_total: int = Field(8, ge=4)
    n_bars_b_face: Optional[int] = Field(None, ge=2)
    n_bars_h_face: Optional[int] = Field(None, ge=2)
    link_dia_mm: float = Field(8.0, gt=0)

    @field_validator("main_bar_dia_mm")
    @classmethod
    def _bar_min(cls, v: float) -> float:
        if v < 12.0:
            raise ValueError(
                "Main bar diameter must be at least 12 mm for columns "
                "(EN 1992-1-1 Cl. 9.5.2(1) with the UK National Annex)."
            )
        return v

    @model_validator(mode="after")
    def _faces_consistent(self):
        if (self.n_bars_b_face is None) != (self.n_bars_h_face is None):
            raise ValueError(
                "Specify both n_bars_b_face and n_bars_h_face, or neither "
                "(leave both blank to let the engine distribute the bars)."
            )
        return self


class ColEffectiveLength(BaseModel):
    """
    How l0 is obtained. An explicit method rather than silent precedence:
    a stale k-factor left over from a previous method should not quietly
    override the value the user thinks is being used.
    """
    method: EffectiveLengthMethod = EffectiveLengthMethod.IDEALISED
    clear_height_m: Optional[float] = Field(
        None, gt=0, description="Clear height between restraints; defaults to storey height"
    )
    k1_x: Optional[float] = Field(None, ge=0)
    k2_x: Optional[float] = Field(None, ge=0)
    k1_y: Optional[float] = Field(None, ge=0)
    k2_y: Optional[float] = Field(None, ge=0)
    l0_x_mm: Optional[float] = Field(None, gt=0)
    l0_y_mm: Optional[float] = Field(None, gt=0)

    @model_validator(mode="after")
    def _method_complete(self):
        if self.method == EffectiveLengthMethod.K_FACTORS:
            missing = [n for n in ("k1_x", "k2_x", "k1_y", "k2_y")
                       if getattr(self, n) is None]
            if missing:
                raise ValueError(
                    "The k-factor method needs all four joint flexibilities. "
                    f"Missing: {', '.join(missing)}. EN 1992-1-1 Cl. 5.8.3.2 "
                    "treats k = 0 as theoretical only, so values below 0.1 are "
                    "raised to 0.1."
                )
        if self.method == EffectiveLengthMethod.DIRECT:
            missing = [n for n in ("l0_x_mm", "l0_y_mm") if getattr(self, n) is None]
            if missing:
                raise ValueError(
                    "Entering l0 directly needs a value for both axes. "
                    f"Missing: {', '.join(missing)}."
                )
        return self


class ColAnalysisOptions(BaseModel):
    include_min_eccentricity: bool = True
    include_geometric_imperfections: bool = True
    effective_creep_ratio: float = Field(2.0, ge=0, le=6.0)
    use_default_A_B: bool = Field(
        True,
        description=(
            "EN 1992-1-1 Cl. 5.8.3.1. True uses the code defaults A = 0.7 and "
            "B = 1.1. False computes them from the creep ratio and the provided "
            "steel, which raises lambda_lim and is less conservative."
        ),
    )


class ColMaterials(BaseModel):
    concrete_grade: str = "C30/37"
    steel_grade: str = "B500"
    concrete_density_kN_per_m3: float = Field(25.0, gt=0)
    masonry_density_kN_per_m3: float = Field(20.0, gt=0)

    @field_validator("concrete_grade")
    @classmethod
    def _conc(cls, v: str) -> str:
        if v not in VALID_CONCRETE:
            raise ValueError(f"Unsupported concrete grade '{v}'.")
        return v

    @field_validator("steel_grade")
    @classmethod
    def _steel(cls, v: str) -> str:
        if v not in VALID_STEEL:
            raise ValueError(f"Unsupported steel grade '{v}'.")
        return v


class ColDurability(BaseModel):
    exposure_class: str = "XC1"
    delta_c_dev_mm: float = Field(10.0, ge=0)
    clear_cover_override_mm: Optional[float] = Field(None, gt=0)

    @field_validator("exposure_class")
    @classmethod
    def _exposure(cls, v: str) -> str:
        key = (v or "").strip().upper()
        if key not in VALID_EXPOSURE:
            raise ValueError(
                f"Unsupported exposure class '{v}'. Expected one of: "
                + ", ".join(sorted(VALID_EXPOSURE))
            )
        return key


class ColPartialFactors(BaseModel):
    gamma_G: float = Field(1.35, gt=0)
    gamma_Q: float = Field(1.50, gt=0)
    gamma_c: float = Field(1.50, gt=0)
    gamma_s: float = Field(1.15, gt=0)
    alpha_cc: float = Field(0.85, gt=0, le=1.0)


class ColumnDesignRequest(BaseModel):
    column_id: str = "C1"
    column_type: ColumnType = ColumnType.BIAXIAL
    design_code: DesignCode = DesignCode.EC2

    end_condition: EndCondition = EndCondition.FIXED_FIXED
    braced: bool = True

    geometry: ColGeometry = ColGeometry()
    effective_length: ColEffectiveLength = ColEffectiveLength()
    analysis: ColAnalysisOptions = ColAnalysisOptions()
    reinforcement: ColReinforcement = ColReinforcement()
    materials: ColMaterials = ColMaterials()
    durability: ColDurability = ColDurability()
    factors: ColPartialFactors = ColPartialFactors()

    number_of_typical_floors: int = Field(3, ge=0, le=60)
    typical_floor: ColFloorTemplate = ColFloorTemplate()
    roof_floor: ColFloorTemplate = ColFloorTemplate(
        building_use="roof_no_access",
        finishes_kN_per_m2=0.75,
        services_kN_per_m2=0.25,
        partitions_kN_per_m2=0.0,
        beam_x=ColBeam(wall=ColWall(present=False)),
        beam_y=ColBeam(wall=ColWall(present=False)),
    )

    M01x_kNm: Dict[str, float] = Field(default_factory=dict)
    M02x_kNm: Dict[str, float] = Field(default_factory=dict)
    M01y_kNm: Dict[str, float] = Field(default_factory=dict)
    M02y_kNm: Dict[str, float] = Field(default_factory=dict)

    # Bypass the take-down and design from frame-analysis output directly.
    NEd_override_kN: Optional[float] = Field(None, gt=0)
    MEdx_override_kNm: Optional[float] = Field(None, ge=0)
    MEdy_override_kNm: Optional[float] = Field(None, ge=0)

    # ---------- cross-field validation ----------
    @model_validator(mode="after")
    def _bars_fit_in_section(self):
        """
        EN 1992-1-1 Cl. 8.2: clear horizontal spacing between bars must be at
        least max(bar diameter, 20 mm). Reject layouts that cannot physically
        be built rather than producing a design for an impossible cage.
        """
        geo, rf, dur = self.geometry, self.reinforcement, self.durability

        cover = dur.clear_cover_override_mm
        if cover is None:
            cover = 45.0  # upper-bound placeholder; engine derives the real value
        edge = cover + rf.link_dia_mm
        s_min = max(rf.main_bar_dia_mm, 20.0)

        n_b, n_h = rf.n_bars_b_face, rf.n_bars_h_face
        if n_b is None or n_h is None:
            total = rf.n_bars_total + (rf.n_bars_total % 2)
            s = total // 2 + 2
            n_h = max(2, min(s - 2, round(s * geo.h_mm / (geo.b_mm + geo.h_mm))))
            n_b = s - n_h

        for n, dim, label in ((n_b, geo.b_mm, "width b"), (n_h, geo.h_mm, "depth h")):
            if n < 2:
                continue
            needed = 2 * edge + n * rf.main_bar_dia_mm + (n - 1) * s_min
            if needed > dim:
                raise ValueError(
                    f"{n} bars of {rf.main_bar_dia_mm:.0f} mm will not fit across the "
                    f"{label} of {dim:.0f} mm. Minimum required is {needed:.0f} mm "
                    f"allowing cover, links and {s_min:.0f} mm clear spacing "
                    f"(EN 1992-1-1 Cl. 8.2). Increase the section, reduce the bar "
                    f"count, or use a smaller diameter."
                )
        return self

    @model_validator(mode="after")
    def _tributary_present(self):
        if self.NEd_override_kN is not None:
            return self
        g = self.geometry
        if (g.left_x_m + g.right_x_m) <= 0 or (g.top_y_m + g.bottom_y_m) <= 0:
            raise ValueError(
                "Tributary spans must be greater than zero in both directions "
                "when the load take-down is used. Supply NEd_override_kN "
                "instead if you already have the axial load."
            )
        return self

    @model_validator(mode="after")
    def _moments_match_route(self):
        if self.column_type == ColumnType.AXIAL:
            return self
        if self.column_type in (ColumnType.UNIAXIAL, ColumnType.BIAXIAL):
            has_x = bool(self.M02x_kNm) or self.MEdx_override_kNm is not None
            if not has_x:
                raise ValueError(
                    "A uniaxial or biaxial column needs first order moments about "
                    "x. Supply M02x_kNm per level, or MEdx_override_kNm, or switch "
                    "the column type to 'axial' for a minimum-eccentricity design."
                )
        if self.column_type == ColumnType.BIAXIAL:
            has_y = bool(self.M02y_kNm) or self.MEdy_override_kNm is not None
            if not has_y:
                raise ValueError(
                    "A biaxial column needs first order moments about y. Supply "
                    "M02y_kNm per level, or MEdy_override_kNm, or switch the "
                    "column type to 'uniaxial'."
                )
        return self


# ============================================================
# RESPONSE
# ============================================================

class ReportRow(BaseModel):
    reference: str
    calculation: str
    output: str


class ReportSection(BaseModel):
    title: str
    rows: List[ReportRow]


class ColSecondOrder(BaseModel):
    omega: float
    n: float
    n_u: float
    Kr: float
    beta: float
    Kphi: float
    d_eff: float
    inv_r0: float
    inv_r: float
    e2_mm: float
    M2_kNm: float


class ColAxisResult(BaseModel):
    lambda_: float = Field(..., alias="lambda")
    lambda_lim: float
    slender: bool
    l0_mm: float
    l0_source: str
    M01: float
    M02: float
    M0e: float
    ei_mm: float
    M_imp: float
    M_end: float
    M_eq: float
    M_min: float
    M_first: float
    M2: float
    MEd: float
    MRd: float
    second_order: ColSecondOrder
    utilisation: float

    model_config = {"populate_by_name": True}


class ColBiaxial(BaseModel):
    a: float
    N_ratio: float
    interaction: float


class ColCheck(BaseModel):
    name: str
    passed: bool = Field(..., alias="pass")

    model_config = {"populate_by_name": True}


class ColLevelResult(BaseModel):
    level: str
    NEd_kN: float
    x: ColAxisResult
    y: ColAxisResult
    NRd_max_kN: float
    NRd_simplified_kN: float
    axial_utilisation: float
    biaxial: Optional[ColBiaxial] = None
    governing_utilisation: float
    As_min: float
    As_min_basis_1: float
    As_min_basis_2: float
    checks: List[ColCheck]
    status: str


class ColSummary(BaseModel):
    column_id: str
    column_type: str
    design_code: str
    b_mm: float
    h_mm: float
    storey_height_m: float
    end_condition: str
    braced: bool
    concrete_grade: str
    steel_grade: str
    exposure_class: str
    cover_mm: float
    n_bars: int
    bar_dia_mm: float
    link_dia_mm: float
    As_provided_mm2: float
    critical_level: str
    NEd_critical_kN: float
    used_takedown: bool
    status: str


class ColMaterialsOut(BaseModel):
    fck: float
    fcd: float
    fyk: float
    fyd: float
    eps_cu3: float
    eps_c3: float
    lambda_block: float
    eta_block: float


class ColInteractionPoint(BaseModel):
    N_kN: float
    M_kNm: float
    x_mm: float


class ColDetailing(BaseModel):
    phi_t_min_mm: float
    link_dia_mm: float
    s_max_mm: float
    s_reduced_mm: float
    As_provided_mm2: float
    As_min_mm2: float
    As_min_basis_1_mm2: float
    As_min_basis_2_mm2: float
    As_max_mm2: float
    rho_pct: float
    n_bars_b_face: int
    n_bars_h_face: int
    d_prime_mm: float
    Ac_mm2: float


class ColumnDesignResult(BaseModel):
    summary: ColSummary
    materials: ColMaterialsOut
    axial_by_level: Dict[str, float]
    levels: List[ColLevelResult]
    detailing: ColDetailing
    interaction_x: List[ColInteractionPoint]
    interaction_y: List[ColInteractionPoint]
    failed_checks: List[str]
    report: List[ReportSection]