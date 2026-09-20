"""
Patch beam_cont_engine.py so a span with no sagging is reported as such.

Run from backend/:
    python3 patch_negative_sagging.py engine/beam_cont_engine.py

Un-clamping the span moment was correct -- a short span between two long ones
genuinely never reaches sagging, and hiding that behind a zero was the original
bug. But feeding the negative value into the flexure routine produces a
negative K and a negative As,req, which are meaningless and should not reach a
user. The provided steel was already right (As,min governs); only the reported
working was wrong.
"""
import shutil, sys

OLD = '''    span_design = {}
    for sp, M in span_moments.items():
        b_eff = beff[sp]
        Kf, z, As_req = flex(M, b_eff)                         # sagging = T-beam
        As_des = max(As_req, As_min)
        n, dia, As_prov = choose_bars(As_des, bar_diameters)
        x_approx = As_req * 0.87 * d.fyk / (0.8 * d.fck * b_eff)
        span_design[sp] = {"M_kNm": round(M, 3), "beff_mm": round(b_eff, 1), "K": round(Kf, 5),
                           "z_mm": round(z, 1), "x_mm": round(x_approx, 1),
                           "As_req_mm2": round(As_req, 1), "As_design_mm2": round(As_des, 1),
                           "bars": f"{n}Y{dia}", "As_provided_mm2": round(As_prov, 1),
                           "neutral_axis_in_flange": bool(x_approx <= d.slab_thickness_mm),
                           "status": "OK" if bool(As_prov >= As_des) else "NOT OK"}'''

NEW = '''    span_design = {}
    for sp, M in span_moments.items():
        b_eff = beff[sp]
        if M <= 0:
            # No sagging anywhere in this span: both ends hog hard enough that
            # the free moment never lifts the diagram positive. Common on a
            # short span between two long ones. Running the flexure routine on
            # a negative moment would give a negative K and a negative As,req,
            # so report the condition instead and provide minimum steel.
            As_des = As_min
            n, dia, As_prov = choose_bars(As_des, bar_diameters)
            span_design[sp] = {"M_kNm": round(M, 3), "beff_mm": round(b_eff, 1),
                               "K": None, "z_mm": None, "x_mm": None,
                               "As_req_mm2": 0.0, "As_design_mm2": round(As_des, 1),
                               "bars": f"{n}Y{dia}", "As_provided_mm2": round(As_prov, 1),
                               "neutral_axis_in_flange": None,
                               "no_sagging": True,
                               "note": ("span is fully hogging -- the free moment never "
                                        "exceeds the end moments, so minimum steel governs "
                                        "the bottom face"),
                               "status": "OK" if bool(As_prov >= As_des) else "NOT OK"}
            continue
        Kf, z, As_req = flex(M, b_eff)                         # sagging = T-beam
        As_des = max(As_req, As_min)
        n, dia, As_prov = choose_bars(As_des, bar_diameters)
        x_approx = As_req * 0.87 * d.fyk / (0.8 * d.fck * b_eff)
        span_design[sp] = {"M_kNm": round(M, 3), "beff_mm": round(b_eff, 1), "K": round(Kf, 5),
                           "z_mm": round(z, 1), "x_mm": round(x_approx, 1),
                           "As_req_mm2": round(As_req, 1), "As_design_mm2": round(As_des, 1),
                           "bars": f"{n}Y{dia}", "As_provided_mm2": round(As_prov, 1),
                           "neutral_axis_in_flange": bool(x_approx <= d.slab_thickness_mm),
                           "no_sagging": False,
                           "status": "OK" if bool(As_prov >= As_des) else "NOT OK"}'''

OLD_R = '''    for sp, M in span_moments.items():
        b_eff = beff[sp]
        sd = span_design[sp]
        root = max(0.25 - sd["K"] / 1.134, 0.0)'''

NEW_R = '''    for sp, M in span_moments.items():
        b_eff = beff[sp]
        sd = span_design[sp]
        if sd.get("no_sagging"):
            span_rows.append(R2(f"{sp} -- beff", "bw + beff1 + beff2", f"{b_eff:.1f} mm"))
            span_rows.append(R2(f"{sp} -- no sagging",
                                f"end moments {M:.2f} kNm peak: the free moment never lifts "
                                "this span positive, so there is no sagging to design for",
                                "fully hogging"))
            span_rows.append(R2(f"{sp} -- provide",
                                f"bottom face takes As,min = {As_min:.0f} mm2",
                                f"{sd[\'bars\']} ({sd[\'status\']})"))
            continue
        root = max(0.25 - sd["K"] / 1.134, 0.0)'''


def main(path):
    src = open(path, encoding="utf-8").read()
    for name, old, new in (("span design", OLD, NEW), ("span report rows", OLD_R, NEW_R)):
        c = src.count(old)
        if c != 1:
            print(f"  [FAIL] '{name}': found {c} times, expected 1. Nothing written.")
            return 1
        src = src.replace(old, new)
    shutil.copy(path, path + ".bak")
    open(path, "w", encoding="utf-8").write(src)
    print("  [applied] span design")
    print("  [applied] span report rows")
    print(f"  backup at {path}.bak")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "engine/beam_cont_engine.py"))