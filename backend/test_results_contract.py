"""Every field ColumnResults.jsx reads must exist in the response."""
import json, os, sys
if os.path.isdir("pkgtest"):
    sys.path.insert(0, "pkgtest")
from test_frontend_contract import body
from models.column_schemas import ColumnDesignRequest
from services.column_service import design_column

cases = {
  "biaxial take-down": body(M01x_kNm={"Typical_Floor_1":20.0}, M02x_kNm={"Typical_Floor_1":30.0},
                            M01y_kNm={"Typical_Floor_1":10.0}, M02y_kNm={"Typical_Floor_1":15.0}),
  "axial":             body(column_type="axial"),
  "uniaxial slender":  body(column_type="uniaxial",
                            geometry={"b_mm":250.0,"h_mm":250.0,"storey_height_m":4.5,
                                      "left_x_m":4.0,"right_x_m":5.0,"top_y_m":3.5,"bottom_y_m":3.5},
                            braced=False, end_condition="pinned-pinned",
                            M02x_kNm={"Typical_Floor_1":30.0}),
  "forced fail":       body(column_type="biaxial", number_of_typical_floors=0,
                            geometry={"b_mm":230.0,"h_mm":230.0,"storey_height_m":3.0,
                                      "left_x_m":4.0,"right_x_m":5.0,"top_y_m":3.5,"bottom_y_m":3.5},
                            reinforcement={"main_bar_dia_mm":12.0,"n_bars_total":4,
                                           "n_bars_b_face":None,"n_bars_h_face":None,"link_dia_mm":6.0},
                            NEd_override_kN=1800.0, MEdx_override_kNm=70.0, MEdy_override_kNm=55.0),
}

TOP = ["summary","materials","axial_by_level","levels","detailing",
       "interaction_x","interaction_y","failed_checks","report"]
SUM = ["column_id","column_type","design_code","b_mm","h_mm","storey_height_m","end_condition",
       "braced","concrete_grade","steel_grade","exposure_class","cover_mm","n_bars","bar_dia_mm",
       "link_dia_mm","As_provided_mm2","critical_level","NEd_critical_kN","used_takedown","status"]
DET = ["phi_t_min_mm","link_dia_mm","s_max_mm","s_reduced_mm","As_provided_mm2","As_min_mm2",
       "As_min_basis_1_mm2","As_min_basis_2_mm2","As_max_mm2","rho_pct","n_bars_b_face",
       "n_bars_h_face","d_prime_mm","Ac_mm2"]
AX  = ["lambda","lambda_lim","slender","l0_mm","l0_source","M01","M02","M0e","ei_mm","M_imp",
       "M_end","M_eq","M_min","M_first","M2","MEd","MRd","second_order","utilisation"]
SO  = ["omega","n","Kr","Kphi","inv_r","e2_mm","M2_kNm"]
LVL = ["level","NEd_kN","x","y","NRd_max_kN","NRd_simplified_kN","axial_utilisation",
       "governing_utilisation","checks","status"]

bad = 0
for label, payload in cases.items():
    d = json.loads(design_column(ColumnDesignRequest(**payload)).model_dump_json(by_alias=True))
    miss = []
    miss += [f"root.{k}" for k in TOP if k not in d]
    miss += [f"summary.{k}" for k in SUM if k not in d.get("summary",{})]
    miss += [f"detailing.{k}" for k in DET if k not in d.get("detailing",{})]
    for lv in d.get("levels",[]):
        miss += [f"levels.{k}" for k in LVL if k not in lv]
        for ax in ("x","y"):
            miss += [f"levels.{ax}.{k}" for k in AX if k not in lv.get(ax,{})]
            miss += [f"levels.{ax}.second_order.{k}" for k in SO if k not in lv.get(ax,{}).get("second_order",{})]
        for c in lv.get("checks",[]):
            miss += [f"checks.{k}" for k in ("name","pass") if k not in c]
    for sec in d.get("report",[]):
        if "title" not in sec: miss.append("report.title")
        for row in sec.get("rows",[]):
            miss += [f"report.rows.{k}" for k in ("reference","calculation","output") if k not in row]
    for p in d.get("interaction_x",[])[:1]:
        miss += [f"interaction.{k}" for k in ("N_kN","M_kNm") if k not in p]
    miss = sorted(set(miss))
    if miss:
        bad += 1
        print(f"  [MISSING] {label}: {miss[:6]}")
    else:
        lv = next(l for l in d["levels"] if l["level"] == d["summary"]["critical_level"])
        bi = lv.get("biaxial")
        print(f"  [OK] {label:<18s} status={d['summary']['status']:<4s} "
              f"curve={len(d['interaction_x'])}pts report={len(d['report'])}sec "
              f"failed={len(d['failed_checks'])} biaxial={'yes' if bi else 'no'}")
print()
print("ALL FIELDS PRESENT" if bad == 0 else f"{bad} case(s) missing fields")