"""
column_subframe.py — derive column design moments from the frame geometry.

The column engine takes N_Ed and first-order end moments as given. This module
produces them, so the user supplies building geometry and loads rather than
design actions.

Method: the simplified sub-frame. At each joint the beams framing in carry
fixed-end moments wL^2/12. If they do not cancel, the out-of-balance moment is
shared between the members meeting at that joint in proportion to their
stiffness K = I/L. The column's share is its design moment at that end.

    FEM_a = w*La^2/12          FEM_b = w*Lb^2/12
    dM    = FEM_b - FEM_a
    M_col = dM * K_col / (K_col,above + K_col,below + K_beam,a + K_beam,b)

Equal spans carrying equal load give dM = 0 and therefore no column moment,
which is the behaviour an engineer expects from a balanced interior frame.

This is a pre-processor. It does not touch the engine: it returns the same
M01/M02 dictionaries the engine already consumes, so the engine's verification
against published worked examples is unaffected.

Scope and limits, stated plainly because they decide when this is usable:
  * Braced frames. No sway moments, no lateral load.
  * Far ends of the beams are taken as fixed, per the usual simplification.
  * Beam stiffness is halved for cracking, which is the common assumption and
    matches what Ubani does when computing joint flexibilities.
  * Pattern loading is NOT applied. Both beams carry the same load case, so a
    symmetric bay returns zero moment. Where pattern loading governs, the
    minimum eccentricity in the engine is what protects the design.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ============================================================
# INPUT
# ============================================================

@dataclass
class SubFrameBeam:
    """One beam framing into the joint, in one direction."""
    span_m: float
    width_m: float
    depth_m: float
    udl_kN_per_m: float          # ultimate load per metre on the beam

    @property
    def I_m4(self) -> float:
        return self.width_m * self.depth_m ** 3 / 12.0

    def stiffness(self, cracked: bool = True) -> float:
        """K = I/L, halved for cracking."""
        if self.span_m <= 0:
            return 0.0
        factor = 0.5 if cracked else 1.0
        return factor * self.I_m4 / self.span_m

    def fem_kNm(self) -> float:
        """Fixed end moment wL^2/12."""
        return self.udl_kN_per_m * self.span_m ** 2 / 12.0


@dataclass
class SubFrameJoint:
    """
    One floor level. Beams in each direction, and the columns above and below.

    height_above_m is zero at roof level, where no column continues upward and
    the joint's whole out-of-balance moment goes into the column below.
    """
    level: str
    beam_x_a: Optional[SubFrameBeam] = None   # left
    beam_x_b: Optional[SubFrameBeam] = None   # right
    beam_y_a: Optional[SubFrameBeam] = None   # top
    beam_y_b: Optional[SubFrameBeam] = None   # bottom
    height_above_m: float = 0.0
    height_below_m: float = 0.0
    # Where the column changes section at this joint, the two stiffnesses
    # differ and the out-of-balance splits differently. Left as None the
    # single column passed to analyse() is used for both.
    column_above: Optional["SubFrameColumn"] = None
    column_below: Optional["SubFrameColumn"] = None


@dataclass
class SubFrameColumn:
    b_mm: float
    h_mm: float

    @property
    def Ix_m4(self) -> float:
        """Second moment about x, the axis whose depth is h."""
        return (self.b_mm / 1000.0) * (self.h_mm / 1000.0) ** 3 / 12.0

    @property
    def Iy_m4(self) -> float:
        return (self.h_mm / 1000.0) * (self.b_mm / 1000.0) ** 3 / 12.0

    def stiffness(self, axis: str, height_m: float) -> float:
        if height_m <= 0:
            return 0.0
        I = self.Ix_m4 if axis == "x" else self.Iy_m4
        return I / height_m


# ============================================================
# RESULT
# ============================================================

@dataclass
class JointMoments:
    level: str
    axis: str
    fem_a: float
    fem_b: float
    out_of_balance: float
    K_beam_a: float
    K_beam_b: float
    K_col_above: float
    K_col_below: float
    K_total: float
    M_col_above: float
    M_col_below: float


@dataclass
class SubFrameResult:
    joints: List[JointMoments] = field(default_factory=list)
    M01x: Dict[str, float] = field(default_factory=dict)
    M02x: Dict[str, float] = field(default_factory=dict)
    M01y: Dict[str, float] = field(default_factory=dict)
    M02y: Dict[str, float] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)


# ============================================================
# ANALYSIS
# ============================================================

def joint_moments(
    joint: SubFrameJoint,
    column: SubFrameColumn,
    axis: str,
    cracked_beams: bool = True,
) -> JointMoments:
    """Distribute one joint's out-of-balance moment to the columns."""
    if axis == "x":
        beam_a, beam_b = joint.beam_x_a, joint.beam_x_b
    else:
        beam_a, beam_b = joint.beam_y_a, joint.beam_y_b

    fem_a = beam_a.fem_kNm() if beam_a else 0.0
    fem_b = beam_b.fem_kNm() if beam_b else 0.0
    dM = fem_b - fem_a

    K_ba = beam_a.stiffness(cracked_beams) if beam_a else 0.0
    K_bb = beam_b.stiffness(cracked_beams) if beam_b else 0.0
    col_a = joint.column_above or column
    col_b = joint.column_below or column
    K_ca = col_a.stiffness(axis, joint.height_above_m)
    K_cb = col_b.stiffness(axis, joint.height_below_m)
    K_tot = K_ba + K_bb + K_ca + K_cb

    if K_tot <= 0:
        M_above = M_below = 0.0
    else:
        M_above = dM * K_ca / K_tot
        M_below = dM * K_cb / K_tot

    return JointMoments(
        level=joint.level, axis=axis,
        fem_a=fem_a, fem_b=fem_b, out_of_balance=dM,
        K_beam_a=K_ba, K_beam_b=K_bb,
        K_col_above=K_ca, K_col_below=K_cb, K_total=K_tot,
        M_col_above=M_above, M_col_below=M_below,
    )


