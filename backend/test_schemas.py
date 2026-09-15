"""Schema validation + service round trip."""
import json
import os, sys
if os.path.isdir("pkgtest"):
    sys.path.insert(0, "pkgtest")

from pydantic import ValidationError
from models.column_schemas import (
    ColBeam, ColWall, ColFloorTemplate, ColGeometry, ColReinforcement,
    ColumnDesignRequest, ColumnType, EndCondition,
)
from services.column_service import design_column

typical = ColFloorTemplate(
    building_use="office", slab_thickness_m=0.150,
    finishes_kN_per_m2=1.00, services_kN_per_m2=0.50, partitions_kN_per_m2=1.00,
    beam_x=ColBeam(width_m=0.23, depth_m=0.45, wall=ColWall(present=True, thickness_m=0.15)),
    beam_y=ColBeam(width_m=0.23, depth_m=0.45, wall=ColWall(present=True, thickness_m=0.15)),
    imposed_override_kN_per_m2=3.00,
)
roof = ColFloorTemplate(
    building_use="roof_no_access", slab_thickness_m=0.150,
    finishes_kN_per_m2=0.75, services_kN_per_m2=0.25, partitions_kN_per_m2=0.00,
    beam_x=ColBeam(width_m=0.23, depth_m=0.45, wall=ColWall(present=False)),
    beam_y=ColBeam(width_m=0.23, depth_m=0.45, wall=ColWall(present=False)),
    imposed_override_kN_per_m2=0.75,
)

good = dict(
    column_id="B3", column_type=ColumnType.UNIAXIAL,
    end_condition=EndCondition.FIXED_FIXED, braced=True,
    geometry=ColGeometry(b_mm=230, h_mm=460, storey_height_m=3.0,
                         left_x_m=4.0, right_x_m=5.0, top_y_m=3.5, bottom_y_m=3.5),
    reinforcement=ColReinforcement(main_bar_dia_mm=16, n_bars_total=8, link_dia_mm=8),
    number_of_typical_floors=3, typical_floor=typical, roof_floor=roof,
    M01x_kNm={"Typical_Floor_3": 15.0, "Typical_Floor_2": 20.0, "Typical_Floor_1": 25.0},
    M02x_kNm={"Typical_Floor_3": 20.0, "Typical_Floor_2": 25.0, "Typical_Floor_1": 30.0},
)

print("=" * 74)
print("A. HAPPY PATH — request validates, service returns typed result")
print("=" * 74)
req = ColumnDesignRequest(**good)
res = design_column(req)
s = res.summary
print(f"  status={s.status}  critical={s.critical_level}  NEd={s.NEd_critical_kN:.3f} kN")
print(f"  cover={s.cover_mm:.1f} mm  {s.n_bars}Y{int(s.bar_dia_mm)}  As={s.As_provided_mm2:.1f} mm2")
crit = next(l for l in res.levels if l.level == s.critical_level)
print(f"  x: lambda={crit.x.lambda_:.3f} lim={crit.x.lambda_lim:.3f} "
      f"slender={crit.x.slender} MEd={crit.x.MEd:.3f} MRd={crit.x.MRd:.3f}")
print(f"  y: lambda={crit.y.lambda_:.3f} lim={crit.y.lambda_lim:.3f} "
      f"slender={crit.y.slender} MEd={crit.y.MEd:.3f} MRd={crit.y.MRd:.3f}")
print(f"  report {len(res.report)} sections, "
      f"{sum(len(x.rows) for x in res.report)} rows")
print(f"  interaction curve points: x={len(res.interaction_x)}, y={len(res.interaction_y)}")

print()
print("  alias round trip (what FastAPI actually emits):")
dumped = res.model_dump(by_alias=True)
json.dumps(dumped)
axis_keys = sorted(dumped["levels"][0]["x"].keys())
print(f"    axis keys contain 'lambda': {'lambda' in axis_keys}  "
      f"(not 'lambda_': {'lambda_' not in axis_keys})")
print(f"    check keys: {sorted(dumped['levels'][0]['checks'][0].keys())}")
print("    full payload JSON-serialisable: OK")

