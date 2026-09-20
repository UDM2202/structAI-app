"""
Surgical patches to continuous_beam_service.py.

Run:  python3 patch_service.py services/continuous_beam_service.py

Same discipline as patch_engine.py: each target must appear exactly once or
nothing is written.
"""
import sys
import shutil

PATCHES = []


def patch(name, old, new):
    PATCHES.append((name, old, new))


# ---------------------------------------------------------------------------
# 1. LINK SPACING  --  read the engine's design instead of re-deriving it
#
# The service was computing its own spacing with
#     v_eds = v_ed - v_rdc          # then sizing links for v_eds only
# EC2 Cl.6.2.3(1) does not permit deducting VRd,c: once links are required
# they carry the WHOLE of VEd. That under-sized every link in the beam.
#
# It also had no VRd,max check, so a section whose compression strut crushes
# would have been reported as adequately linked.
#
# The engine now does the full design (Cl.6.2.3 + Cl.9.2.2 spacing limits +
# crushing check) and returns it per span. A support sits between two spans,
# so the tighter of the two spacings governs there.
# ---------------------------------------------------------------------------
patch(
    "link spacing from engine",
    """        # Calculate link spacing properly using the rigorous check
        shear_status = r["shear"].get("status", "OK")
        links_required = shear_status != "OK"
        
        # Calculate required spacing if links are needed
        if sh > 0 and links_required:
            # Use the rigorous shear capacity calculation
            v_rdc = r["shear"].get("VRdc_kN", 0)
            v_ed = sh
            asw = 2 * PI / 4 * link ** 2  # area of 2 legs
            z = 0.9 * d_eff
            
            # Calculate the required additional shear resistance
            v_rdc_new = v_rdc  # Should use the actual VRd,c from engine
            v_eds = v_ed - v_rdc_new
            
            if v_eds > 0:
                # V_Rd,s = (A_sw/s) * z * f_ywd * cot(theta)
                # For EC2: cot(theta) = 2.5 (default)
                cot_theta = 2.5
                s_calc = (asw * z * fyd * cot_theta) / (v_eds * 1000.0)
                # Clamp spacing between min and max
                spacing = max(75, int(min(s_calc, 0.75 * d_eff, 300) // 25 * 25))
            else:
                spacing = int(min(0.75 * d_eff, 300) // 25 * 25)
        else:
            # No links required - use maximum spacing
            spacing = int(min(0.75 * d_eff, 300) // 25 * 25)
        """,
    """        # Link design comes from the engine (EC2 Cl.6.2.3 + Cl.9.2.2).
        # A support lies between two spans, so the tighter spacing governs.
        eng_links = r["shear"].get("design", {})
        adjacent = [eng_links.get(f"Span {j}"), eng_links.get(f"Span {j + 1}")]
        adjacent = [a for a in adjacent if a]
        if adjacent:
            gov_link = min(adjacent, key=lambda a: a["spacing_mm"])
            spacing = gov_link["spacing_mm"]
            links_required = any(a["links_required"] for a in adjacent)
            link_status = "NOT OK" if any(a["status"] != "OK" for a in adjacent) else "OK"
            asw_s_req = max(a["Asw_s_required"] for a in adjacent)
            asw_s_prov = gov_link["Asw_s_provided"]
            governed_by = gov_link["governed_by"]
        else:
            spacing = int(min(0.75 * d_eff, 300) // 25 * 25)
            links_required = False
            link_status = "OK"
            asw_s_req = 0.0
            asw_s_prov = 0.0
            governed_by = "nominal"
        """,
)

# ---------------------------------------------------------------------------
# 2. Carry the link working through to the response so the results page can
#    show how the spacing was arrived at, not just the final provision.
# ---------------------------------------------------------------------------
patch(
    "support link payload",
    """            top_steel=top, links={"bar_diameter": link, "spacing": spacing, "legs": 2,
                                  "label": f"\\u00d8{link} @ {spacing} mm c/c"}))""",
    """            top_steel=top, links={"bar_diameter": link, "spacing": spacing, "legs": 2,
                                  "label": f"\\u00d8{link} @ {spacing} mm c/c",
                                  "required": bool(links_required),
                                  "status": link_status,
                                  "asw_s_required": round(asw_s_req, 4),
                                  "asw_s_provided": round(asw_s_prov, 4),
                                  "governed_by": governed_by}))""",
)

# ---------------------------------------------------------------------------
# 3. OVERALL STATUS  --  the serious one
#
# Was:
#     shear_ok = r["shear"]["status"] == "OK"
#
# The engine sets that string to "Links required" whenever VEd > VRd,c, which
# is the normal condition for almost any real continuous beam. The service
# then fed it straight into `overall`, so every beam that needed links --
# correctly designed links, adequate links -- was reported FAIL.
#
# Shear passes when the links actually designed are adequate and the strut
# does not crush. That is what links_ok / crush_ok report.
# ---------------------------------------------------------------------------
patch(
    "shear pass criterion",
    """    # Use the engine's shear status directly - NO ratio < 3.0 threshold
    shear_status = r["shear"].get("status", "OK")
    shear_ok = shear_status == "OK"
    util_shear = 1.0 if shear_ok else (max_shear / r["shear"].get("VRdc_kN", 1.0))""",
    """    # "status" only reports whether links are NEEDED, not whether the beam
    # is adequate. A beam with correctly designed links is safe; treating
    # "Links required" as a failure marked almost every real beam FAIL.
    no_links_needed = r["shear"].get("status", "OK") == "OK"
    links_ok = bool(r["shear"].get("links_ok", True))
    crush_ok = bool(r["shear"].get("crush_ok", True))
    shear_ok = links_ok and crush_ok

    eng_design = r["shear"].get("design", {})
    if no_links_needed:
        util_shear = round(max_shear / r["shear"].get("VRdc_kN", 1.0), 2) if r["shear"].get("VRdc_kN") else 0.0
    elif eng_design:
        # Utilisation of the links themselves, plus the crushing check.
        util_links = max((v["Asw_s_required"] / v["Asw_s_provided"])
                         for v in eng_design.values() if v["Asw_s_provided"]) \\
            if any(v["Asw_s_provided"] for v in eng_design.values()) else 0.0
        util_crush = max_shear / r["shear"].get("VRd_max_kN", 1.0) if r["shear"].get("VRd_max_kN") else 0.0
        util_shear = round(max(util_links, util_crush), 2)
    else:
        util_shear = 0.0""",
)

