from pydantic import BaseModel, Field
from typing import List, Optional


class PadFoundationRequest(BaseModel):
    axial_load_kN: float = Field(233.647, gt=0)
    moment_x_kNm: float = 0.0
    moment_y_kNm: float = 0.0
    footing_length_mm: float = Field(1500, gt=0)
    footing_width_mm: float = Field(1500, gt=0)
    footing_depth_mm: float = Field(450, gt=0)
    column_x_mm: float = Field(300, gt=0)
    column_y_mm: float = Field(300, gt=0)
    concrete_grade_fck: float = 25
    steel_grade_fyk: float = 500
    allowable_bearing_kN_m2: float = Field(100, gt=0)
    cover_mm: float = 75
    bar_dia_mm: float = 12
    gamma_c: float = 1.5
    gamma_s: float = 1.15


class ColumnLoadIn(BaseModel):
    P_kN: float = Field(..., gt=0)
    x_m: float = Field(..., ge=0)
    Mx_kNm: float = 0.0
    My_kNm: float = 0.0
    label: str = "C"


class CombinedFootingRequest(BaseModel):
    columns: List[ColumnLoadIn] = Field(..., min_length=2, max_length=3)
    footing_length_m: float = Field(1.870, gt=0)
    footing_width_m: float = Field(0.550, gt=0)
    footing_depth_mm: float = Field(400, gt=0)
    column_x_mm: float = Field(300, gt=0)
    column_y_mm: float = Field(300, gt=0)
    concrete_grade_fck: float = 25
    steel_grade_fyk: float = 500
    allowable_bearing_kN_m2: float = Field(100, gt=0)
    cover_mm: float = 50
    bar_dia_mm: float = 12
    gamma_c: float = 1.5
    gamma_s: float = 1.15