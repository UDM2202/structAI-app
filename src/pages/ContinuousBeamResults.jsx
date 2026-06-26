// src/pages/ContinuousBeamResults.jsx — renders inside MainLayout
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiArrowLeft, FiAlertTriangle, FiCheckCircle, FiXCircle, FiFileText,
  FiDownload, FiX, FiLayers, FiGrid, FiActivity, FiBox, FiZap, FiBarChart2,
} from "react-icons/fi";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl border border-[#e2e8f0] dark:border-[#334155] shadow-sm";
const MAIN = "text-[#0F172A] dark:text-white";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const ACCENT = "text-[#0A2F44] dark:text-[#66a4c2]";
const HOG = "#ef4444";   // negative / hogging
const SAG = "#22c55e";   // positive / sagging

export default function ContinuousBeamResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state?.designResult;
  const [reportOpen, setReportOpen] = useState(false);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="mx-auto mb-4 text-6xl text-yellow-500" />
          <h2 className={`mb-2 text-xl font-bold ${MAIN}`}>No continuous beam results</h2>
          <p className={`mb-6 ${SUB}`}>Run a continuous beam design first.</p>
          <button onClick={() => navigate("/continuous-beam")} className="rounded-lg bg-[#0A2F44] px-6 py-2 text-white hover:bg-[#082636]">Back to Input</button>
        </div>
      </div>
    );
  }

  const { summary, materials, loads, spans, supports, reactions, forces, capacity, sls, report, warnings, notes } = data;
  const pass = summary.status === "PASS";
  const nSup = supports.length;
  const w_k = loads.total_service;
  const totalLen = summary.span_lengths.reduce((a, b) => a + b, 0);
  const totalReaction = reactions.reduce((a, r) => a + r.reaction, 0);

  const meta = [
    { icon: FiLayers, label: "Beam Type", value: "Continuous" },
    { icon: FiGrid, label: "No. of Spans", value: summary.n_spans },
    { icon: FiBox, label: "Span Lengths (L)", value: summary.span_lengths.join(", ") + " mm" },
    { icon: FiActivity, label: "Supports", value: `${nSup} (1 Pin, ${nSup - 1} Cont.)` },
    { icon: FiBox, label: "Concrete", value: summary.concrete_grade },
    { icon: FiBarChart2, label: "Reinforcement", value: summary.steel_grade },
    { icon: FiZap, label: "Analysis", value: summary.analysis },
    { icon: FiGrid, label: "Units", value: "kN, mm" },
  ];

  return (
    <div className="flex flex-col">
      {/* title */}
      <div className="cb-no-print mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`text-lg font-bold uppercase tracking-wide ${ACCENT}`}>Continuous Beam Output — {summary.design_code}</h1>
          <p className={`text-sm ${SUB}`}>{summary.beam_id} · Design Code: {summary.design_code}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${pass ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
            {pass ? <FiCheckCircle /> : <FiXCircle />} {pass ? "SAFE" : "CHECK"}
          </span>
          <button onClick={() => setReportOpen(true)} className="flex items-center gap-2 rounded-lg border border-[#0A2F44] dark:border-[#66a4c2] px-3 py-1.5 text-sm font-medium text-[#0A2F44] dark:text-[#66a4c2] hover:bg-[#e6f0f5] dark:hover:bg-[#1e3a4a]"><FiFileText size={15} /> Detailed Report</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#0A2F44] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#082636]"><FiDownload size={15} /> Download</button>
        </div>
      </div>

      {/* meta strip */}
      <div className={`cb-no-print mb-5 ${CARD} flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3`}>
        {meta.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <m.icon className={`${ACCENT}`} size={16} />
            <div><p className={`text-[10px] uppercase ${SUB}`}>{m.label}</p><p className={`text-xs font-semibold ${MAIN}`}>{m.value}</p></div>
          </div>
        ))}
      </div>

      {/* warnings */}
      {warnings?.length > 0 && (
        <div className="cb-no-print mb-5 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <div className="mb-1 flex items-center gap-2 font-semibold text-yellow-800 dark:text-yellow-300"><FiAlertTriangle /> Coefficient-method assumptions</div>
          <ul className="ml-6 list-disc space-y-1 text-sm text-yellow-800 dark:text-yellow-300">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {/* dashboard grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card n="1" title="Geometry & Supports">
          <Elevation lengths={summary.span_lengths} nSup={nSup} />
          <p className={`mt-2 text-center text-[11px] ${SUB}`}>Total length = {totalLen} mm</p>
        </Card>
        <Card n="2" title="Loading (Characteristic)">
          <Loading lengths={summary.span_lengths} wk={w_k} />
        </Card>
        <Card n="3" title="Support Reactions (kN)">
          <Tbl head={["Support", "Reaction ↑", "% Load"]} rows={reactions.map((r) => [`S${r.index} (${r.label})`, r.reaction, `${r.percent}%`])} foot={["Total", totalReaction.toFixed(1), ""]} />
        </Card>

        <Card n="4" title="Bending Moment Diagram (Design)">
          <BMD spans={spans} supports={supports} />
          <Legend items={[["Hogging (−)", HOG], ["Sagging (+)", SAG]]} />
        </Card>
        <Card n="5" title="Shear Force Diagram (Design)">
          <SFD spans={spans} supports={supports} />
          <Legend items={[["+ve", HOG], ["−ve", SAG]]} />
        </Card>
        <Card n="6" title="Deflection (Serviceability)">
          <Defl lengths={summary.span_lengths} value={sls.deflection_actual} />
          <p className={`mt-2 text-center text-[11px] ${SUB}`}>Limit L/250 = {sls.deflection_limit} mm · Calc {sls.deflection_actual} mm</p>
        </Card>

        <Card n="7" title="Design Results (ULS) — Envelope">
          <Tbl head={["Section", "M_hog", "M_sag", "V_max"]} rows={spans.map((s, i) => {
            const adj = supports.filter((su) => su.index === i || su.index === i + 1);
            const mh = Math.max(...adj.map((su) => su.m_hogging), 0);
            const vmax = Math.max(...adj.map((su) => su.shear), 0);
            return [`Span ${s.index}`, `−${mh}`, `+${s.m_sagging}`, vmax];
          })} />
        </Card>
        <Card n="8" title="Required Reinforcement">
          <Tbl head={["Section", "Top (Hog)", "Bottom (Sag)"]} rows={spans.map((s, i) => {
            const sup = supports.find((su) => su.index === i + 1 && su.m_hogging > 0);
            return [`Span ${s.index}`, sup ? sup.top_steel.label : "nominal", s.bottom_steel.label];
          })} />
        </Card>
        <Card n="9" title="Section Capacity (ULS)">
          <Tbl head={["Check", "Design", "Capacity", "Util", "Status"]} rows={[
            ["Hogging", `${forces.max_hogging}`, hogCap(supports), capacity.utilization_bending, ok(capacity.utilization_bending <= 1)],
            ["Sagging", `${forces.max_sagging}`, sagCap(spans), capacity.utilization_bending, ok(capacity.utilization_bending <= 1)],
            ["Shear", `${forces.max_shear}`, "—", capacity.utilization_shear, ok(capacity.utilization_shear <= 1)],
          ]} />
        </Card>

        <Card n="10" title="Serviceability Checks (SLS)">
          <Tbl head={["Check", "Limit", "Calc", "Status"]} rows={[
            ["Deflection", `${sls.deflection_limit} mm`, `${sls.deflection_actual} mm`, ok(sls.deflection_status === "PASS")],
            ["Crack width", `${sls.crack_limit} mm`, `${sls.crack_width} mm`, ok(sls.crack_status === "PASS")],
          ]} />
        </Card>
        <Card n="11" title="Reinforcement Details">
          <div className="flex justify-around">
            <Section bars="top" label="At Support" w={summary.width} d={summary.depth} />
            <Section bars="bottom" label="At Midspan" w={summary.width} d={summary.depth} />
          </div>
        </Card>
        <Card n="12" title="Summary of Results">
          <KV rows={[
            ["Max Hogging", `${forces.max_hogging} kNm`],
            ["Max Sagging", `${forces.max_sagging} kNm`],
            ["Max Shear", `${forces.max_shear} kN`],
            ["Max Deflection", `${sls.deflection_actual} mm`],
            ["Max Utilisation", `${Math.max(capacity.utilization_bending, capacity.utilization_shear)}`],
          ]} status={summary.status} />
        </Card>

        <Card n="13" title="Notes" span2>
          <ul className={`ml-5 list-disc space-y-1 text-[13px] ${SUB}`}>{notes.map((nn, i) => <li key={i}>{nn}</li>)}</ul>
        </Card>
        <Card n="14" title="Design Parameters">
          <KV rows={[
            ["Combination", forces.ultimate_combo],
            ["f_cd", `${materials.fcd} MPa`],
            ["f_yd", `${materials.fyd} MPa`],
            ["Eff. depth d", `${summary.effective_depth} mm`],
          ]} />
        </Card>
      </div>

      <div className="cb-no-print mt-6 flex items-center justify-between border-t border-[#e2e8f0] dark:border-[#334155] pt-4">
        <button onClick={() => navigate("/continuous-beam")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${SUB} hover:bg-[#f1f5f9] dark:hover:bg-[#1f2937]`}><FiArrowLeft size={15} /> Back to Input</button>
      </div>

      {reportOpen && <ReportModal report={report} summary={summary} onClose={() => setReportOpen(false)} />}
    </div>
  );
}

/* ---------------- detailed report modal (Image 2) ---------------- */
function ReportModal({ report, summary, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="cb-report w-full max-w-5xl rounded-xl bg-white text-[#0F172A] shadow-2xl ring-1 ring-black/5 dark:bg-[#0f172a] dark:text-slate-200 dark:ring-white/10">
        <div className="cb-no-print sticky top-0 flex items-center justify-between border-b border-[#e2e8f0] bg-white px-6 py-4 dark:border-white/10 dark:bg-[#0f172a]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">Detailed Calculation Report</h2>
            <p className="text-xs text-[#64748b] dark:text-slate-400">{summary.beam_id} · {summary.design_code}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#e6f0f5] px-3 py-1.5 text-sm text-[#0A2F44] hover:bg-[#d4e6ef] dark:bg-[#1e3a4a] dark:text-[#66a4c2] dark:hover:bg-[#22485c]"><FiDownload size={14} /> Print / PDF</button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0F172A] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"><FiX size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-[180px_1fr_200px] gap-4 border-b border-[#e2e8f0] pb-3 text-sm font-semibold text-[#0F172A] dark:border-white/10 dark:text-white">
            <div>Reference</div><div>Calculations</div><div>Output</div>
          </div>
          {report.map((sec, si) => (
            <div key={si}>
              <div className="mt-4 mb-1 text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">{sec.title}</div>
              {sec.rows.map((r, ri) => (
                <div key={ri} className="grid grid-cols-[180px_1fr_200px] gap-4 border-b border-[#f1f5f9] py-3 text-[13px] dark:border-white/5">
                  <div className="font-mono text-[12px] text-[#64748b] dark:text-slate-400">{r.reference}</div>
                  <div className="whitespace-pre-line font-mono leading-relaxed text-[#334155] dark:text-slate-200">{r.calculation}</div>
                  <div className="whitespace-pre-line font-mono font-semibold text-[#0F172A] dark:text-white">{r.output}</div>
                </div>
              ))}
            </div>
          ))}
          <p className="mt-5 text-[11px] text-[#94a3b8] dark:text-slate-500">Calculation trace generated from the design engine. Verify coefficient values and code clauses against your reference copy before use.</p>
        </div>
      </div>
      <style>{`@media print { .cb-no-print{display:none!important} body *{visibility:hidden} .cb-report,.cb-report *{visibility:visible} .cb-report{position:absolute;left:0;top:0;width:100%;background:#fff;color:#000} }`}</style>
    </div>
  );
}

/* ---------------- primitives ---------------- */
function Card({ n, title, children, span2 }) {
  return (
    <section className={`${CARD} ${span2 ? "lg:col-span-2" : ""}`}>
      <header className="border-b border-[#e2e8f0] dark:border-[#334155] px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">{n}. {title}</h3></header>
      <div className="p-4">{children}</div>
    </section>
  );
}
function Tbl({ head, rows, foot }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead><tr className="border-b border-[#e2e8f0] dark:border-[#334155]">{head.map((h, i) => <th key={i} className={`py-1.5 pr-3 text-[10px] font-semibold uppercase ${SUB}`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i} className="border-b border-[#f1f5f9] dark:border-[#263244] last:border-0">{r.map((c, j) => <td key={j} className={`py-1.5 pr-3 font-mono ${j === 0 ? `font-semibold ${MAIN}` : SUB}`}>{c}</td>)}</tr>)}
          {foot && <tr className="border-t-2 border-[#e2e8f0] dark:border-[#334155] font-bold">{foot.map((c, j) => <td key={j} className={`py-1.5 pr-3 font-mono ${ACCENT}`}>{c}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  );
}
function KV({ rows, status }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => <div key={i} className="flex items-center justify-between gap-3"><span className={`text-xs ${SUB}`}>{r[0]}</span><span className={`text-xs font-mono font-semibold ${MAIN}`}>{r[1]}</span></div>)}
      {status && <div className={`mt-2 rounded-md px-3 py-1.5 text-center text-sm font-bold ${status === "PASS" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{status === "PASS" ? "SAFE" : "CHECK REQUIRED"}</div>}
    </div>
  );
}
function Legend({ items }) {
  return <div className="mt-2 flex justify-center gap-4">{items.map((it, i) => <span key={i} className={`flex items-center gap-1.5 text-[11px] ${SUB}`}><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it[1] }} /> {it[0]}</span>)}</div>;
}
function ok(b) { return b ? "OK ✓" : "✗"; }
function hogCap(sup) { const m = Math.max(...sup.map((s) => s.top_steel.m_resistance || 0)); return m ? `${m}` : "—"; }
function sagCap(sp) { const m = Math.max(...sp.map((s) => s.bottom_steel.m_resistance || 0)); return m ? `${m}` : "—"; }

/* ---------------- diagrams ---------------- */
function geom(lengths) {
  const lens = lengths.map((l) => l || 1);
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const x0 = 30, W = 300;
  const nodes = [x0]; let acc = x0;
  lens.forEach((l) => { acc += (l / total) * W; nodes.push(acc); });
  return { nodes };
}
function support(x, y, kind) {
  if (kind === "pin") return <path d={`M${x},${y} l-6,9 h12 z`} fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.2" />;
  return <g stroke="currentColor"><path d={`M${x},${y} l-6,9 h12 z`} fill="currentColor" fillOpacity="0.35" strokeWidth="1.2" /><line x1={x - 8} y1={y + 12} x2={x + 8} y2={y + 12} strokeWidth="1.2" /></g>;
}
function Elevation({ lengths, nSup }) {
  const { nodes } = geom(lengths);
  return (
    <svg viewBox="0 0 360 90" className="w-full text-[#475569] dark:text-[#94a3b8]">
      <rect x={nodes[0]} y="34" width={nodes[nodes.length - 1] - nodes[0]} height="10" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.2" />
      {nodes.map((x, i) => <g key={i}>{support(x, 44, i === 0 ? "pin" : "roller")}<text x={x} y="68" fontSize="8" fill="currentColor" textAnchor="middle">S{i + 1}</text></g>)}
      {nodes.slice(0, -1).map((x, i) => <text key={`l${i}`} x={(x + nodes[i + 1]) / 2} y="28" fontSize="8" fill="currentColor" textAnchor="middle">L{i + 1}</text>)}
    </svg>
  );
}
function Loading({ lengths, wk }) {
  const { nodes } = geom(lengths);
  const x0 = nodes[0], x1 = nodes[nodes.length - 1];
  const arrows = [];
  for (let x = x0; x <= x1; x += 14) arrows.push(x);
  return (
    <svg viewBox="0 0 360 90" className="w-full text-[#0A2F44] dark:text-[#66a4c2]">
      <text x={(x0 + x1) / 2} y="12" fontSize="9" fill="currentColor" textAnchor="middle">w_k = {wk} kN/m</text>
      <line x1={x0} y1="22" x2={x1} y2="22" stroke="currentColor" strokeWidth="1.4" />
      {arrows.map((x, i) => <line key={i} x1={x} y1="22" x2={x} y2="40" stroke="currentColor" strokeWidth="1" markerEnd="url(#la)" />)}
      <defs><marker id="la" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto"><path d="M0,0 L3,5 L6,0 Z" fill="currentColor" /></marker></defs>
      <rect x={x0} y="42" width={x1 - x0} height="8" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1" />
      {nodes.map((x, i) => <path key={i} d={`M${x},50 l-5,7 h10 z`} fill="currentColor" fillOpacity="0.35" />)}
    </svg>
  );
}
function BMD({ spans, supports }) {
  const { nodes } = geom(spans.map((s) => s.length));
  const peak = Math.max(...spans.map((s) => s.m_sagging), ...supports.map((s) => s.m_hogging), 1);
  const mid = 55, amp = 34;
  return (
    <svg viewBox="0 0 360 110" className="w-full">
      <line x1={nodes[0]} y1={mid} x2={nodes[nodes.length - 1]} y2={mid} stroke="#94a3b8" strokeWidth="1" />
      {spans.map((s, i) => {
        const xa = nodes[i], xb = nodes[i + 1], xc = (xa + xb) / 2, hh = (s.m_sagging / peak) * amp;
        return <g key={i}><path d={`M${xa},${mid} Q${xc},${mid + hh * 2} ${xb},${mid} Z`} fill={SAG} fillOpacity="0.2" stroke={SAG} strokeWidth="1.3" /><text x={xc} y={mid + 28} fontSize="8" fill={SAG} textAnchor="middle">+{s.m_sagging}</text></g>;
      })}
      {supports.map((s, i) => {
        if (s.m_hogging <= 0) return null;
        const x = nodes[s.index], hh = (s.m_hogging / peak) * amp, w = 22;
        return <g key={`h${i}`}><path d={`M${x - w},${mid} Q${x},${mid - hh * 2} ${x + w},${mid} Z`} fill={HOG} fillOpacity="0.2" stroke={HOG} strokeWidth="1.3" /><text x={x} y={mid - 14} fontSize="8" fill={HOG} textAnchor="middle">−{s.m_hogging}</text></g>;
      })}
      {nodes.map((x, i) => <line key={`n${i}`} x1={x} y1={mid - 3} x2={x} y2={mid + 3} stroke="#64748b" strokeWidth="1.5" />)}
    </svg>
  );
}
function SFD({ spans, supports }) {
  const { nodes } = geom(spans.map((s) => s.length));
  const peak = Math.max(...supports.map((s) => s.shear), 1);
  const mid = 50, amp = 30;
  return (
    <svg viewBox="0 0 360 100" className="w-full">
      <line x1={nodes[0]} y1={mid} x2={nodes[nodes.length - 1]} y2={mid} stroke="#94a3b8" strokeWidth="1" />
      {spans.map((s, i) => {
        const xa = nodes[i], xb = nodes[i + 1];
        const vL = supports[i]?.shear || 0, vR = supports[i + 1]?.shear || 0;
        const hL = (vL / peak) * amp, hR = (vR / peak) * amp;
        return <path key={i} d={`M${xa},${mid} L${xa},${mid - hL} L${xb},${mid + hR} L${xb},${mid} Z`} fill={SAG} fillOpacity="0.15" stroke={SAG} strokeWidth="1.2" />;
      })}
      {supports.map((s, i) => <text key={i} x={nodes[i]} y={mid - amp - 4} fontSize="7.5" fill={HOG} textAnchor="middle">{s.shear}</text>)}
      {nodes.map((x, i) => <line key={`n${i}`} x1={x} y1={mid - 3} x2={x} y2={mid + 3} stroke="#64748b" strokeWidth="1.5" />)}
    </svg>
  );
}
function Defl({ lengths, value }) {
  const { nodes } = geom(lengths);
  const mid = 28;
  return (
    <svg viewBox="0 0 360 70" className="w-full text-[#0A2F44] dark:text-[#66a4c2]">
      <line x1={nodes[0]} y1={mid} x2={nodes[nodes.length - 1]} y2={mid} strokeDasharray="3 3" stroke="#94a3b8" strokeWidth="1" />
      {nodes.slice(0, -1).map((x, i) => { const xb = nodes[i + 1], xc = (x + xb) / 2; return <path key={i} d={`M${x},${mid} Q${xc},${mid + 26} ${xb},${mid}`} fill="none" stroke="currentColor" strokeWidth="1.4" />; })}
      {nodes.map((x, i) => <circle key={i} cx={x} cy={mid} r="2" fill="currentColor" />)}
      {nodes.slice(0, -1).map((x, i) => <text key={`t${i}`} x={(x + nodes[i + 1]) / 2} y={mid + 40} fontSize="7.5" fill="currentColor" textAnchor="middle">−{value}</text>)}
    </svg>
  );
}
function Section({ bars, label, w, d }) {
  const top = bars === "top";
  return (
    <div className="text-center">
      <svg viewBox="0 0 90 110" className="mx-auto h-28 text-[#475569] dark:text-[#94a3b8]">
        <rect x="20" y="10" width="50" height="85" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="25" y="15" width="40" height="75" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 2" />
        {[30, 45, 60].map((x) => <circle key={x} cx={x} cy={top ? 19 : 86} r="2.6" fill={HOG} />)}
        {[30, 60].map((x) => <circle key={`b${x}`} cx={x} cy={top ? 86 : 19} r="2" fill="currentColor" fillOpacity="0.5" />)}
        <text x="45" y="105" fontSize="7" fill="currentColor" textAnchor="middle">{w} × {d}</text>
      </svg>
      <p className={`text-[11px] font-medium ${SUB}`}>{label}</p>
    </div>
  );
}