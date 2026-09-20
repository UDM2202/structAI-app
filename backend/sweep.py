"""
Static sweep for the JSX pages. esbuild parses all three of the failure modes
below without complaint -- each one only shows up as a blank page at runtime:
  1. a component rendered but never defined or imported   (StepLoads)
  2. an identifier used in a component body but not a prop (useFinalMEd)
  3. a module constant used but never declared             (LABEL)
Run on every edit.
"""
import os
import re, sys

def strip_comments(src):
    """Comment banners like /* === SHARED === */ otherwise read as constants."""
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    src = re.sub(r'^\s*//.*$', '', src, flags=re.M)
    return src


def sweep(path):
    try:
        raw = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"  {path}: NOT FOUND -- run this from the repo root, not backend/.")
        print( "    e.g.  python backend\\sweep.py src\\pages\\ColumnInput.jsx")
        return False
    s = strip_comments(raw)
    # Two different scopes, deliberately.
    #
    # `anywhere` is every binding in the file at any nesting -- used for the
    # component and constant checks, because DIM is declared inside an SVG
    # component and Icon comes from a destructured rename.
    anywhere = set(re.findall(r'\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', s))
    anywhere |= set(re.findall(r',\s*([A-Za-z_$][\w$]*)\s*=', s))
    anywhere |= set(re.findall(r'[{,]\s*\w+\s*:\s*([A-Za-z_$][\w$]*)\s*[,}]', s))

    # `module_scope` is only top-level declarations -- used for the prop check,
    # which must NOT treat a name bound inside some other function as available
    # here. Widening this is what makes a missing prop slip through.
    module_scope = set(re.findall(r'^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', s, re.M))
    module_scope |= set(re.findall(r'^const\s+[^=\n]*?,\s*([A-Za-z_$][\w$]*)\s*=', s, re.M))

    imported = set(re.findall(r'import\s+(\w+)\s+from', s)) | set(
        x.strip().split(' as ')[-1]
        for m in re.findall(r'import\s*\{([^}]*)\}', s) for x in m.split(','))
    BUILTINS = {"React", "Math", "Object", "Number", "Array", "JSON", "String",
                "Boolean", "document", "window", "console"}
    known = anywhere | imported | BUILTINS          # components / constants
    scope = module_scope | imported | BUILTINS      # props

    problems = []

    for t in sorted(set(re.findall(r'<([A-Z][\w]*)', s))):
        if t not in known:
            problems.append(f"component <{t}> rendered but never defined or imported")

    # module-level SCREAMING_CASE constants used anywhere
    for c in sorted(set(re.findall(r'\b([A-Z][A-Z0-9_]{2,})\b', s))):
        if c not in known and c not in ("PASS", "FAIL", "OK", "NOT"):
            if re.search(r'className=\{' + c + r'\}|=\s*' + c + r'\b|\{' + c + r'\}', s):
                problems.append(f"constant {c} used but never declared")

    # Prop check, against a curated list. A general "any identifier with a dot"
    # rule flags prose inside JSX text ("this storey." looks like storey.x), so
    # the list stays explicit -- it is short and these are the props that have
    # actually gone missing.
    WATCH = ("form", "set", "levels", "shown", "crit", "varies", "shownIdx",
             "setLevelIdx", "setLevel", "setLevelFloor", "setLevelBeam",
             "setFloor", "setBeam", "directLoad", "isAxial", "isBiaxial",
             "isUniaxial", "uniAx", "useFinalMEd", "layout", "inherit",
             "az", "opts", "sel", "chosen", "stepName", "STEPS")
    for m in re.finditer(r'function ([A-Z]\w*)\(\{([^}]*)\}\)\s*\{', s):
        name = m.group(1)
        params = {p.strip().split(':')[0].split('=')[0].strip() for p in m.group(2).split(',')}
        i, d = m.end(), 1
        while i < len(s) and d:
            d += (s[i] == '{') - (s[i] == '}'); i += 1
        body = s[m.end():i]
        locals_ = set(re.findall(r'(?:const|let|var)\s+([A-Za-z_$][\w$]*)', body))
        locals_ |= set(re.findall(r'\(\s*\(?([a-z_$][\w$]*)\)?\s*(?:,\s*\w+\s*)?\)\s*=>', body))
        for ident in WATCH:
            if re.search(r'\b' + ident + r'\s*[.\[]', body) and ident not in params \
                    and ident not in locals_ and ident not in scope:
                problems.append(f"{name}: '{ident}' is neither a prop nor a local")

    problems = sorted(set(problems))
    print(f"  {path}: {'clean' if not problems else str(len(problems)) + ' problem(s)'}")
    for p in problems:
        print(f"    - {p}")
    return not problems

if __name__ == "__main__":
    import glob
    args = sys.argv[1:]
    if not args:
        # No arguments: find the pages wherever they are, from anywhere in the repo.
        for root in (".", "..", "src", "../src"):
            args += glob.glob(f"{root}/**/Column*.jsx", recursive=True)
            args += glob.glob(f"{root}/**/BeamInput.jsx", recursive=True)
        args = sorted(set(os.path.normpath(a) for a in args))
        if not args:
            print("  no JSX pages found -- pass paths explicitly")
            sys.exit(1)
        print(f"  no paths given; found {len(args)} page(s)\n")
    ok = all(sweep(p) for p in args)
    sys.exit(0 if ok else 1)