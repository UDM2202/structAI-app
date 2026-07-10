# backend/services/column_service.py

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