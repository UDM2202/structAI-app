// src/pages/ContinuousSlabResults.jsx — renders inside MainLayout
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiArrowLeft, FiAlertTriangle, FiCheckCircle, FiXCircle, FiFileText,
  FiDownload, FiLayers, FiGrid, FiActivity, FiBox, FiBarChart2,
} from "react-icons/fi";
import DetailedReport from "../components/DetailedReport";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl border border-[#e2e8f0] dark:border-[#334155] shadow-sm";
const MAIN = "text-[#0F172A] dark:text-white";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const ACCENT = "text-[#0A2F44] dark:text-[#66a4c2]";
const HOG = "#ef4444";
const SAG = "#22c55e";

export default function ContinuousSlabResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state?.designResult;
  const [reportOpen, setReportOpen] = useState(false);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="mx-auto mb-4 text-6xl text-yellow-500" />
          <h2 className={`mb-2 text-xl font-bold ${MAIN}`}>No continuous slab results</h2>
          <p className={`mb-6 ${SUB}`}>Run a continuous slab design first.</p>
          <button onClick={() => navigate("/continuous-slab")} className="rounded-lg bg-[#0A2F44] px-6 py-2 text-white hover:bg-[#082636]">Back to Input</button>
        </div>
      </div>
    );
  }

  const { summary, envelope, spans, supports, deflection, shear, compliance, cost_breakdown, diagram, report } = data;
  const pass = summary.status === "PASS";

  // reshape for the (continuous-beam) BMD/SFD components
  const bmdSpans = spans.map((s) => ({ index: s.index - 1, length: s.length, m_sagging: s.max_sagging_moment }));
  const bmdSupports = supports.map((s) => ({ index: s.index, m_hogging: s.hogging_moment, shear: s.shear }));

  const meta = [
    { icon: FiLayers, label: "Slab Type", value: "Continuous One-Way" },
    { icon: FiGrid, label: "Spans", value: spans.length },
    { icon: FiBox, label: "Span Lengths", value: spans.map((s) => s.length).join(", ") + " m" },
    { icon: FiActivity, label: "Effective Depth", value: `${summary.effective_depth} mm` },
    { icon: FiBox, label: "Concrete", value: summary.concrete_grade },
    { icon: FiBarChart2, label: "Steel", value: summary.steel_grade },
  ];

  return (
    <div className="flex flex-col">
      <div className="cb-no-print mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`text-lg font-bold uppercase tracking-wide ${ACCENT}`}>Continuous One-Way Slab — EC2</h1>
          <p className={`text-sm ${SUB}`}>{summary.continuity}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${pass ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
            {pass ? <FiCheckCircle /> : <FiXCircle />} {pass ? "SAFE" : "CHECK"}
          </span>
          <button onClick={() => setReportOpen(true)} className="flex items-center gap-2 rounded-lg border border-[#0A2F44] px-3 py-1.5 text-sm font-medium text-[#0A2F44] hover:bg-[#e6f0f5] dark:border-[#66a4c2] dark:text-[#66a4c2] dark:hover:bg-[#1e3a4a]"><FiFileText size={15} /> Detailed Report</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#0A2F44] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#082636]"><FiDownload size={15} /> Download</button>
        </div>
      </div>

      <div className={`cb-no-print mb-5 ${CARD} flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3`}>
        {meta.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <m.icon className={ACCENT} size={16} />
            <div><p className={`text-[10px] uppercase ${SUB}`}>{m.label}</p><p className={`text-xs font-semibold ${MAIN}`}>{m.value}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* envelope */}
        <Card n="1" title="Envelope (ULS)">
          <KV rows={[
            ["Max Sagging", `${envelope.max_sagging_moment} kNm/m`],
            ["Max Hogging", `${envelope.max_hogging_moment} kNm/m`],
            ["Max Shear", `${envelope.max_shear_force} kN/m`],
            ["Ultimate w_Ed", `${envelope.ultimate_load} kN/m²`],
            ["Service load", `${envelope.service_load} kN/m²`],
          ]} status={summary.status} />
        </Card>

        <Card n="2" title="Bending Moment Diagram">
          <BMD spans={bmdSpans} supports={bmdSupports} />
          <Legend items={[["Hogging (−)", HOG], ["Sagging (+)", SAG]]} />
        </Card>
        <Card n="3" title="Shear Force Diagram">
          <SFD spans={bmdSpans} supports={bmdSupports} />
          <Legend items={[["+ve", HOG], ["−ve", SAG]]} />
        </Card>

        <Card n="4" title="Span (Sagging) Reinforcement" span2>
          <Tbl head={["Span", "L (m)", "M_sag (kNm/m)", "As,req", "Provided", "Status"]}
            rows={spans.map((s) => [`Span ${s.index}`, s.length, s.max_sagging_moment, Math.round(s.area_required),
              `T${s.bar_diameter}@${s.spacing} (${Math.round(s.area_provided)})`, ok(s.status === "PASS")])} />
        </Card>
        <Card n="5" title="Deflection & Shear">
          <Tbl head={["Check", "Actual", "Limit", "Status"]} rows={[
            ["Span/depth (L/d)", deflection.actual_deflection, deflection.allowable_deflection, ok(deflection.status === "PASS")],
            ["Shear V_Ed (kN/m)", shear.design_shear, shear.shear_resistance, ok(shear.status === "PASS")],
          ]} />
        </Card>

        <Card n="6" title="Support (Hogging) Reinforcement" span2>
          <Tbl head={["Support", "M_hog (kNm/m)", "V (kN/m)", "As,req", "Provided", "Status"]}
            rows={supports.map((s) => [s.position, s.hogging_moment, s.shear,
              s.hogging_moment > 0 ? Math.round(s.area_required) : "nominal",
              `T${s.bar_diameter}@${s.spacing} (${Math.round(s.area_provided)})`, ok(s.status === "PASS")])} />
        </Card>
        <Card n="7" title="Cost Estimate">
          <KV rows={[
            ["Concrete", `${cost_breakdown.concrete.cost}`],
            ["Steel", `${cost_breakdown.steel.cost}`],
            ["Formwork", `${cost_breakdown.formwork.cost}`],
            ["Total (1 m strip)", `${cost_breakdown.total}`],
            ["Per m run", `${cost_breakdown.total_per_sqm}`],
          ]} />
        </Card>

        <Card n="8" title="Compliance Summary" span2>
          <Tbl head={["Check", "Ratio", "Limit", "Status"]}
            rows={compliance.map((c) => [c.check, c.ratio, c.limit, ok(c.status === "PASS")])} />
        </Card>
        <Card n="9" title="Section">
          <KV rows={[
            ["Thickness", `${summary.thickness} mm`],
            ["Eff. depth d", `${summary.effective_depth} mm`],
            ["Governing bars", `T${summary.selected_bar_diameter}@${summary.selected_spacing}`],
            ["Utilisation", `${summary.utilization_ratio}`],
          ]} />
        </Card>
      </div>

      <div className="cb-no-print mt-6 flex items-center justify-between border-t border-[#e2e8f0] pt-4 dark:border-[#334155]">
        <button onClick={() => navigate("/continuous-slab")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${SUB} hover:bg-[#f1f5f9] dark:hover:bg-[#1f2937]`}><FiArrowLeft size={15} /> Back to Input</button>
      </div>

      {reportOpen && (
        <DetailedReport
          report={report}
          heading="Continuous Slab — Detailed Calculation Report"
          subtitle={summary.continuity}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------------- primitives ---------------- */
function Card({ n, title, children, span2 }) {
  return (
    <section className={`${CARD} ${span2 ? "lg:col-span-2" : ""}`}>
      <header className="border-b border-[#e2e8f0] px-4 py-2.5 dark:border-[#334155]"><h3 className="text-[11px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">{n}. {title}</h3></header>
      <div className="p-4">{children}</div>
    </section>
  );
}
function Tbl({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead><tr className="border-b border-[#e2e8f0] dark:border-[#334155]">{head.map((h, i) => <th key={i} className={`py-1.5 pr-3 text-[10px] font-semibold uppercase ${SUB}`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i} className="border-b border-[#f1f5f9] last:border-0 dark:border-[#263244]">{r.map((c, j) => <td key={j} className={`py-1.5 pr-3 font-mono ${j === 0 ? `font-semibold ${MAIN}` : SUB}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
function KV({ rows, status }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => <div key={i} className="flex items-center justify-between gap-3"><span className={`text-xs ${SUB}`}>{r[0]}</span><span className={`font-mono text-xs font-semibold ${MAIN}`}>{r[1]}</span></div>)}
      {status && <div className={`mt-2 rounded-md px-3 py-1.5 text-center text-sm font-bold ${status === "PASS" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{status === "PASS" ? "SAFE" : "CHECK REQUIRED"}</div>}
    </div>
  );
}
function Legend({ items }) {
  return <div className="mt-2 flex justify-center gap-4">{items.map((it, i) => <span key={i} className={`flex items-center gap-1.5 text-[11px] ${SUB}`}><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it[1] }} /> {it[0]}</span>)}</div>;
}
function ok(b) { return b ? "OK ✓" : "✗"; }

/* ---------------- diagrams (reused from ContinuousBeamResults) ---------------- */
function geom(lengths) {
  const lens = lengths.map((l) => l || 1);
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const x0 = 30, W = 300;
  const nodes = [x0]; let acc = x0;
  lens.forEach((l) => { acc += (l / total) * W; nodes.push(acc); });
  return { nodes };
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