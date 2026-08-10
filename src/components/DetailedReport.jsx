// src/components/DetailedReport.jsx
// Reusable calculation-report modal (Reference / Calculations / Output).
// Theme-aware: light by default, dark when the app theme toggles `dark` on <html>.
//
// PRINT FIX: the previous version printed in place with
//   .dr-report { position: absolute }
// while its parent overlay is `fixed inset-0`. A position:fixed ancestor is
// repainted on EVERY printed page, which is what produced N identical pages.
// It now hands the report body to exportElementToPdf(), which clones the
// content into a plain <div> on <body> (no fixed ancestor) and prints once.
import React, { useRef, useState } from "react";
import { FiX, FiDownload, FiAlertTriangle } from "react-icons/fi";
import { exportElementToPdf } from "../utils/exportPdf";

export default function DetailedReport({
  report = [],
  heading = "Detailed Calculation Report",
  subtitle = "",
  onClose,
  overallStatus,          // "PASS" | "FAIL" -- drives the increase-thickness prompt
  currentThickness,       // current thickness in mm, used to prefill the form
  onIncreaseThickness,    // (newThicknessMm) => void -- triggers a re-run in the parent
  isRerunning = false,    // parent is mid re-run -- disables the form, shows a spinner state
}) {
  const sheetRef = useRef(null);
  const [showThicknessForm, setShowThicknessForm] = useState(false);
  const [newThickness, setNewThickness] = useState(
    currentThickness ? Number(currentThickness) + 25 : 200
  );

  const handlePrint = () => {
    const name = heading.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    exportElementToPdf(sheetRef.current, name || "calculation-report");
  };

  const handleRerun = () => {
    if (onIncreaseThickness && newThickness > 0) {
      onIncreaseThickness(newThickness);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="dr-report w-full max-w-5xl rounded-xl bg-white text-[#0F172A] shadow-2xl ring-1 ring-black/5 dark:bg-[#0f172a] dark:text-slate-200 dark:ring-white/10">
        <div className="dr-no-print sticky top-0 flex items-center justify-between border-b border-[#e2e8f0] bg-white px-6 py-4 dark:border-white/10 dark:bg-[#0f172a]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">{heading}</h2>
            {subtitle ? <p className="text-xs text-[#64748b] dark:text-slate-400">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-[#e6f0f5] px-3 py-1.5 text-sm text-[#0A2F44] hover:bg-[#d4e6ef] dark:bg-[#1e3a4a] dark:text-[#66a4c2] dark:hover:bg-[#22485c]"
            >
              <FiDownload size={14} /> Print / PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0F172A] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* everything inside this ref is what gets printed */}
        <div ref={sheetRef} className="px-6 py-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">{heading}</h2>
            {subtitle ? <p className="text-xs text-[#64748b] dark:text-slate-400">{subtitle}</p> : null}
          </div>

          <div className="grid grid-cols-[170px_1fr_190px] gap-4 border-b border-[#e2e8f0] pb-3 text-sm font-semibold text-[#0F172A] dark:border-white/10 dark:text-white">
            <div>Reference</div><div>Calculations</div><div>Output</div>
          </div>

          {report.map((sec, si) => (
            <div key={si} className="dr-section">
              <div className="mt-4 mb-1 text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">
                {sec.title}
              </div>
              {sec.rows.map((r, ri) => (
                <div
                  key={ri}
                  className="dr-row grid grid-cols-[170px_1fr_190px] gap-4 border-b border-[#f1f5f9] py-3 text-[13px] dark:border-white/5"
                >
                  <div className="font-mono text-[12px] text-[#64748b] dark:text-slate-400">{r.reference}</div>
                  <div className="whitespace-pre-line font-mono leading-relaxed text-[#334155] dark:text-slate-200">{r.calculation}</div>
                  <div className="whitespace-pre-line font-mono font-semibold text-[#0F172A] dark:text-white">{r.output}</div>
                </div>
              ))}
            </div>
          ))}

          {report.length === 0 && (
            <p className="py-8 text-center text-sm text-[#64748b] dark:text-slate-400">
              No calculation trace available. Re-run the design after updating the backend so the engine returns <code>report</code>.
            </p>
          )}

          <p className="mt-5 text-[11px] text-[#94a3b8] dark:text-slate-500">
            Calculation trace generated from the design engine. Verify coefficients and code clauses against your reference copy before use.
          </p>
        </div>

        {/* dr-no-print: kept outside the printable ref on purpose, this is an
            interactive action, not part of the calculation record */}
        {overallStatus === "FAIL" && onIncreaseThickness && (
          <div className="dr-no-print border-t border-[#e2e8f0] px-6 py-4 dark:border-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
              <FiAlertTriangle size={16} /> One or more checks failed.
            </div>
            {!showThicknessForm ? (
              <button
                onClick={() => setShowThicknessForm(true)}
                className="mt-3 rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636]"
              >
                Increase Thickness
              </button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-[13px] text-[#334155] dark:text-slate-300">
                  New thickness (mm)
                </label>
                <input
                  type="number"
                  min={currentThickness ? Number(currentThickness) + 1 : 1}
                  step={25}
                  value={newThickness}
                  onChange={(e) => setNewThickness(Number(e.target.value))}
                  disabled={isRerunning}
                  className="w-28 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-sm dark:border-white/10 dark:bg-[#0f172a] dark:text-white"
                />
                <button
                  onClick={handleRerun}
                  disabled={isRerunning || !(newThickness > (Number(currentThickness) || 0))}
                  className="rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636] disabled:opacity-50"
                >
                  {isRerunning ? "Re-running..." : "Re-run Design"}
                </button>
                <button
                  onClick={() => setShowThicknessForm(false)}
                  disabled={isRerunning}
                  className="text-sm text-[#64748b] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}