print()
print("=" * 74)
print("B. VALIDATORS — each should reject with a readable message")
print("=" * 74)


def expect_reject(label, **patch):
    # Patches are passed as raw dicts so that sub-model validation happens
    # inside the try, not while the argument is being built.
    payload = dict(good)
    payload.update(patch)
    try:
        ColumnDesignRequest(**payload)
    except ValidationError as e:
        msg = e.errors()[0]["msg"].replace("Value error, ", "")
        print(f"  [rejected] {label}\n             {msg[:150]}")
    else:
        print(f"  [!! ACCEPTED — validator missed] {label}")


expect_reject(
    "12 x Y25 crammed into a 230x460 section",
    reinforcement={"main_bar_dia_mm": 25, "n_bars_total": 12, "link_dia_mm": 8},
)
expect_reject(
    "10 mm main bars (below the 12 mm column minimum)",
    reinforcement={"main_bar_dia_mm": 10, "n_bars_total": 8, "link_dia_mm": 8},
)
expect_reject(
    "uniaxial column with no Mx supplied",
    M01x_kNm={}, M02x_kNm={},
)
expect_reject(
    "biaxial column with Mx but no My",
    column_type=ColumnType.BIAXIAL,
)
expect_reject(
    "zero tributary spans with no NEd override",
    geometry={"b_mm": 230, "h_mm": 460, "storey_height_m": 3.0,
              "left_x_m": 0, "right_x_m": 0, "top_y_m": 0, "bottom_y_m": 0},
)
expect_reject("unknown exposure class", durability={"exposure_class": "XZ9"})
expect_reject("unknown concrete grade", materials={"concrete_grade": "C99/99"})
expect_reject("unknown building use", typical_floor={"building_use": "spaceport"})
expect_reject(
    "only one of the two face-count fields given",
    reinforcement={"main_bar_dia_mm": 16, "n_bars_total": 8,
                   "link_dia_mm": 8, "n_bars_b_face": 2},
)

print()
print("=" * 74)
print("C. AXIAL ROUTE needs no moments; OVERRIDE bypasses the take-down")
print("=" * 74)
ax = dict(good)
ax.update(column_type=ColumnType.AXIAL, M01x_kNm={}, M02x_kNm={})
r2 = design_column(ColumnDesignRequest(**ax))
print(f"  axial route: status={r2.summary.status} "
      f"NEd={r2.summary.NEd_critical_kN:.3f} take-down={r2.summary.used_takedown}")

ov = dict(good)
ov.update(column_type=ColumnType.BIAXIAL, NEd_override_kN=1500.0,
          MEdx_override_kNm=90.0, MEdy_override_kNm=40.0)
r3 = design_column(ColumnDesignRequest(**ov))
c3 = r3.levels[0]
print(f"  override:    status={r3.summary.status} "
      f"NEd={r3.summary.NEd_critical_kN:.3f} take-down={r3.summary.used_takedown}")
print(f"               biaxial a={c3.biaxial.a:.3f} "
      f"interaction={c3.biaxial.interaction:.4f}")

print()
print("=" * 74)
print("D. FAILING DESIGN — failed checks must be named, not just PASS/FAIL")
print("=" * 74)
bad = dict(good)
bad.update(
    column_type=ColumnType.BIAXIAL,
    geometry=ColGeometry(b_mm=230, h_mm=230, storey_height_m=3.0,
                         left_x_m=4.0, right_x_m=5.0, top_y_m=3.5, bottom_y_m=3.5),
    reinforcement=ColReinforcement(main_bar_dia_mm=12, n_bars_total=4, link_dia_mm=6),
    NEd_override_kN=1800.0, MEdx_override_kNm=70.0, MEdy_override_kNm=55.0,
)
r4 = design_column(ColumnDesignRequest(**bad))
print(f"  status={r4.summary.status}")
for fc in r4.failed_checks:
    print(f"    - {fc}")
summary_rows = [r for sec in r4.report if sec.title.startswith("14")
                for r in sec.rows if r.reference == "FAILED CHECKS"]
print(f"  named in report section 14: {'YES' if summary_rows else 'NO'}")
if summary_rows:
    print(f"    {summary_rows[0].calculation}")