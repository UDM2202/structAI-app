"""Independent verification of column_engine.py section analysis."""
import math
from column_engine import (
    ColumnInput, ColumnEngine, Materials, Geometry, SectionAnalysis,
    bar_area_mm2, distribute_bars, Es_MPA,
)

d = ColumnInput(
    column_id="B3", column_type="biaxial",
    b_mm=230.0, h_mm=460.0, storey_height_m=3.0,
    main_bar_dia_mm=16.0, n_bars_total=8, link_dia_mm=8.0,
    exposure_class="XC1", concrete_grade="C30/37", steel_grade="B500",
)
mat = Materials(d)
geo = Geometry(d, mat)
sx = SectionAnalysis(geo, mat, "x")
sy = SectionAnalysis(geo, mat, "y")

print("=" * 70)
print("TEST 1 — material + geometry vs hand calculation")
print("=" * 70)
fcd_hand = 0.85 * 30 / 1.5
fyd_hand = 500 / 1.15
print(f"fcd   engine {mat.fcd:10.4f}   hand {fcd_hand:10.4f}   {'OK' if abs(mat.fcd-fcd_hand)<1e-9 else 'MISMATCH'}")
print(f"fyd   engine {mat.fyd:10.4f}   hand {fyd_hand:10.4f}   {'OK' if abs(mat.fyd-fyd_hand)<1e-9 else 'MISMATCH'}")

# cover: XC1 -> 15, c_min,b = max(16,8)=16, c_min = max(16,15,10)=16, c_nom=16+10=26
print(f"cover engine {geo.cover:10.4f}   hand {26.0:10.4f}   {'OK' if abs(geo.cover-26.0)<1e-9 else 'MISMATCH'}")
dp_hand = 26.0 + 8.0 + 8.0
print(f"d'    engine {geo.d_prime:10.4f}   hand {dp_hand:10.4f}   {'OK' if abs(geo.d_prime-dp_hand)<1e-9 else 'MISMATCH'}")

As_hand = 8 * math.pi * 16**2 / 4
print(f"As    engine {geo.As_total:10.4f}   hand {As_hand:10.4f}   {'OK' if abs(geo.As_total-As_hand)<1e-6 else 'MISMATCH'}")
print(f"bar layout: {geo.n_b_face} per b-face, {geo.n_h_face} per h-face, total {geo.n_bars}")
print(f"ix = {geo.ix:.4f} (h/sqrt12 = {geo.h/math.sqrt(12):.4f})")
print(f"iy = {geo.iy:.4f} (b/sqrt12 = {geo.b/math.sqrt(12):.4f})")
print("bar coords (x, y, area):")
for (x, y, a) in sorted(geo.bar_coords(), key=lambda t: (t[1], t[0])):
    print(f"   ({x:7.2f}, {y:7.2f})  {a:8.2f}")

print()
print("=" * 70)
print("TEST 2 — pure compression NRd,max vs hand calculation")
print("=" * 70)
sigma_s = min(Es_MPA * mat.eps_c3, mat.fyd)
N_hand = (1.0 * fcd_hand * (230 * 460 - As_hand) + As_hand * sigma_s) / 1000
N_eng = sx.N_pure_compression()
print(f"sigma_s at eps_c3 = {sigma_s:.3f} MPa (NOT fyd = {mat.fyd:.3f}; strain-limited)")
print(f"NRd,max engine {N_eng:12.4f} kN   hand {N_hand:12.4f} kN   "
      f"{'OK' if abs(N_eng-N_hand) < 0.01 else 'MISMATCH'}")

# also confirm the analysis converges to it for very large x
N_far, M_far = sx.forces(50 * geo.h)
print(f"forces(x=50h) -> N {N_far:12.4f} kN, M {M_far:10.4f} kNm  "
      f"{'OK' if abs(N_far-N_hand) < 1.0 and abs(M_far) < 1.0 else 'CHECK'}")

print()
print("=" * 70)
print("TEST 3 — monotonicity of N(x) and continuity at x = h")
print("=" * 70)
prev = -1e18
mono = True
for i in range(1, 400):
    x = i * geo.h / 100.0
    N, M = sx.forces(x)
    if N < prev - 1e-6:
        mono = False
        print(f"  NON-MONOTONIC at x={x:.2f}: N={N:.4f} < prev {prev:.4f}")
    prev = N
print(f"N(x) monotonic increasing: {'OK' if mono else 'FAIL'}")
eps_lo = sx.strain_at(0.0, geo.h * 0.9999)
eps_hi = sx.strain_at(0.0, geo.h * 1.0001)
print(f"strain at comp. face, x=h-  {eps_lo:.8f}")
print(f"strain at comp. face, x=h+  {eps_hi:.8f}   "
      f"{'OK (continuous)' if abs(eps_lo-eps_hi) < 1e-6 else 'DISCONTINUITY'}")

print()
print("=" * 70)
print("TEST 4 — pure bending (N=0) hand check about x-axis")
print("=" * 70)
# Solve by hand: find x such that N = 0, then compare M.
lo, hi = 1e-6, geo.h
for _ in range(200):
    mid = (lo + hi) / 2
    if sx.forces(mid)[0] < 0:
        lo = mid
    else:
        hi = mid
x0 = (lo + hi) / 2
N0, M0 = sx.forces(x0)
print(f"neutral axis at N=0: x = {x0:.4f} mm, N = {N0:.6f} kN, M = {M0:.4f} kNm")

# independent hand recomputation at that x
eta_fcd = 1.0 * fcd_hand
a = 0.8 * x0
Fc = eta_fcd * 230 * a
M_hand = Fc * (230.0 - a / 2)
N_check = Fc
for (bx, by, ar) in geo.bar_coords():
    eps = 0.0035 * (x0 - by) / x0
    sig = max(-fyd_hand, min(fyd_hand, 200000 * eps))
    if by <= a:
        sig -= eta_fcd
    N_check += ar * sig
    M_hand += ar * sig * (230.0 - by)
print(f"hand recompute:      N = {N_check/1000:.6f} kN, M = {M_hand/1e6:.4f} kNm   "
      f"{'OK' if abs(M_hand/1e6 - M0) < 1e-6 else 'MISMATCH'}")

print()
print("=" * 70)
print("TEST 5 — MRd_at() round trip")
print("=" * 70)
for N_target in [0.0, 200.0, 500.0, 800.0, 1200.0, 1600.0, 2000.0]:
    M = sx.MRd_at(N_target)
    print(f"  NEd = {N_target:8.1f} kN  ->  MRd,x = {M:9.4f} kNm")
print()
for N_target in [0.0, 500.0, 1200.0]:
    M = sy.MRd_at(N_target)
    print(f"  NEd = {N_target:8.1f} kN  ->  MRd,y = {M:9.4f} kNm")
print("(MRd should peak near the balanced point, then fall — check shape above)")

print()
print("=" * 70)
print("TEST 6 — bar distribution helper")
print("=" * 70)
for n in [4, 6, 7, 8, 10, 12, 14, 16, 20]:
    nb, nh, used = distribute_bars(n, 230, 460)
    flag = "OK" if used >= n or (n % 2 == 1 and used >= n + 1) else "CHECK"
    print(f"  n_total={n:3d} -> {nb} per b-face, {nh} per h-face, used={used:3d}  {flag}")