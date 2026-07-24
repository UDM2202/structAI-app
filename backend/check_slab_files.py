#!/usr/bin/env python3
"""
Checks which of the slab files on disk are the UPDATED versions.

Run from the backend folder:
    python check_slab_files.py

Each file is identified by a marker that only exists in the new version.
"""
import os
import sys

CHECKS = [
    ("engine/one_way_slab_engine.py", [
        ("effective_depth_mm", "honours the user's effective depth"),
        ("C_MIN_DUR", "exposure class drives cover"),
        ("FIRE_REQ", "fire rating check"),
        ("def fctm_of", "f_ctm computed, not table"),
        ("user-specified (below code minimum)", "keeps cover below minimum + warns"),
    ]),
    ("services/slab_service.py", [
        ("_supported_kwargs", "passes all user inputs to the engine"),
        ("_build_one_way_input", "input builder"),
        ("_design_inputs_section", "'Design Inputs Used' report section"),
        ("span_ly=0.0", "no Ly on one-way results"),
        ("warnings=warnings", "warnings returned to the frontend"),
    ]),
    ("models/schemas.py", [
        ("clear_cover: float = 25.0", "cover on DesignSummary"),
        ("cover_tolerance", "cover tolerance accepted"),
        ("warnings: List[str]", "warnings channel"),
    ]),
]

FRONTEND = [
    ("../src/pages/StructuralResults.jsx", [
        ("rawData.warnings", "warning banner"),
        ("RebarSection", "rebar section drawing"),
        ('/two/i.test(summary.slab_type', "hides Ly for one-way"),
    ]),
    ("../src/pages/StructuralInput.jsx", [
        ("mainBarDia", "main bar selector"),
        ("coverTolerance", "cover tolerance field"),
        ("additionalLiveLoad", "extra live load field"),
    ]),
    ("../src/utils/exportPdf.js", [
        ("__print_sheet", "clone-based print (fixes repeated pages)"),
    ]),
    ("../src/components/DetailedReport.jsx", [
        ("exportElementToPdf", "report print wired to the util"),
    ]),
]


def check(group, title):
    print(f"\n{title}")
    print("-" * 68)
    all_ok = True
    for path, markers in group:
        if not os.path.exists(path):
            print(f"  [MISSING FILE] {path}")
            all_ok = False
            continue
        try:
            body = open(path, encoding="utf-8", errors="ignore").read()
        except OSError as e:
            print(f"  [UNREADABLE] {path}: {e}")
            all_ok = False
            continue
        missing = [(m, d) for m, d in markers if m not in body]
        if not missing:
            print(f"  UPDATED   {path}")
        else:
            all_ok = False
            print(f"  OLD       {path}")
            for m, d in missing:
                print(f"              missing: {d}")
    return all_ok


if __name__ == "__main__":
    if not os.path.isdir("engine") or not os.path.isdir("services"):
        print("Run this from the backend folder (it should contain engine/ and services/).")
        sys.exit(2)
    a = check(CHECKS, "BACKEND")
    b = check(FRONTEND, "FRONTEND")
    print()
    if a and b:
        print("All files are the updated versions.")
    else:
        print("Files marked OLD still need to be replaced, then restart the backend")
        print("and hard-refresh the browser (Ctrl+Shift+R).")
        sys.exit(1)