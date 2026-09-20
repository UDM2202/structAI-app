"""
Surgical patches to beam_cont_engine.py.

Run:  python3 patch_engine.py /path/to/beam_cont_engine.py

Each patch asserts its target appears exactly once before replacing, so a
file that has drifted from what these patches were written against fails
loudly instead of being silently mangled.
"""
import sys
import shutil

PATCHES = []


def patch(name, old, new):
    PATCHES.append((name, old, new))


# ---------------------------------------------------------------------------
# 1. SPAN SAGGING MOMENT  --  the reported bug
#
# Was:
#     M_left = -abs(mp[0]); M_right = -abs(mp[1])
#     R_left = (w * L) / 2 - (M_right - M_left) / L
#     span_moments[...] = float(max(M_max, 0.0))
#
# Three faults, compounding:
#
#  (a) -abs() on BOTH end moments. The FEM returns member end moments in the
#      stiffness convention, where m[0] and m[1] carry OPPOSITE signs for the
#      same physical hogging. Converting to bending-moment convention needs
#      M_A = -m[0] and M_B = +m[1]. Forcing both negative destroys the
#      asymmetry between the two ends of a span.
#
#  (b) The reaction sign is inverted. Equilibrium gives
#          R_A = wL/2 + (M_B - M_A)/L
#      not minus. Check against a propped cantilever (M_A = -wL^2/8,
#      M_B = 0): the correct form gives 5wL/8, the old one gives 3wL/8.
#
#  (c) max(M_max, 0.0) then silently clamps the wrong answer to zero instead
#      of letting an impossible result surface.
#
# Effect on a 3-span beam at 6 m, w = 60 kN/m:
#      span 1   reported 388.80   actual 172.80   (over by 125%)
#      span 3   reported   0.00   actual 172.80   (designed for nothing)
# A zero sagging moment falls through to As,min, leaving the end span roughly
# ten times under-reinforced.
# ---------------------------------------------------------------------------
patch(
    "span sagging moment",
    """    for e, (L, w, mp) in enumerate(zip(spans, span_loads, end_moments), start=1):
        M_left = -abs(mp[0]); M_right = -abs(mp[1])
        R_left = (w * L) / 2 - (M_right - M_left) / L
        x = R_left / w if w else 0
        M_max = M_left + R_left * x - (w * x ** 2) / 2
        span_moments[f"Span {e}"] = float(max(M_max, 0.0))
        span_details.append({"span": e, "L_m": L, "w_kN_m": round(w, 3),
                             "M_left": round(M_left, 3), "M_right": round(M_right, 3),
                             "R_left": round(R_left, 3), "x_m": round(x, 3),
                             "M_sag": round(max(M_max, 0.0), 3)})""",
    """    for e, (L, w, mp) in enumerate(zip(spans, span_loads, end_moments), start=1):
        # Stiffness-convention member end moments -> bending moment convention
        # (sagging positive). The two ends carry opposite signs for the same
        # physical hogging, so they must NOT both be forced negative.
        M_left = -float(mp[0])
        M_right = float(mp[1])
        # Equilibrium: R_A = wL/2 + (M_B - M_A)/L.  Verify on a propped
        # cantilever (M_A = -wL^2/8, M_B = 0) -> 5wL/8.
        R_left = (w * L) / 2 + (M_right - M_left) / L
        R_right = w * L - R_left
        x = R_left / w if w else 0.0
        M_max = M_left + R_left * x - (w * x ** 2) / 2
        # Reported as computed. A genuinely non-positive result means the span
        # is fully hogging and should be visible, not clamped to zero.
        span_moments[f"Span {e}"] = float(M_max)
        span_details.append({"span": e, "L_m": L, "w_kN_m": round(w, 3),
                             "M_left": round(M_left, 3), "M_right": round(M_right, 3),
                             "R_left": round(R_left, 3), "R_right": round(R_right, 3),
                             "x_m": round(x, 3),
                             "M_sag": round(M_max, 3),
                             "M_free_span": round(w * L ** 2 / 8, 3)})""",
)

