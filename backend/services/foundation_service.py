def calculate_pad_foundation(request):
    from engine.pad_engine import PadFoundationInput, design_pad_foundation

    inp = PadFoundationInput(
        axial_load_kN=request.axial_load_kN,
        moment_x_kNm=request.moment_x_kNm,
        moment_y_kNm=request.moment_y_kNm,
        footing_length_mm=request.footing_length_mm,
        footing_width_mm=request.footing_width_mm,
        footing_depth_mm=request.footing_depth_mm,
        column_x_mm=request.column_x_mm,
        column_y_mm=request.column_y_mm,
        concrete_grade_fck=request.concrete_grade_fck,
        steel_grade_fyk=request.steel_grade_fyk,
        allowable_bearing_kN_m2=request.allowable_bearing_kN_m2,
        cover_mm=request.cover_mm,
        bar_dia_mm=request.bar_dia_mm,
        gamma_c=request.gamma_c,
        gamma_s=request.gamma_s,
    )
    return design_pad_foundation(inp)

def calculate_combined_footing(request):
    from engine.combined_engine import (
        CombinedFootingInput, ColumnLoad, design_combined_footing,
    )
    cols = [ColumnLoad(P_kN=c.P_kN, x_m=c.x_m, Mx_kNm=c.Mx_kNm, My_kNm=c.My_kNm, label=c.label)
            for c in request.columns]
    inp = CombinedFootingInput(
        columns=cols,
        footing_length_m=request.footing_length_m,
        footing_width_m=request.footing_width_m,
        footing_depth_mm=request.footing_depth_mm,
        column_x_mm=request.column_x_mm,
        column_y_mm=request.column_y_mm,
        fck=request.concrete_grade_fck,
        fyk=request.steel_grade_fyk,
        allowable_bearing_kN_m2=request.allowable_bearing_kN_m2,
        cover_mm=request.cover_mm,
        bar_dia_mm=request.bar_dia_mm,
        gamma_c=request.gamma_c,
        gamma_s=request.gamma_s,
    )
    return design_combined_footing(inp)