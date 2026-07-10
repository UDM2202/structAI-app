# ============================================================================
# backend/models/column_schemas.py
# ============================================================================
from pydantic import BaseModel, Field
from typing import Dict, Optional


class BeamIn(BaseModel):
    width_m: float = 0.23
    depth_m: float = 0.45
    span_m: float = 4.0
    wall_present: bool = False
    wall_thickness_m: float = 0.15
    wall_opening_ratio: float = 0.0


class FloorIn(BaseModel):
    building_use: str = "office"
    slab_thickness_m: float = 0.15
    finishes_kN_per_m2: float = 1.0
    services_kN_per_m2: float = 0.5
    partitions_kN_per_m2: float = 1.0
    imposed_override_kN_per_m2: Optional[float] = None
    beam_x: BeamIn = Field(default_factory=BeamIn)
    beam_y: BeamIn = Field(default_factory=BeamIn)


class ColumnDesignRequest(BaseModel):
    column_id: str = "C1"
    column_type: str = "axial"            # axial | uniaxial | biaxial
    end_condition: str = "fixed-fixed"    # fixed-fixed | fixed-pinned | pinned-pinned | fixed-free
    braced: bool = True
    exposure_class: str = "XC1"

    auto_select: bool = False
    b_mm: float = Field(300.0, gt=0)
    h_mm: float = Field(500.0, gt=0)
    clear_cover_mm: float = 40.0
    link_dia_mm: float = 8.0
    main_bar_dia_mm: float = 20.0
    n_bars_total: int = Field(8, ge=4)
    storey_height_m: float = 3.0

    left_x_m: float = 4.0
    right_x_m: float = 5.0
    top_y_m: float = 3.5
    bottom_y_m: float = 3.5

    concrete_grade: str = "C30/37"
    steel_grade: str = "B500"
    concrete_density_kN_per_m3: float = 25.0
    masonry_density_kN_per_m3: float = 20.0

    number_of_typical_floors: int = Field(3, ge=1)
    typical_floor: FloorIn = Field(default_factory=FloorIn)
    roof_floor: FloorIn = Field(default_factory=FloorIn)

    include_min_eccentricity: bool = True

    M01_kNm: Dict[str, float] = Field(default_factory=dict)
    M02_kNm: Dict[str, float] = Field(default_factory=dict)
    M01y_kNm: Dict[str, float] = Field(default_factory=dict)
    M02y_kNm: Dict[str, float] = Field(default_factory=dict)
    Mx_override_kNm: Dict[str, float] = Field(default_factory=dict)
    My_override_kNm: Dict[str, float] = Field(default_factory=dict)


# ============================================================================
# backend/services/column_service.py
# ============================================================================
def calculate_column_design(request):
    from engine.column_engine import (
        Material, Geometry, Beam, Wall, FloorTemplate, BuildingInput, DesignInput,
        ColumnType, EndCondition, DesignCode, design_column, nominal_cover_mm,
    )

    _TYPE = {"axial": ColumnType.AXIAL, "uniaxial": ColumnType.UNIAXIAL, "biaxial": ColumnType.BIAXIAL}
    _END = {
        "fixed-fixed": EndCondition.FIXED_FIXED, "fixed-pinned": EndCondition.FIXED_PINNED,
        "pinned-pinned": EndCondition.PINNED_PINNED, "fixed-free": EndCondition.FIXED_FREE,
    }

    def _beam(b):
        return Beam(width_m=b.width_m, depth_m=b.depth_m, span_m=b.span_m,
                    wall=Wall(present=b.wall_present, thickness_m=b.wall_thickness_m,
                              opening_ratio=b.wall_opening_ratio))

    def _floor(f):
        return FloorTemplate(
            building_use=f.building_use, slab_thickness_m=f.slab_thickness_m,
            finishes_kN_per_m2=f.finishes_kN_per_m2, services_kN_per_m2=f.services_kN_per_m2,
            partitions_kN_per_m2=f.partitions_kN_per_m2, beam_x=_beam(f.beam_x),
            beam_y=_beam(f.beam_y), imposed_override_kN_per_m2=f.imposed_override_kN_per_m2)

    material = Material(
        design_code=DesignCode.EUROCODE_2, concrete_grade=request.concrete_grade,
        steel_grade=request.steel_grade,
        concrete_density_kN_per_m3=request.concrete_density_kN_per_m3,
        masonry_density_kN_per_m3=request.masonry_density_kN_per_m3)

    cover = request.clear_cover_mm or nominal_cover_mm(request.exposure_class, request.link_dia_mm)
    geometry = Geometry(
        column_id=request.column_id, b_mm=request.b_mm, h_mm=request.h_mm,
        clear_cover_mm=cover, link_dia_mm=request.link_dia_mm,
        main_bar_dia_mm=request.main_bar_dia_mm, n_bars_total=request.n_bars_total,
        storey_height_m=request.storey_height_m, left_x_m=request.left_x_m,
        right_x_m=request.right_x_m, top_y_m=request.top_y_m, bottom_y_m=request.bottom_y_m)

    building = BuildingInput(
        number_of_typical_floors=request.number_of_typical_floors,
        typical_floor=_floor(request.typical_floor), roof_floor=_floor(request.roof_floor))

    design = DesignInput(
        column_type=_TYPE.get(request.column_type, ColumnType.AXIAL),
        end_condition=_END.get(request.end_condition, EndCondition.FIXED_FIXED),
        braced=request.braced, include_min_eccentricity=request.include_min_eccentricity,
        exposure_class=request.exposure_class, auto_select=request.auto_select,
        M01_kNm=request.M01_kNm, M02_kNm=request.M02_kNm,
        M01y_kNm=request.M01y_kNm, M02y_kNm=request.M02y_kNm,
        Mx_override_kNm=request.Mx_override_kNm, My_override_kNm=request.My_override_kNm)

    return design_column(material, geometry, building, design)


# ============================================================================
# backend/routers/column.py
# ============================================================================
# from fastapi import APIRouter, HTTPException
# from models.column_schemas import ColumnDesignRequest
# from services.column_service import calculate_column_design
#
# router = APIRouter()
#
# @router.post("/design/sync")
# async def design_column_sync(request: ColumnDesignRequest):
#     try:
#         return calculate_column_design(request)
#     except ValueError as e:
#         raise HTTPException(status_code=422, detail=str(e))
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Column design failed: {e}")