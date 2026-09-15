"""
Contract test: the exact JSON body ColumnInput.jsx builds must validate
against ColumnDesignRequest and run through the service.

The payloads below are transcribed by hand from buildRequest() in the JSX,
so a drift between the two shows up here rather than as a 422 in the browser.
"""
import os, sys
if os.path.isdir("pkgtest"):
    sys.path.insert(0, "pkgtest")
from pydantic import ValidationError
from models.column_schemas import ColumnDesignRequest
from services.column_service import design_column

BEAM = {
    "width_m": 0.23, "depth_m": 0.45,
    "wall": {"present": True, "thickness_m": 0.15,
             "density_kN_per_m3": None, "opening_ratio": 0.0},
}
BEAM_NO_WALL = {**BEAM, "wall": {**BEAM["wall"], "present": False}}
TYPICAL = {
    "building_use": "office", "slab_thickness_m": 0.15,
    "finishes_kN_per_m2": 1.0, "services_kN_per_m2": 0.5,
    "partitions_kN_per_m2": 1.0, "imposed_override_kN_per_m2": 3.0,
    "beam_x": BEAM, "beam_y": BEAM,
}
ROOF = {
    "building_use": "roof_no_access", "slab_thickness_m": 0.15,
    "finishes_kN_per_m2": 1.0, "services_kN_per_m2": 0.5,
    "partitions_kN_per_m2": 1.0, "imposed_override_kN_per_m2": 0.75,
    "beam_x": BEAM_NO_WALL, "beam_y": BEAM_NO_WALL,
}


def body(**over):
    b = {
        "column_id": "C1", "column_type": "biaxial", "design_code": "EC2",
        "end_condition": "fixed-fixed", "braced": True,
        "geometry": {"b_mm": 300.0, "h_mm": 500.0, "storey_height_m": 3.5,
                     "left_x_m": 4.0, "right_x_m": 5.0,
                     "top_y_m": 3.5, "bottom_y_m": 3.5},
        "effective_length": {"method": "idealised", "clear_height_m": None},
        "analysis": {"include_min_eccentricity": True,
                     "include_geometric_imperfections": True,
                     "effective_creep_ratio": 2.0, "use_default_A_B": True},
        "reinforcement": {"main_bar_dia_mm": 20.0, "n_bars_total": 8,
                          "n_bars_b_face": None, "n_bars_h_face": None,
                          "link_dia_mm": 8.0},
        "materials": {"concrete_grade": "C25/30", "steel_grade": "B500",
                      "concrete_density_kN_per_m3": 25.0,
                      "masonry_density_kN_per_m3": 20.0},
        "durability": {"exposure_class": "XC1", "delta_c_dev_mm": 10.0,
                       "clear_cover_override_mm": None},
        "number_of_typical_floors": 3,
        "typical_floor": TYPICAL, "roof_floor": ROOF,
        "M01x_kNm": {}, "M02x_kNm": {}, "M01y_kNm": {}, "M02y_kNm": {},
        "NEd_override_kN": None, "MEdx_override_kNm": None,
        "MEdy_override_kNm": None,
    }
    for k, v in over.items():
        b[k] = v
    return b


def run(label, payload, expect_ok=True):
    try:
        req = ColumnDesignRequest(**payload)
        res = design_column(req)
        s = res.summary
        lv = next(l for l in res.levels if l.level == s.critical_level)
        print(f"  [OK] {label}")
        print(f"       status={s.status} NEd={s.NEd_critical_kN:.2f} kN "
              f"cover={s.cover_mm:.0f} mm bars={s.n_bars}Y{int(s.bar_dia_mm)}")
        print(f"       l0,x={lv.x.l0_mm:.1f} ({lv.x.l0_source})  "
              f"lam={lv.x.lambda_:.2f}/{lv.x.lambda_lim:.2f}  "
              f"ei={lv.x.ei_mm:.2f} mm  MEd={lv.x.MEd:.2f} MRd={lv.x.MRd:.2f}")
        return True
    except ValidationError as e:
        if expect_ok:
            print(f"  [!! 422] {label}")
            for err in e.errors()[:3]:
                print(f"       {'.'.join(str(x) for x in err['loc'])}: {err['msg']}")
            return False
        print(f"  [rejected as expected] {label}: "
              f"{e.errors()[0]['msg'].replace('Value error, ', '')[:80]}")
        return True


print("=" * 74)
print("FRONTEND PAYLOAD CONTRACT")
print("=" * 74)
ok = []

ok.append(run("biaxial, take-down, idealised K",
              body(M01x_kNm={"Typical_Floor_1": 20.0}, M02x_kNm={"Typical_Floor_1": 30.0},
                   M01y_kNm={"Typical_Floor_1": 10.0}, M02y_kNm={"Typical_Floor_1": 15.0})))

ok.append(run("axial route, no moments needed",
              body(column_type="axial")))

ok.append(run("uniaxial, k-factor effective length, manual cover",
              body(column_type="uniaxial",
                   effective_length={"method": "k_factors", "clear_height_m": 4.05,
                                     "k1_x": 0.1, "k2_x": 1.0, "k1_y": 0.1377, "k2_y": 1.0},
                   durability={"exposure_class": "XC1", "delta_c_dev_mm": 10.0,
                               "clear_cover_override_mm": 35.0},
                   M02x_kNm={"Typical_Floor_1": 30.0})))

ok.append(run("direct l0, manual bars per face",
              body(column_type="uniaxial",
                   effective_length={"method": "direct", "clear_height_m": 4.05,
                                     "l0_x_mm": 2861.5, "l0_y_mm": 2924.34},
                   reinforcement={"main_bar_dia_mm": 16.0, "n_bars_total": 8,
                                  "n_bars_b_face": 2, "n_bars_h_face": 4,
                                  "link_dia_mm": 8.0},
                   M02x_kNm={"Typical_Floor_1": 30.0})))

ok.append(run("direct N_Ed override, take-down bypassed",
              body(column_type="biaxial", number_of_typical_floors=0,
                   NEd_override_kN=399.887, MEdx_override_kNm=16.046,
                   MEdy_override_kNm=10.002)))

ok.append(run("computed A and B instead of defaults",
              body(analysis={"include_min_eccentricity": True,
                             "include_geometric_imperfections": True,
                             "effective_creep_ratio": 2.0, "use_default_A_B": False},
                   M02x_kNm={"Typical_Floor_1": 30.0}, M02y_kNm={"Typical_Floor_1": 15.0})))

ok.append(run("imperfections switched off",
              body(analysis={"include_min_eccentricity": True,
                             "include_geometric_imperfections": False,
                             "effective_creep_ratio": 2.0, "use_default_A_B": True},
                   M02x_kNm={"Typical_Floor_1": 30.0}, M02y_kNm={"Typical_Floor_1": 15.0})))

print()
print("  -- frontend guards should stop these reaching the API, but the")
print("     backend must reject them anyway --")
ok.append(run("biaxial with no My", body(M02x_kNm={"Typical_Floor_1": 30.0}),
              expect_ok=False))
ok.append(run("k_factors method missing a k",
              body(effective_length={"method": "k_factors", "k1_x": 0.1, "k2_x": 1.0},
                   M02x_kNm={"Typical_Floor_1": 30.0}, M02y_kNm={"Typical_Floor_1": 15.0}),
              expect_ok=False))

print()
print("=" * 74)
print(f"{sum(ok)} / {len(ok)} contract cases behaved as expected")
print("=" * 74)