# ---------------------------------------------------------------------------
# 2. SHEAR REACTIONS  --  same sign fault, same fix
#
# max(|R_left|, |R_right|) happened to mask this, because inverting the sign
# just swaps which end is larger. The per-span maximum was therefore right by
# luck while the individual end reactions were wrong -- and those are what a
# shear envelope and the support reactions need.
# ---------------------------------------------------------------------------
patch(
    "shear reactions",
    """    shear = {}
    for e, (L, w, mp) in enumerate(zip(spans, span_loads, end_moments), start=1):
        M_left = -abs(mp[0]); M_right = -abs(mp[1])
        R_left = (w * L) / 2 - (M_right - M_left) / L
        R_right = w * L - R_left
        shear[f"Span {e}"] = float(round(max(abs(R_left), abs(R_right)), 3))""",
    """    shear = {}
    shear_ends = {}
    for e, (L, w, mp) in enumerate(zip(spans, span_loads, end_moments), start=1):
        M_left = -float(mp[0])
        M_right = float(mp[1])
        R_left = (w * L) / 2 + (M_right - M_left) / L
        R_right = w * L - R_left
        shear[f"Span {e}"] = float(round(max(abs(R_left), abs(R_right)), 3))
        shear_ends[f"Span {e}"] = {"V_left_kN": round(float(R_left), 3),
                                   "V_right_kN": round(float(R_right), 3)}""",
)

# ---------------------------------------------------------------------------
# 3. SHEAR LINK DESIGN  --  engineer's transparency request
#
# The engine previously stopped at "links required" and left the service to
# improvise a spacing. Two problems with that improvisation:
#
#  (a) It deducted VRd,c from VEd before sizing the links. EC2 Cl.6.2.3 does
#      not permit that: once shear reinforcement is required the links carry
#      the WHOLE of VEd. Deducting VRd,c under-sizes them.
#  (b) There was no check on VRd,max, so a section that crushes its
#      compression strut would have been reported as adequate.
#
# Full design now happens here, and every intermediate value is returned so
# the report can show the working rather than just the provision.
# ---------------------------------------------------------------------------
patch(
    "shear link design",
    """    max_VEd = max(shear.values())
    shear_ok = bool(max_VEd <= VRdc)""",
    """    max_VEd = max(shear.values())
    shear_ok = bool(max_VEd <= VRdc)

    # --- shear links, EC2 Cl.6.2.3 (variable strut inclination) ---
    # Once links are required they carry the whole of VEd; VRd,c is not
    # deducted (Cl.6.2.3(1)). z = 0.9d, fywd = fyk/1.15, cot(theta) = 2.5
    # is the flattest strut EC2 allows and gives the widest spacing.
    fywd = d.fyk / d.gamma_s
    z_sh = 0.9 * d_mm
    cot_theta = 2.5
    theta_deg = math.degrees(math.atan(1.0 / cot_theta))
    nu1 = 0.6 * (1 - d.fck / 250.0)
    alpha_cw = 1.0
    # VRd,max = alpha_cw bw z nu1 fcd / (cot + tan)
    VRd_max = (alpha_cw * bw * z_sh * nu1 * (d.fck / d.gamma_c)
               / (cot_theta + 1.0 / cot_theta)) / 1000.0
    Asw_link = 2 * math.pi * d.link_dia_mm ** 2 / 4      # 2 legs
    s_max_ec2 = min(0.75 * d_mm, 300.0)                  # Cl.9.2.2(6)
    # Minimum shear reinforcement ratio, Cl.9.2.2(5)
    rho_w_min = 0.08 * math.sqrt(d.fck) / d.fyk
    s_min_ratio = Asw_link / (rho_w_min * bw) if rho_w_min > 0 else s_max_ec2

    shear_design = {}
    for sp, VEd in shear.items():
        needs_links = VEd > VRdc
        crush_ok = VEd <= VRd_max
        if needs_links:
            # s = Asw z fywd cot(theta) / VEd
            s_req = Asw_link * z_sh * fywd * cot_theta / (VEd * 1000.0)
            s_gov = min(s_req, s_max_ec2, s_min_ratio)
            basis = "shear demand" if s_req <= min(s_max_ec2, s_min_ratio) else (
                "maximum spacing Cl.9.2.2(6)" if s_max_ec2 <= s_min_ratio
                else "minimum ratio Cl.9.2.2(5)")
        else:
            s_req = float("inf")
            s_gov = min(s_max_ec2, s_min_ratio)
            basis = "nominal links -- VEd <= VRd,c"
        spacing = max(75, int(s_gov // 25) * 25)         # round DOWN to 25 mm
        Asw_s_req = (VEd * 1000.0) / (z_sh * fywd * cot_theta) if needs_links else 0.0
        Asw_s_prov = Asw_link / spacing
        shear_design[sp] = {
            "VEd_kN": round(VEd, 3),
            "VRdc_kN": round(VRdc, 3),
            "VRd_max_kN": round(VRd_max, 3),
            "links_required": bool(needs_links),
            "crush_ok": bool(crush_ok),
            "Asw_mm2": round(Asw_link, 1),
            "z_mm": round(z_sh, 1),
            "fywd_MPa": round(fywd, 1),
            "cot_theta": cot_theta,
            "theta_deg": round(theta_deg, 1),
            "Asw_s_required": round(Asw_s_req, 4),
            "Asw_s_provided": round(Asw_s_prov, 4),
            "s_required_mm": None if s_req == float("inf") else round(s_req, 1),
            "s_max_ec2_mm": round(s_max_ec2, 1),
            "s_min_ratio_mm": round(s_min_ratio, 1),
            "spacing_mm": spacing,
            "governed_by": basis,
            "label": f"{int(d.link_dia_mm)} mm links, 2 legs @ {spacing} mm c/c",
            "status": "OK" if (Asw_s_prov >= Asw_s_req and crush_ok) else "NOT OK",
        }
    crush_ok_all = all(v["crush_ok"] for v in shear_design.values())
    links_ok_all = all(v["status"] == "OK" for v in shear_design.values())""",
)

