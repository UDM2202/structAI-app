"""
Patches models/column_schemas.py and services/column_service.py so the engine
derives the first-order moments instead of asking for them.

Run from backend/:
    python3 patch_column_backend.py

Drop services/column_frame_bridge.py in place first -- the service imports it.
Same discipline as the beam patches: exact-match-once or nothing is written.
"""
import shutil, sys

JOBS = [
    ("models/column_schemas.py", [
        ("frame options",
'''class ColAnalysisOptions(BaseModel):''',
'''class ColFrameOptions(BaseModel):
    """
    How the design actions are obtained. Default is to derive them: the user
    supplies building geometry and loads, never moments.
    """
    derive_moments: bool = True
    base_fixed: bool = Field(
        False,
        description="True if the foundation is designed to resist moment. A pinned "
                    "base carries none, so the lowest column has zero moment there.",
    )
    cracked_beam_stiffness: bool = Field(
        True,
        description="Halve beam I for cracking when distributing the joint moment. "
                    "EC2 practice halves it; BS 8110 worked examples typically do not. "
                    "Halving raises the column's share, so it is the conservative side.",
    )


class ColAnalysisOptions(BaseModel):'''),
        ("frame on request",
'''    effective_length: ColEffectiveLength = ColEffectiveLength()
    analysis: ColAnalysisOptions = ColAnalysisOptions()''',
'''    effective_length: ColEffectiveLength = ColEffectiveLength()
    analysis: ColAnalysisOptions = ColAnalysisOptions()
    frame: ColFrameOptions = ColFrameOptions()'''),
        ("relax moment validator",
'''    @model_validator(mode="after")
    def _moments_match_route(self):
        if self.column_type == ColumnType.AXIAL:
            return self''',
'''    @model_validator(mode="after")
    def _moments_match_route(self):
        if self.column_type == ColumnType.AXIAL:
            return self
        if self.frame.derive_moments:
            # The sub-frame produces them; demanding them as input would
            # defeat the point of deriving them.
            return self'''),
    ]),
    ("services/column_service.py", [
        ("derive moments",
'''def design_column(req: ColumnDesignRequest) -> ColumnDesignResult:
    engine = ColumnEngine(to_engine_input(req))''',
'''def design_column(req: ColumnDesignRequest) -> ColumnDesignResult:
    eng_in = to_engine_input(req)
    subframe_rows = []
    if req.frame.derive_moments and req.column_type.value != "axial" \\
            and req.NEd_override_kN is None:
        # Derive the first-order end moments from the frame geometry rather
        # than asking the user for them.
        from services.column_frame_bridge import build_subframe, subframe_report
        res, trace = build_subframe(req)
        eng_in.M01x_kNm = dict(res.M01x)
        eng_in.M02x_kNm = dict(res.M02x)
        eng_in.M01y_kNm = dict(res.M01y)
        eng_in.M02y_kNm = dict(res.M02y)
        subframe_rows = subframe_report(res, trace)

    engine = ColumnEngine(eng_in)'''),
        ("insert derivation section",
'''    raw = engine.run()''',
'''    raw = engine.run()
    if subframe_rows:
        # Insert the derivation ahead of the moment section so the report
        # reads in the order the calculation actually happened.
        raw["report"].insert(6, {"title": "6b. DESIGN MOMENTS FROM SUB-FRAME",
                                 "rows": subframe_rows})'''),
    ]),
]


def main():
    for path, patches in JOBS:
        try:
            src = open(path, encoding="utf-8").read()
        except FileNotFoundError:
            print(f"  [FAIL] {path} not found. Run from backend/.")
            return 1
        for name, old, new in patches:
            c = src.count(old)
            if c != 1:
                print(f"  [FAIL] {path}: '{name}' found {c} times, expected 1. Nothing written.")
                return 1
            src = src.replace(old, new)
        shutil.copy(path, path + ".bak")
        open(path, "w", encoding="utf-8").write(src)
        print(f"  [patched] {path}  ({len(patches)} changes, backup at .bak)")
    return 0


if __name__ == "__main__":
    sys.exit(main())