def analyse(
    joints: List[SubFrameJoint],
    column: SubFrameColumn,
    base_fixed: bool = False,
    cracked_beams: bool = True,
) -> SubFrameResult:
    """
    Run every joint and assemble the per-level end moments.

    `joints` must be ordered top down: roof first, then each floor below it.
    A column in the storey beneath joint i has its TOP moment from joint i and
    its BOTTOM moment from joint i+1. The lowest column's bottom end sits at
    the foundation, which carries moment only if the base is fixed.
    """
    result = SubFrameResult()
    per_joint: Dict[str, Dict[str, JointMoments]] = {}

    for j in joints:
        per_joint[j.level] = {
            ax: joint_moments(j, column, ax, cracked_beams) for ax in ("x", "y")
        }
        result.joints.extend(per_joint[j.level].values())

    for i, j in enumerate(joints):
        level = j.level
        below = joints[i + 1] if i + 1 < len(joints) else None

        for ax, d01, d02 in (("x", result.M01x, result.M02x),
                             ("y", result.M01y, result.M02y)):
            m_top = per_joint[level][ax].M_col_below      # column below this joint
            if below is not None:
                m_bot = per_joint[below.level][ax].M_col_above
            else:
                m_bot = m_top if base_fixed else 0.0

            # Beam end moments at the two ends of a column act in opposite
            # senses, which is what produces double curvature. Signing the
            # lower end negative captures that; the engine orders them by
            # magnitude afterwards.
            d01[level] = round(-m_bot, 4)
            d02[level] = round(m_top, 4)

    if not base_fixed:
        result.notes.append(
            "Base taken as pinned, so the lowest column carries no moment at its "
            "foundation end."
        )
    result.notes.append(
        "Pattern loading is not applied: both beams at a joint carry the same "
        "load case, so a symmetric bay returns zero moment and the design falls "
        "back on minimum eccentricity."
    )
    return result


# ============================================================
# BUILDING A SUB-FRAME FROM THE COLUMN INPUT
# ============================================================

def beam_udl_kN_per_m(
    q_uls_kN_per_m2: float,
    tributary_width_m: float,
    beam_width_m: float,
    beam_depth_m: float,
    concrete_density: float,
    wall_load_kN_per_m: float,
    gamma_G: float,
) -> float:
    """
    Load per metre on a beam: its share of the slab, its own weight, and any
    wall it carries. The slab share is the tributary width measured
    perpendicular to the beam.
    """
    slab = q_uls_kN_per_m2 * tributary_width_m
    self_wt = gamma_G * beam_width_m * beam_depth_m * concrete_density
    wall = gamma_G * wall_load_kN_per_m
    return slab + self_wt + wall