# ---------------------------------------------------------------------------
# 4. SHEAR PASS/FAIL  --  remove the 3.0 fudge
#
# Was:  bool(shear_ok or (max_VEd / VRdc < 3.0 if VRdc else False))
#
# That let a beam pass with VEd up to three times VRd,c and no link design at
# all. Shear now passes when the links actually designed above are adequate
# and the strut does not crush.
# ---------------------------------------------------------------------------
patch(
    "shear pass criterion",
    """        "shear": bool(shear_ok or (max_VEd / VRdc < 3.0 if VRdc else False)),""",
    """        "shear": bool(links_ok_all and crush_ok_all),""",
)

# ---------------------------------------------------------------------------
# 5. REPORT -- show the link design, not just the verdict
# ---------------------------------------------------------------------------
patch(
    "shear report section",
    """    shear_rows = [R2("Per-span design shear", "from span equilibrium", "see below")]
    for sp, V in shear.items():
        shear_rows.append(R2(sp, "max(|R_left|, |R_right|)", f"VEd = {V:.2f} kN"))
    shear_rows += [
        R2("Steel ratio", f"rho_l = As,prov(max)/(bw d)  (<=0.02)", f"rho_l = {rho_l:.5f}"),
        R2("Size factor", f"k = 1 + sqrt(200/d) = 1 + sqrt(200/{d_mm:.1f})  (<=2.0)", f"k = {k_sh:.3f}"),
        R2("EC2 Cl.6.2.2", f"C_Rd,c = 0.18/gamma_c = 0.18/1.50", f"C_Rd,c = {C_Rdc:.3f}"),
        R2("VRd,c", "max(main term, v_min) x bw x d", f"VRd,c = {VRdc:.2f} kN"),
        R2("Verdict", f"max VEd {max_VEd:.2f} vs VRd,c {VRdc:.2f}", "OK" if shear_ok else "links required"),
    ]
    report.append({"section": "9. Shear (EC2 Cl.6.2.2)", "rows": shear_rows})""",
    """    shear_rows = [R2("Per-span design shear", "end reactions from span equilibrium", "see below")]
    for sp, V in shear.items():
        ends = shear_ends[sp]
        shear_rows.append(R2(sp, f"V_left = {ends['V_left_kN']:.2f}, V_right = {ends['V_right_kN']:.2f}",
                             f"VEd = {V:.2f} kN"))
    shear_rows += [
        R2("Steel ratio", "rho_l = As,prov(max)/(bw d)  (<=0.02)", f"rho_l = {rho_l:.5f}"),
        R2("Size factor", f"k = 1 + sqrt(200/d) = 1 + sqrt(200/{d_mm:.1f})  (<=2.0)", f"k = {k_sh:.3f}"),
        R2("EC2 Cl.6.2.2", "C_Rd,c = 0.18/gamma_c = 0.18/1.50", f"C_Rd,c = {C_Rdc:.3f}"),
        R2("EC2 Cl.6.2.2", f"v_min = 0.035 k^1.5 sqrt(fck) = 0.035 x {k_sh:.3f}^1.5 x sqrt({d.fck:.0f})",
           f"v_min = {v_min:.3f} MPa"),
        R2("VRd,c", "max(main term, v_min) x bw x d", f"VRd,c = {VRdc:.2f} kN"),
        R2("Verdict", f"max VEd {max_VEd:.2f} vs VRd,c {VRdc:.2f}",
           "no links required" if shear_ok else "links required"),
    ]
    report.append({"section": "9. Shear Resistance Without Links (EC2 Cl.6.2.2)", "rows": shear_rows})

    # --- 9b. link design, shown per span ---
    any_links = any(v["links_required"] for v in shear_design.values())
    link_rows = [
        R2("EC2 Cl.6.2.3", "Where VEd > VRd,c the links carry the WHOLE of VEd. "
                           "VRd,c is not deducted.", "variable strut inclination"),
        R2("Strut angle", f"cot(theta) = {cot_theta} -> theta = {theta_deg:.1f} deg "
                          "(flattest EC2 permits, widest spacing)", f"cot = {cot_theta}"),
        R2("Lever arm", f"z = 0.9 d = 0.9 x {d_mm:.1f}", f"z = {z_sh:.1f} mm"),
        R2("Link steel", f"fywd = fyk/gamma_s = {d.fyk:.0f}/{d.gamma_s:.2f}", f"fywd = {fywd:.1f} MPa"),
        R2("Link area", f"Asw = 2 legs x pi x {d.link_dia_mm:.0f}^2/4", f"Asw = {Asw_link:.1f} mm2"),
        R2("EC2 Cl.6.2.3(3)", f"nu1 = 0.6(1 - fck/250) = 0.6(1 - {d.fck:.0f}/250)", f"nu1 = {nu1:.4f}"),
        R2("Crushing limit", "VRd,max = alpha_cw bw z nu1 fcd/(cot+tan)", f"VRd,max = {VRd_max:.2f} kN"),
        R2("EC2 Cl.9.2.2(6)", f"s,max = min(0.75d, 300) = min({0.75*d_mm:.1f}, 300)", f"{s_max_ec2:.0f} mm"),
        R2("EC2 Cl.9.2.2(5)", f"rho_w,min = 0.08 sqrt(fck)/fyk = 0.08 sqrt({d.fck:.0f})/{d.fyk:.0f}"
                              f" -> s <= Asw/(rho_w,min bw)", f"{s_min_ratio:.0f} mm"),
    ]
    for sp, sdz in shear_design.items():
        if sdz["links_required"]:
            link_rows.append(R2(f"{sp} -- Asw/s required",
                                f"Asw/s = VEd/(z fywd cot) = ({sdz['VEd_kN']:.2f} x 10^3)"
                                f"/({z_sh:.1f} x {fywd:.1f} x {cot_theta})",
                                f"{sdz['Asw_s_required']:.4f} mm2/mm"))
            link_rows.append(R2(f"{sp} -- s required",
                                f"s = Asw/(Asw/s) = {Asw_link:.1f}/{sdz['Asw_s_required']:.4f}",
                                f"s = {sdz['s_required_mm']:.1f} mm"))
        else:
            link_rows.append(R2(f"{sp} -- links",
                                f"VEd = {sdz['VEd_kN']:.2f} <= VRd,c = {VRdc:.2f} "
                                "-> nominal links only", "nominal"))
        link_rows.append(R2(f"{sp} -- crushing",
                            f"VEd = {sdz['VEd_kN']:.2f} vs VRd,max = {VRd_max:.2f}",
                            "OK" if sdz["crush_ok"] else "SECTION TOO SMALL"))
        link_rows.append(R2(f"{sp} -- governed by", sdz["governed_by"],
                            f"s = {sdz['spacing_mm']} mm"))
        link_rows.append(R2(f"{sp} -- provide",
                            f"Asw/s provided = {Asw_link:.1f}/{sdz['spacing_mm']} = "
                            f"{sdz['Asw_s_provided']:.4f} vs required {sdz['Asw_s_required']:.4f}",
                            f"{sdz['label']} ({sdz['status']})"))
    report.append({"section": "9b. Shear Link Design (EC2 Cl.6.2.3, Cl.9.2.2)"
                   if any_links else "9b. Shear Links -- Nominal (EC2 Cl.9.2.2)",
                   "rows": link_rows})""",
)

