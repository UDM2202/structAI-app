# backend/engine/spacing_rules.py
"""
Bar spacing entered by the designer (slabs, continuous slabs, footings).

None -> the engine chooses the spacing as before. A number -> that spacing is
used as entered (never changed by the engine) and checked:
  - EC2 9.3.1.1(3): principal bars in areas of maximum moment s <= min(2h, 250)
  - EC2 8.2(2):     clear gap s - phi >= max(phi, dg + 5, 20), dg = 20 mm assumed
If the spacing does not carry the moment, or breaks either limit, the design
fails and says so (the same rule as a bar size chosen by the designer).
"""
from typing import List, Optional, Tuple


def s_max_main(h_mm: float) -> float:
    return min(2.0 * h_mm, 250.0)


def s_min(phi_mm: float, dg_mm: float = 20.0) -> float:
    return phi_mm + max(phi_mm, dg_mm + 5.0, 20.0)


def check(s_mm: Optional[float], h_mm: float, phi_mm: float) -> Tuple[bool, str]:
    """(ok, note) for a designer's spacing; (True, "") when the engine chose it."""
    if not s_mm:
        return True, ""
    smax, smin = s_max_main(h_mm), s_min(phi_mm)
    if s_mm > smax + 1e-9:
        return False, f"spacing {s_mm:.0f} mm > s_max = min(2h, 250) = {smax:.0f} mm (EC2 9.3.1.1(3))"
    if s_mm < smin - 1e-9:
        return False, (f"spacing {s_mm:.0f} mm leaves a clear gap of {s_mm - phi_mm:.0f} mm < "
                       f"{smin - phi_mm:.0f} mm (EC2 8.2(2), dg 20 mm assumed)")
    return True, ""


def report_rows(s_mm: Optional[float], h_mm: float, phi_mm: float, where: str = "") -> List[Tuple[str, str, str]]:
    """(reference, calculation, output) rows for a designer's spacing; [] when the engine chose it."""
    if not s_mm:
        return []
    smax, smin = s_max_main(h_mm), s_min(phi_mm)
    tag = f" — {where}" if where else ""
    return [
        (f"Spacing{tag}", "set by the designer, used as entered (the engine does not change it)", f"s = {s_mm:.0f} mm"),
        ("EC2 §9.3.1.1(3)", f"s ≤ min(2h, 250) = min({2 * h_mm:.0f}, 250) = {smax:.0f} mm; provided {s_mm:.0f} mm",
         "OK" if s_mm <= smax + 1e-9 else "SPACING TOO WIDE"),
        ("EC2 §8.2(2)", f"clear gap s − φ = {s_mm - phi_mm:.0f} ≥ max(φ, d_g + 5, 20) = {smin - phi_mm:.0f} mm (d_g 20 assumed)",
         "OK" if s_mm >= smin - 1e-9 else "BARS TOO CLOSE"),
    ]
