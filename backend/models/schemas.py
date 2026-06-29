# backend/models/schemas.py
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Union
from enum import Enum

class SlabType(str, Enum):
    ONE_WAY = "one_way"
    TWO_WAY = "two_way"

class ContinuityCondition(str, Enum):
    ALL_EDGES_CONTINUOUS = "all_edges_continuous"
    ONE_SHORT_DISCONTINUOUS = "one_short_discontinuous"
    ONE_LONG_DISCONTINUOUS = "one_long_discontinuous"
    TWO_ADJACENT_DISCONTINUOUS = "two_adjacent_discontinuous"

class OneWayContinuity(str, Enum):
    SIMPLY_SUPPORTED = "simply_supported"
    ONE_END_CONTINUOUS = "one_end_continuous"
    BOTH_ENDS_CONTINUOUS = "both_ends_continuous"
    CANTILEVER = "cantilever"

class DesignCode(str, Enum):
    EC2 = "EC2"
    BS8110 = "BS8110"
    ACI318 = "ACI318"

class AnalysisMethod(str, Enum):
    LIMIT_STATE = "limit_state"
    WORKING_STRESS = "working_stress"
    ELASTIC = "elastic"

class ExposureClass(str, Enum):
    XC1 = "XC1"
    XC2 = "XC2"
    XC3 = "XC3"
    XC4 = "XC4"

# ============ REQUEST MODELS ============

class GeometryInput(BaseModel):
    span_lx: float = Field(..., gt=0, description="Short span in meters")
    span_ly: float = Field(..., gt=0, description="Long span in meters")
    thickness: float = Field(..., gt=0, description="Slab thickness in mm")
    effective_depth: Optional[float] = Field(None, gt=0, description="Effective depth in mm")
    clear_cover: float = Field(25, gt=0, description="Clear cover in mm")

class MaterialInput(BaseModel):
    concrete_grade: str = Field(..., description="e.g., C30/37")
    steel_grade: str = Field(..., description="e.g., B500")
    unit_weight_concrete: float = Field(25.0, description="kN/m³")
    unit_weight_steel: float = Field(78.5, description="kN/m³")

class LoadInput(BaseModel):
    dead_load: float = Field(0, ge=0, description="Additional dead load in kN/m²")
    floor_finish: float = Field(0, ge=0, description="Floor finish load in kN/m²")
    live_load: float = Field(0, ge=0, description="Live load in kN/m²")
    additional_dead_load: float = Field(0, ge=0, description="Additional dead load in kN/m²")
    additional_live_load: float = Field(0, ge=0, description="Additional live load in kN/m²")

class DesignParameters(BaseModel):
    design_code: DesignCode = DesignCode.EC2
    analysis_method: AnalysisMethod = AnalysisMethod.LIMIT_STATE
    exposure_class: ExposureClass = ExposureClass.XC3
    fire_rating: int = Field(60, description="Fire rating in minutes")
    crack_width_limit: float = Field(0.3, description="Crack width limit in mm")
    deflection_limit: int = Field(250, description="Deflection limit as L/?")

class SlabDesignRequest(BaseModel):
    slab_type: SlabType
    # Accepts either the two-way set or the one-way set; validated against slab_type below.
    continuity: Union[ContinuityCondition, OneWayContinuity]
    geometry: GeometryInput
    materials: MaterialInput
    loads: LoadInput
    design_params: DesignParameters
    bar_diameters: Optional[List[int]] = Field([10, 12, 16], description="Bar diameters to try in mm")
    thickness_options: Optional[List[float]] = Field(None, description="Alternative thicknesses to try in mm")
    use_ai: bool = Field(False, description="Enable AI recommendation")
    region: str = Field("UK", description="Region for cost rates")
    building_use: str = Field("office", description="Occupancy for two-way EC2 engine presets / auto-loads")

    @model_validator(mode="after")
    def check_continuity_matches_type(self):
        one_way_vals = {c.value for c in OneWayContinuity}
        two_way_vals = {c.value for c in ContinuityCondition}
        val = self.continuity.value if hasattr(self.continuity, "value") else self.continuity
        if self.slab_type == SlabType.ONE_WAY and val not in one_way_vals:
            raise ValueError(f"one_way slab requires continuity in {sorted(one_way_vals)}")
        if self.slab_type == SlabType.TWO_WAY and val not in two_way_vals:
            raise ValueError(f"two_way slab requires continuity in {sorted(two_way_vals)}")
        return self