# ---------------------------------------------------------------------------
# 6. Expose the new data on the returned dict
# ---------------------------------------------------------------------------
patch(
    "shear payload",
    """        "shear": {"per_span_VEd_kN": shear, "max_VEd_kN": round(max_VEd, 3),
                  "VRdc_kN": round(VRdc, 3), "status": "OK" if shear_ok else "Links required",
                  "C_Rdc": round(C_Rdc, 3), "k_factor": round(k_sh, 3), "rho_l": round(rho_l, 5),
                  "v_min_mpa": round(v_min, 3)},""",
    """        "shear": {"per_span_VEd_kN": shear, "per_span_ends": shear_ends,
                  "max_VEd_kN": round(max_VEd, 3),
                  "VRdc_kN": round(VRdc, 3), "VRd_max_kN": round(VRd_max, 3),
                  "status": "OK" if shear_ok else "Links required",
                  "C_Rdc": round(C_Rdc, 3), "k_factor": round(k_sh, 3), "rho_l": round(rho_l, 5),
                  "v_min_mpa": round(v_min, 3),
                  "links_ok": bool(links_ok_all), "crush_ok": bool(crush_ok_all),
                  "design": shear_design,
                  "fywd_MPa": round(fywd, 1), "z_mm": round(z_sh, 1),
                  "cot_theta": cot_theta, "Asw_mm2": round(Asw_link, 1),
                  "s_max_ec2_mm": round(s_max_ec2, 1), "s_min_ratio_mm": round(s_min_ratio, 1)},""",
)

