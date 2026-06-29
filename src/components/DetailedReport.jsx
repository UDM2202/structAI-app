// src/components/DetailedReport.jsx
// Reusable calculation-report modal (Reference / Calculations / Output).
// Theme-aware: light by default, dark when the app theme toggles `dark` on <html>.
import React from "react";
import { FiX, FiDownload } from "react-icons/fi";

export default function DetailedReport({ report = [], heading = "Detailed Calculation Report", subtitle = "", onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="dr-report w-full max-w-5xl rounded-xl bg-white text-[#0F172A] shadow-2xl ring-1 ring-black/5 dark:bg-[#0f172a] dark:text-slate-200 dark:ring-white/10">
        <div className="dr-no-print sticky top-0 flex items-center justify-between border-b border-[#e2e8f0] bg-white px-6 py-4 dark:border-white/10 dark:bg-[#0f172a]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">{heading}</h2>
            {subtitle ? <p className="text-xs text-[#64748b] dark:text-slate-400">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#e6f0f5] px-3 py-1.5 text-sm text-[#0A2F44] hover:bg-[#d4e6ef] dark:bg-[#1e3a4a] dark:text-[#66a4c2] dark:hover:bg-[#22485c]"><FiDownload size={14} /> Print / PDF</button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0F172A] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"><FiX size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-[170px_1fr_190px] gap-4 border-b border-[#e2e8f0] pb-3 text-sm font-semibold text-[#0F172A] dark:border-white/10 dark:text-white">
            <div>Reference</div><div>Calculations</div><div>Output</div>
          </div>
          {report.map((sec, si) => (
            <div key={si}>
              <div className="mt-4 mb-1 text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">{sec.title}</div>
              {sec.rows.map((r, ri) => (
                <div key={ri} className="grid grid-cols-[170px_1fr_190px] gap-4 border-b border-[#f1f5f9] py-3 text-[13px] dark:border-white/5">
                  <div className="font-mono text-[12px] text-[#64748b] dark:text-slate-400">{r.reference}</div>
                  <div className="whitespace-pre-line font-mono leading-relaxed text-[#334155] dark:text-slate-200">{r.calculation}</div>
                  <div className="whitespace-pre-line font-mono font-semibold text-[#0F172A] dark:text-white">{r.output}</div>
                </div>
              ))}
            </div>
          ))}
          {report.length === 0 && (
            <p className="py-8 text-center text-sm text-[#64748b] dark:text-slate-400">No calculation trace available. Re-run the design after updating the backend so the engine returns <code>report</code>.</p>
          )}
          <p className="mt-5 text-[11px] text-[#94a3b8] dark:text-slate-500">Calculation trace generated from the design engine. Verify coefficients and code clauses against your reference copy before use.</p>
        </div>
      </div>
      <style>{`@media print { .dr-no-print{display:none!important} body *{visibility:hidden} .dr-report,.dr-report *{visibility:visible} .dr-report{position:absolute;left:0;top:0;width:100%;background:#fff;color:#000} }`}</style>
    </div>
  );
}