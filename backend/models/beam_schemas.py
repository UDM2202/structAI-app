# backend/models/beam_schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum
from models.schemas import DesignCode  # reuse EC2 / BS8110 / ACI318

class BeamSupport(str, Enum):
    BOTH_SIMPLE = "both_ends_simply_supported"
    BOTH_FIXED = "both_ends_fixed"
    ONE_FIXED_ONE_SIMPLE = "one_fixed_one_simple"
    CANTILEVER = "one_fixed_one_free"

class BeamTopRestraint(str, Enum):
    CONTINUOUS = "continuous"
    ONE_END_DISCONTINUOUS = "one_end_discontinuous"
    BOTH_ENDS_DISCONTINUOUS = "both_ends_discontinuous"

# ---------- request ----------
class BeamGeometry(BaseModel):
    span: float = Field(..., gt=0, description="mm")
    width: float = Field(..., gt=0, description="mm")
    depth: float = Field(..., gt=0, description="mm")
    effective_cover: float = Field(25, gt=0, description="mm")

class BeamMaterials(BaseModel):
    concrete_grade: str = "C25/30"
    steel_grade: str = "B500"
    unit_weight_concrete: float = 25.0
    unit_weight_steel: float = 78.5

class BeamLoads(BaseModel):
    self_weight_auto: bool = True
    wall_load: float = Field(0, ge=0, description="kN/m")
    finishes: float = Field(0, ge=0, description="kN/m")
    additional_dead_load: float = Field(0, ge=0, description="kN/m")
    live_load: float = Field(0, ge=0, description="kN/m")
    other_live_load: float = Field(0, ge=0, description="kN/m")

class BeamDesignRequest(BaseModel):
    beam_id: str = "B1"
    design_code: DesignCode = DesignCode.EC2
    support_condition: BeamSupport = BeamSupport.BOTH_SIMPLE
    top_restraint: BeamTopRestraint = BeamTopRestraint.CONTINUOUS
    geometry: BeamGeometry
    materials: BeamMaterials
    loads: BeamLoads
    bar_diameters: Optional[List[int]] = Field([16, 20, 25, 32])
    link_diameter: int = 8
    region: str = "Nigeria"

# ---------- response ----------
class BeamForces(BaseModel):
    design_udl: float        # kN/m
    max_moment: float        # kNm
    max_shear: float         # kN
    ultimate_combo: str

class BeamCapacity(BaseModel):
    moment_resistance: float     # kNm
    shear_resistance: float      # kN
    utilization_bending: float
    utilization_shear: float

class BeamReinforcement(BaseModel):
    tension: Dict       # {count, bar_diameter, area_required, area_provided, label}
    compression: Dict
    stirrups: Dict      # {bar_diameter, spacing, legs, label}
    cover: float

class BeamSLS(BaseModel):
    deflection_actual: float
    deflection_limit: float
    deflection_status: str
    crack_width: float
    crack_limit: float
    crack_status: str

class BeamLoadSummary(BaseModel):
    components: List[Dict]   # [{name, kind(DL/LL), value}]
    total_dead: float
    total_live: float
    total_service: float

class BeamMaterialsOut(BaseModel):
    fck: float
    fcd: float
    fyk: float
    fyd: float
    modular_ratio: float
    unit_weight_concrete: float

class BeamSummary(BaseModel):
    beam_id: str
    support_condition: str
    top_restraint: str
    span: float
    width: float
    depth: float
    effective_depth: float
    effective_cover: float
    concrete_grade: str
    steel_grade: str
    design_code: str
    analysis: str
    status: str

class BeamDesignResult(BaseModel):
    summary: BeamSummary
    materials: BeamMaterialsOut
    loads: BeamLoadSummary
    forces: BeamForces
    capacity: BeamCapacity
    reinforcement: BeamReinforcement
    sls: BeamSLS
    notes: List[str]