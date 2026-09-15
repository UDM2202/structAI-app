# backend/services/column_service.py
"""
Maps ColumnDesignRequest onto the validated column_engine and returns a
ColumnDesignResult.

The service holds no design logic of its own. This is deliberate: the
one-way slab and simply-supported beam both went wrong by growing a second,
divergent copy of the calculation inside their service layer. Everything
structural lives in column_engine.py; this module only translates shapes.
"""

from engine.column_engine import (
    Beam as EngBeam,
    ColumnEngine,
    ColumnInput as EngInput,
    FloorTemplate as EngFloor,
    Wall as EngWall,
)
from models.column_schemas import (
    ColBeam,
    ColFloorTemplate,
    ColumnDesignRequest,
    ColumnDesignResult,
)


def _wall(w) -> EngWall:
    return EngWall(
        present=w.present,
        thickness_m=w.thickness_m,
        density_kN_per_m3=w.density_kN_per_m3,
        opening_ratio=w.opening_ratio,
    )


def _beam(b: ColBeam) -> EngBeam:
    return EngBeam(width_m=b.width_m, depth_m=b.depth_m, wall=_wall(b.wall))


def _floor(f: ColFloorTemplate) -> EngFloor:
    return EngFloor(
        building_use=f.building_use,
        slab_thickness_m=f.slab_thickness_m,
        finishes_kN_per_m2=f.finishes_kN_per_m2,
        services_kN_per_m2=f.services_kN_per_m2,
        partitions_kN_per_m2=f.partitions_kN_per_m2,
        beam_x=_beam(f.beam_x),
        beam_y=_beam(f.beam_y),
        imposed_override_kN_per_m2=f.imposed_override_kN_per_m2,
    )


def to_engine_input(req: ColumnDesignRequest) -> EngInput:
    g, rf, m, du, fa = (
        req.geometry, req.reinforcement, req.materials, req.durability, req.factors
    )
    el, an = req.effective_length, req.analysis

    # Only forward the fields the chosen method actually uses, so a value
    # left behind by a previous method cannot take precedence in the engine.
    use_k = el.method.value == "k_factors"
    use_direct = el.method.value == "direct"

    return EngInput(
        column_id=req.column_id,
        column_type=req.column_type.value,
        design_code=req.design_code.value if hasattr(req.design_code, "value") else str(req.design_code),
        b_mm=g.b_mm,
        h_mm=g.h_mm,
        storey_height_m=g.storey_height_m,
        clear_height_m=el.clear_height_m,
        end_condition=req.end_condition.value,
        braced=req.braced,
        k1_x=el.k1_x if use_k else None,
        k2_x=el.k2_x if use_k else None,
        k1_y=el.k1_y if use_k else None,
        k2_y=el.k2_y if use_k else None,
        l0_override_x_mm=el.l0_x_mm if use_direct else None,
        l0_override_y_mm=el.l0_y_mm if use_direct else None,
        main_bar_dia_mm=rf.main_bar_dia_mm,
        n_bars_total=rf.n_bars_total,
        n_bars_b_face=rf.n_bars_b_face,
        n_bars_h_face=rf.n_bars_h_face,
        link_dia_mm=rf.link_dia_mm,
        exposure_class=du.exposure_class,
        delta_c_dev_mm=du.delta_c_dev_mm,
        clear_cover_override_mm=du.clear_cover_override_mm,
        concrete_grade=m.concrete_grade,
        steel_grade=m.steel_grade,
        concrete_density_kN_per_m3=m.concrete_density_kN_per_m3,
        masonry_density_kN_per_m3=m.masonry_density_kN_per_m3,
        gamma_G=fa.gamma_G,
        gamma_Q=fa.gamma_Q,
        gamma_c=fa.gamma_c,
        gamma_s=fa.gamma_s,
        alpha_cc=fa.alpha_cc,
        left_x_m=g.left_x_m,
        right_x_m=g.right_x_m,
        top_y_m=g.top_y_m,
        bottom_y_m=g.bottom_y_m,
        number_of_typical_floors=req.number_of_typical_floors,
        typical_floor=_floor(req.typical_floor),
        roof_floor=_floor(req.roof_floor),
        M01x_kNm=dict(req.M01x_kNm),
        M02x_kNm=dict(req.M02x_kNm),
        M01y_kNm=dict(req.M01y_kNm),
        M02y_kNm=dict(req.M02y_kNm),
        include_min_eccentricity=an.include_min_eccentricity,
        include_geometric_imperfections=an.include_geometric_imperfections,
        effective_creep_ratio=an.effective_creep_ratio,
        use_default_A_B=an.use_default_A_B,
        NEd_override_kN=req.NEd_override_kN,
        MEdx_override_kNm=req.MEdx_override_kNm,
        MEdy_override_kNm=req.MEdy_override_kNm,
    )


def design_column(req: ColumnDesignRequest) -> ColumnDesignResult:
    engine = ColumnEngine(to_engine_input(req))
    raw = engine.run()
    # The engine emits 'lambda' and 'pass' keys, both Python reserved
    # words. The response models alias them, so the raw payload validates
    # unchanged and FastAPI serialises it back out under the alias.
    return ColumnDesignResult.model_validate(raw)


# Alias: routers/column.py imports this name. Both refer to the same function,
# so either import works and neither is a second code path.
calculate_column_design = design_column