# ============ RESPONSE MODELS ============

class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

class DesignSummary(BaseModel):
    status: str  # PASS, FAIL
    slab_type: str
    continuity: str
    span_lx: float
    span_ly: float
    thickness: float
    effective_depth: float
    concrete_grade: str
    steel_grade: str
    selected_bar_diameter: int
    selected_spacing: int
    total_cost: float
    optimization_rank: int
    utilization_ratio: float

class DesignForces(BaseModel):
    max_sagging_moment: float  # kNm/m
    max_hogging_moment: float  # kNm/m
    max_shear_force: float     # kN/m
    ultimate_load: float       # kN/m²
    service_load: float        # kN/m²

class ReinforcementDetails(BaseModel):
    bottom_steel: Dict
    top_steel: Dict

class DeflectionResult(BaseModel):
    actual_deflection: float
    allowable_deflection: float
    status: str
    ratio: float

class ShearResult(BaseModel):
    design_shear: float
    shear_resistance: float
    status: str
    ratio: float

class ComplianceCheck(BaseModel):
    check: str
    status: str
    ratio: float
    limit: float
    note: Optional[str] = None

class CostBreakdown(BaseModel):
    concrete: Dict
    steel: Dict
    formwork: Dict
    total: float
    total_per_sqm: float

class OptimizationOption(BaseModel):
    rank: int
    thickness: float
    bar_diameter: int
    spacing: int
    cost: float
    status: str
    utilization_ratio: float

class ReportRow(BaseModel):
    reference: str
    calculation: str
    output: str

class ReportSection(BaseModel):
    title: str
    rows: List[ReportRow]

class SlabDesignResult(BaseModel):
    task_id: str
    status: str
    summary: DesignSummary
    design_forces: DesignForces
    reinforcement: ReinforcementDetails
    deflection: DeflectionResult
    shear: ShearResult
    compliance: List[ComplianceCheck]
    cost_breakdown: CostBreakdown
    optimization_options: List[OptimizationOption]
    report: List[ReportSection] = []

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    progress: float = 0
    result: Optional[SlabDesignResult] = None
    error: Optional[str] = None


# ============ CONTINUOUS ONE-WAY SLAB (multi-span) ============

class SupportType(str, Enum):
    PINNED = "pinned"
    FIXED = "fixed"

class ContinuousSlabRequest(BaseModel):
    span_lengths: List[float] = Field(..., min_length=1, description="Span lengths in metres (left to right)")
    start_support: SupportType = SupportType.PINNED
    end_support: SupportType = SupportType.PINNED
    geometry_thickness: float = Field(..., gt=0, description="Slab thickness in mm")
    clear_cover: float = Field(25, gt=0, description="Clear cover in mm")
    materials: MaterialInput
    loads: LoadInput
    design_params: DesignParameters
    bar_diameters: Optional[List[int]] = Field([10, 12, 16])
    region: str = Field("UK")

    @model_validator(mode="after")
    def check_spans(self):
        if any(s <= 0 for s in self.span_lengths):
            raise ValueError("All span lengths must be > 0")
        return self

class SpanDesignOut(BaseModel):
    index: int
    length: float
    max_sagging_moment: float        # kNm/m
    area_required: float
    area_provided: float
    bar_diameter: int
    spacing: int
    status: str

class SupportDesignOut(BaseModel):
    index: int
    position: str
    hogging_moment: float            # kNm/m (magnitude)
    shear: float                     # kN/m (design shear at support)
    area_required: float
    area_provided: float
    bar_diameter: int
    spacing: int
    status: str

class EnvelopeOut(BaseModel):
    max_sagging_moment: float
    max_hogging_moment: float
    max_shear_force: float
    ultimate_load: float
    service_load: float

class DiagramOut(BaseModel):
    x: List[float]                   # metres along beam
    bmd: List[float]                 # kNm/m
    sfd: List[float]                 # kN/m

class ContinuousSlabResult(BaseModel):
    task_id: str
    status: str
    summary: DesignSummary
    envelope: EnvelopeOut
    spans: List[SpanDesignOut]
    supports: List[SupportDesignOut]
    deflection: DeflectionResult
    shear: ShearResult
    compliance: List[ComplianceCheck]
    cost_breakdown: CostBreakdown
    diagram: DiagramOut
    report: List[ReportSection] = []