# ---------------------------------------------------------------------------
# 7. Report section 5 -- show per-span sagging and the free moment beside it,
#    so a zero or near-zero value is obvious instead of silent.
# ---------------------------------------------------------------------------
patch(
    "moments report section",
    """    report.append({"section": "5. Moments", "rows": [
        R2("Support hogging", "|interior end moments| -- see Section 7 for per-support values", f"max {max_hog:.2f} kNm"),
        R2("Span sagging", "from equilibrium -- see Section 6 for per-span values", f"max {max_sag:.2f} kNm"),
    ]})""",
    """    mom_rows = [
        R2("Sign convention", "member end moments converted to bending-moment convention: "
                              "M_A = -m[0], M_B = +m[1] (sagging positive)", "applied"),
        R2("Equilibrium", "R_A = wL/2 + (M_B - M_A)/L ; x = R_A/w ; "
                          "M_sag = M_A + R_A x - w x^2/2", "per span"),
    ]
    for det in span_details:
        mom_rows.append(R2(f"Span {det['span']} -- ends",
                           f"M_A = {det['M_left']:.2f}, M_B = {det['M_right']:.2f} kNm",
                           f"R_A = {det['R_left']:.2f} kN"))
        mom_rows.append(R2(f"Span {det['span']} -- sagging",
                           f"free moment wL^2/8 = {det['M_free_span']:.2f} kNm, "
                           f"peak at x = {det['x_m']:.3f} m",
                           f"M_sag = {det['M_sag']:.2f} kNm"))
    mom_rows += [
        R2("Support hogging", "|interior end moments| -- see Section 7 for per-support values", f"max {max_hog:.2f} kNm"),
        R2("Span sagging", "see Section 6 for the reinforcement design", f"max {max_sag:.2f} kNm"),
    ]
    report.append({"section": "5. Moments", "rows": mom_rows})""",
)


def main(path):
    src = open(path, encoding="utf-8").read()
    shutil.copy(path, path + ".bak")
    applied = []
    for name, old, new in PATCHES:
        count = src.count(old)
        if count != 1:
            print(f"  [FAIL] '{name}': target found {count} times, expected 1. Nothing written.")
            return 1
        src = src.replace(old, new)
        applied.append(name)
    open(path, "w", encoding="utf-8").write(src)
    for a in applied:
        print(f"  [applied] {a}")
    print(f"\n  backup at {path}.bak")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "beam_cont_engine.py"))