# ---------------------------------------------------------------------------
# 4. shear_detail  --  expose the link design to the results page
# ---------------------------------------------------------------------------
patch(
    "shear detail payload",
    """    shr = r["shear"]
    shear_detail = {
        "C_Rdc": shr.get("C_Rdc"), "k_factor": shr.get("k_factor"), "rho_l": shr.get("rho_l"),
        "v_min_mpa": shr.get("v_min_mpa"),
        "v_ed_mpa": round(max_shear * 1000 / (b * d_eff), 3) if (b * d_eff) else 0,
        "v_rdc_mpa": round(shr.get("VRdc_kN", 0) * 1000 / (b * d_eff), 3) if (b * d_eff) else 0,
        "links_required": not shear_ok,
        "shear_status": shear_status,
        "utilization": round(util_shear, 2),
    }""",
    """    shr = r["shear"]
    shear_detail = {
        "C_Rdc": shr.get("C_Rdc"), "k_factor": shr.get("k_factor"), "rho_l": shr.get("rho_l"),
        "v_min_mpa": shr.get("v_min_mpa"),
        "v_ed_mpa": round(max_shear * 1000 / (b * d_eff), 3) if (b * d_eff) else 0,
        "v_rdc_mpa": round(shr.get("VRdc_kN", 0) * 1000 / (b * d_eff), 3) if (b * d_eff) else 0,
        "links_required": not no_links_needed,
        "shear_status": shr.get("status", "OK"),
        "utilization": round(util_shear, 2),
        # link design, straight from the engine
        "VRdc_kN": shr.get("VRdc_kN"), "VRd_max_kN": shr.get("VRd_max_kN"),
        "z_mm": shr.get("z_mm"), "fywd_MPa": shr.get("fywd_MPa"),
        "cot_theta": shr.get("cot_theta"), "Asw_mm2": shr.get("Asw_mm2"),
        "s_max_ec2_mm": shr.get("s_max_ec2_mm"), "s_min_ratio_mm": shr.get("s_min_ratio_mm"),
        "links_ok": links_ok, "crush_ok": crush_ok,
        "per_span": shr.get("design", {}),
        "per_span_ends": shr.get("per_span_ends", {}),
    }""",
)

# ---------------------------------------------------------------------------
# 5. Warning text: say what was designed, and shout if the strut crushes.
# ---------------------------------------------------------------------------
patch(
    "shear warning",
    """    if not shear_ok:
        warnings.append(f"Shear design required: VEd = {max_shear:.1f} kN > VRd,c = {shr.get('VRdc_kN', 0):.1f} kN. Links provided at {support_results[0].links['spacing']} mm c/c.")""",
    """    if not no_links_needed:
        spacings = sorted({s.links["spacing"] for s in support_results})
        sp_txt = f"{spacings[0]} mm c/c" if len(spacings) == 1 else \\
            f"{spacings[0]}\\u2013{spacings[-1]} mm c/c"
        warnings.append(
            f"Shear links required: VEd = {max_shear:.1f} kN > VRd,c = "
            f"{shr.get('VRdc_kN', 0):.1f} kN. Designed to EC2 Cl.6.2.3 with the links "
            f"carrying the whole of VEd; \\u00d8{link} 2-leg at {sp_txt}. "
            "See report section 9b for the working.")
    if not crush_ok:
        warnings.append(
            f"SECTION TOO SMALL IN SHEAR: VEd = {max_shear:.1f} kN exceeds VRd,max = "
            f"{shr.get('VRd_max_kN', 0):.1f} kN. The compression strut crushes and no "
            "amount of link steel fixes this \\u2014 increase the section or the concrete grade.")""",
)

# ---------------------------------------------------------------------------
# 6. Notes line
# ---------------------------------------------------------------------------
patch(
    "shear note",
    """        f"Shear: {'Links required' if not shear_ok else 'No links required'}.",""",
    """        (f"Shear: links required and designed to EC2 Cl.6.2.3 \\u2014 the links carry the "
         f"whole of VEd, VRd,c is not deducted. Spacing also limited by Cl.9.2.2."
         if not no_links_needed else
         "Shear: VEd <= VRd,c on every span; nominal links only."),""",
)


def main(path):
    src = open(path, encoding="utf-8").read()
    shutil.copy(path, path + ".bak")
    for name, old, new in PATCHES:
        count = src.count(old)
        if count != 1:
            print(f"  [FAIL] '{name}': target found {count} times, expected 1. Nothing written.")
            return 1
        src = src.replace(old, new)
    open(path, "w", encoding="utf-8").write(src)
    for name, _o, _n in PATCHES:
        print(f"  [applied] {name}")
    print(f"\n  backup at {path}.bak")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "continuous_beam_service.py"))