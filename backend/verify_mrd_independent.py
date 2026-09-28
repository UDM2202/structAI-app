"""
verify_mrd_independent.py  (run from backend/:  python verify_mrd_independent.py)

Independent cross-check of the engine's section moment capacity, M_Rd.

The engine (engine/column_engine.py, SectionAnalysis) uses the EC2 Cl. 3.1.7
RECTANGULAR stress block with closed-form resultants.

This script computes the same M_Rd a different way: the EC2 Cl. 3.1.5
PARABOLA-RECTANGLE law, integrated over 400 thin layers, with the standard EC2
strain pivots (3.5 permille at the compression face, 2.0 permille at 3h/7 for
full compression). Different stress-strain law, different integration,
different pivot construction.

What this DOES show: whether the engine's method holds up against EC2's own
reference stress-strain curve, across sections, both axes and a range of axial
load.

What it does NOT show: anything about cover, bar positions or material factors,
because those come from the same Geometry and Materials objects the engine
uses. It is also not a comparison with a published chart, which is read by eye
and is not used as a reference.

Exit code 0 if the engine stays within tolerance of the reference, 1 if not, so
it can guard against a future change that quietly moves M_Rd.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from engine.column_engine import ColumnInput, Geometry, Materials, SectionAnalysis, Es_MPA  # noqa: E402

EC2, ECU2 = 0.0020, 0.0035          # parabola-rectangle strains, fck <= 50

# Tolerances, as percent difference of the engine from the reference.
# The rectangular block is a permitted simplification of the parabola-rectangle
# law and is expected to sit slightly above it, most at high axial load.
LOW_N_LIMIT = 0.45                   # up to this share of N_Rd,max
TOL_UP_TO_LIMIT = 2.0                # percent
TOL_ABOVE_LIMIT = 6.0                # percent


def make(b, h, dia, n, grade, link=8.0):
    d = ColumnInput(b_mm=float(b), h_mm=float(h), main_bar_dia_mm=float(dia), n_bars_total=n,
                    link_dia_mm=link, concrete_grade=grade, exposure_class="XC1")
    mat = Materials(d)
    return Geometry(d, mat), mat


def fibre_forces(geo, mat, axis, x, layers=400):
    depth, width = geo.section_depth(axis), geo.section_width(axis)
    fcd, fyd = mat.fcd, mat.fyd

    def sc(e):
        if e <= 0:
            return 0.0
        if e < EC2:
            return fcd * (1.0 - (1.0 - e / EC2) ** 2)
        return fcd

    def strain(y):
        if x <= depth:
            return ECU2 * (x - y) / x
        return EC2 * (x - y) / (x - 3.0 * depth / 7.0)

    dy = depth / layers
    N = M = 0.0
    for i in range(layers):
        y = (i + 0.5) * dy
        f = sc(strain(y)) * width * dy
        N += f
        M += f * (depth / 2.0 - y)
    for (y, a) in geo.bar_depths(axis):
        e = strain(y)
        s = max(-fyd, min(fyd, Es_MPA * e))
        f = a * (s - sc(e))                      # steel force less the concrete it displaces
        N += f
        M += f * (depth / 2.0 - y)
    return N / 1000.0, M / 1e6


def fibre_MRd(geo, mat, axis, N_kN):
    depth = geo.section_depth(axis)
    lo, hi = 1e-3, depth
    while fibre_forces(geo, mat, axis, hi)[0] < N_kN and hi < 200 * depth:
        hi *= 2.0
    if fibre_forces(geo, mat, axis, hi)[0] < N_kN:
        return None
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        if fibre_forces(geo, mat, axis, mid)[0] < N_kN:
            lo = mid
        else:
            hi = mid
    return fibre_forces(geo, mat, axis, 0.5 * (lo + hi))[1]


CASES = [(300, 300, 20, 4, "C25/30"), (300, 300, 20, 8, "C25/30"), (300, 500, 20, 8, "C25/30"),
         (230, 460, 16, 8, "C25/30"), (400, 400, 25, 12, "C30/37"), (300, 450, 20, 8, "C30/37")]
FRACTIONS = (0.05, 0.15, 0.30, 0.45, 0.60, 0.75)


def main():
    low_worst = high_worst = 0.0
    n_low = n_high = 0
    print(f"{'section':26s} {'axis':4s} {'N/NRd':>6s} {'engine':>9s} {'reference':>10s} {'difference':>11s}")
    for (b, h, dia, n, grade) in CASES:
        geo, mat = make(b, h, dia, n, grade)
        for axis in ("x", "y"):
            sa = SectionAnalysis(geo, mat, axis)
            n_max = sa.N_pure_compression()
            for frac in FRACTIONS:
                N = frac * n_max
                eng, ref = sa.MRd_at(N), fibre_MRd(geo, mat, axis, N)
                if not ref or ref < 1e-6:
                    continue
                diff = 100.0 * (eng - ref) / ref
                if frac <= LOW_N_LIMIT:
                    low_worst, n_low = max(low_worst, abs(diff)), n_low + 1
                else:
                    high_worst, n_high = max(high_worst, abs(diff)), n_high + 1
                if axis == "x" and frac in (0.15, 0.45, 0.75):
                    print(f"{f'{b}x{h} {n}Y{dia} {grade}':26s} {axis:4s} {frac:6.2f} {eng:9.2f} {ref:10.2f} {diff:+10.1f}%")

    ok_low, ok_high = low_worst <= TOL_UP_TO_LIMIT, high_worst <= TOL_ABOVE_LIMIT
    print(f"\n{n_low + n_high} comparisons: {len(CASES)} sections, both axes, "
          f"N from {FRACTIONS[0]:.0%} to {FRACTIONS[-1]:.0%} of N_Rd,max")
    print(f"up to {LOW_N_LIMIT:.0%} of N_Rd,max : {n_low} cases, largest difference {low_worst:.1f}%  "
          f"(limit {TOL_UP_TO_LIMIT:.1f}%)  {'OK' if ok_low else 'OUTSIDE LIMIT'}")
    print(f"above {LOW_N_LIMIT:.0%}          : {n_high} cases, largest difference {high_worst:.1f}%  "
          f"(limit {TOL_ABOVE_LIMIT:.1f}%)  {'OK' if ok_high else 'OUTSIDE LIMIT'}")
    return 0 if (ok_low and ok_high) else 1


if __name__ == "__main__":
    sys.exit(main())