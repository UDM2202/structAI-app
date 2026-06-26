// src/pages/BeamResults.jsx — beam output in the slab-results layout (sidebar + tabs)
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiHome, FiChevronRight, FiArrowLeft, FiArrowRight, FiFileText, FiDownload,
  FiCheck, FiXCircle, FiAlertTriangle, FiInfo, FiShield, FiGrid, FiActivity,
  FiTrendingUp, FiLayers, FiList, FiBarChart2, FiHelpCircle,
} from "react-icons/fi";

const CARD = "rounded-xl border bg-white dark:bg-[#0f172a] border-[#e2e8f0] dark:border-[#1f2937] shadow-sm";
const PAGE = "bg-[#f3f4f6] dark:bg-[#0b0f19]";
const TXT_MAIN = "text-[#0F172A] dark:text-white";
const TXT_SUB = "text-[#64748b] dark:text-[#94a3b8]";
const ACCENT = "text-[#0A2F44] dark:text-[#66a4c2]";
const ROW_B = "border-[#f1f5f9] dark:border-[#1f2937]";

const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");

const TABS = ["Overview", "Bending", "Shear", "Deflection", "Reinforcement", "Summary"];
const NAV = [
  { id: "Overview", icon: FiGrid }, { id: "Bending", icon: FiActivity },
  { id: "Shear", icon: FiTrendingUp }, { id: "Deflection", icon: FiBarChart2 },
  { id: "Reinforcement", icon: FiLayers }, { id: "Summary", icon: FiList },
];

const BeamResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const data = location.state?.designResult;

  if (!data) {
    return (
      <div className={`min-h-screen ${PAGE} flex items-center justify-center`}>
        <div className="text-center">
          <FiAlertTriangle className="text-6xl text-yellow-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${TXT_MAIN} mb-2`}>No Beam Results</h2>
          <p className={`${TXT_SUB} mb-6`}>Run a beam design first.</p>
          <button onClick={() => navigate("/beam")} className="px-6 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636]"><FiArrowLeft className="inline mr-2" /> Back to Input</button>
        </div>
      </div>
    );
  }

  const { summary, materials, loads, forces, capacity, reinforcement, sls, notes } = data;
  const pass = summary.status === "PASS";

  return (
    <div className="flex flex-col">
        <main className="flex-1 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className={`text-lg font-bold ${TXT_MAIN}`}>BEAM DESIGN RESULTS ({summary.beam_id})</h1>
              <p className={`text-[13px] ${TXT_SUB}`}>{summary.support_condition} • {summary.width}×{summary.depth} mm • {summary.design_code}</p>
            </div>
            <div className="flex gap-2">
              <button className={`flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#0f172a] px-3 py-1.5 text-[13px] font-medium ${TXT_MAIN} hover:bg-[#f1f5f9] dark:hover:bg-[#1f2937]`}><FiFileText size={15} /> Detailed Report (PDF)</button>
              <button className="flex items-center gap-1.5 rounded-lg bg-[#0A2F44] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#082636]"><FiDownload size={15} /> Download</button>
            </div>
          </div>

          {/* tabs */}
          <div className="mb-5 flex gap-6 overflow-x-auto border-b border-[#e2e8f0] dark:border-[#1f2937]">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`-mb-px whitespace-nowrap border-b-2 px-0.5 pb-2.5 text-[12px] font-semibold uppercase tracking-wide ${tab === t ? "border-[#0A2F44] dark:border-[#66a4c2] text-[#0A2F44] dark:text-[#66a4c2]" : `border-transparent ${TXT_SUB} hover:text-[#0F172A] dark:hover:text-white`}`}>{t}</button>
            ))}
          </div>

          {tab === "Overview" && <Overview d={data} pass={pass} />}
          {tab === "Bending" && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ForcesCard forces={forces} capacity={capacity} />
                <Card title="Section Capacity (Bending)">
                  <Row label="Design Moment M_Ed" value={`${f(forces.max_moment)} kNm`} />
                  <Row label="Moment Resistance M_Rd" value={`${f(capacity.moment_resistance)} kNm`} />
                  <Gauge label="Utilisation (Bending)" value={capacity.utilization_bending} />
                </Card>
              </div>
              <Card title="Bending Moment Diagram" className="mt-4"><MomentDiagram m={forces.max_moment} span={summary.span} cantilever={summary.support_condition === "Cantilever"} /></Card>
            </>
          )}
          {tab === "Shear" && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ForcesCard forces={forces} capacity={capacity} />
                <Card title="Section Capacity (Shear)">
                  <Row label="Design Shear V_Ed" value={`${f(forces.max_shear)} kN`} />
                  <Row label="Shear Resistance V_Rd,c" value={`${f(capacity.shear_resistance)} kN`} />
                  <Gauge label="Utilisation (Shear)" value={capacity.utilization_shear} />
                  <Row label="Links" value={reinforcement.stirrups.label} />
                </Card>
              </div>
              <Card title="Shear Force Diagram" className="mt-4"><ShearDiagram v={forces.max_shear} cantilever={summary.support_condition === "Cantilever"} /></Card>
            </>
          )}
          {tab === "Deflection" && (
            <Card title="Serviceability Checks (SLS)">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-[#e2e8f0] dark:border-[#1f2937] p-3">
                  <Row label="Deflection (calculated)" value={`${f(sls.deflection_actual, 1)} mm`} />
                  <Row label="Limit (L/250)" value={`${f(sls.deflection_limit, 1)} mm`} />
                  <StatusLine status={sls.deflection_status} />
                </div>
                <div className="rounded-lg border border-[#e2e8f0] dark:border-[#1f2937] p-3">
                  <Row label="Crack Width (calculated)" value={`${f(sls.crack_width, 2)} mm`} />
                  <Row label="Limit" value={`${f(sls.crack_limit, 2)} mm`} />
                  <StatusLine status={sls.crack_status} />
                </div>
              </div>
            </Card>
          )}
          {tab === "Reinforcement" && <ReinforcementTab reinforcement={reinforcement} summary={summary} />}
          {tab === "Summary" && <SummaryTab d={data} pass={pass} />}
        </main>

        <div className="border-t border-[#e2e8f0] dark:border-[#1f2937] bg-white dark:bg-[#0b0f19] px-5 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/beam")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${TXT_SUB} hover:bg-[#f1f5f9] dark:hover:bg-[#1f2937]`}><FiArrowLeft size={15} /> Back to Input</button>
          <button className="flex items-center gap-1.5 rounded-lg bg-[#0A2F44] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#082636]">Export Results <FiArrowRight size={15} /></button>
        </div>
      </div>
  );
};

/* ---------------- tab content ---------------- */
function Overview({ d, pass }) {
  const { summary, materials, loads, forces, capacity, sls } = d;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Beam Summary">
          <Row label="Beam ID" value={summary.beam_id} />
          <Row label="Support" value={summary.support_condition} />
          <Row label="Span (L)" value={`${summary.span} mm`} />
          <Row label="Section" value={`${summary.width} × ${summary.depth} mm`} />
          <Row label="Eff. Depth (d)" value={`${summary.effective_depth} mm`} />
          <Row label="Concrete" value={summary.concrete_grade} />
          <Row label="Steel" value={summary.steel_grade} />
          <Row label="Code" value={summary.design_code} />
        </Card>
        <Card title="Design Check Summary">
          <CheckRow label="Bending (M_Ed / M_Rd)" ok={capacity.utilization_bending <= 1} ratio={capacity.utilization_bending} />
          <CheckRow label="Shear (V_Ed / V_Rd)" ok={capacity.utilization_shear <= 1} ratio={capacity.utilization_shear} />
          <CheckRow label="Deflection" ok={sls.deflection_status === "PASS"} />
          <CheckRow label="Crack Width" ok={sls.crack_status === "PASS"} />
          <div className={`mt-4 rounded-lg border p-4 text-center ${pass ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"}`}>
            <div className={`mb-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${pass ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}><FiShield size={14} /> Overall Status</div>
            <div className={`text-2xl font-bold ${pass ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{pass ? "SAFE" : "REVIEW"}</div>
          </div>
        </Card>
        <Card title="Geometry">
          <Elevation support={summary.support_condition} span={summary.span} depth={summary.depth} />
          <p className={`mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide ${TXT_SUB}`}>Cross Section</p>
          <CrossSection width={summary.width} depth={summary.depth} rein={d.reinforcement} />
        </Card>
      </div>

      <ForcesCard forces={forces} capacity={capacity} className="mt-4" />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Materials">
          <Row label="Concrete" value={`${summary.concrete_grade} · f_ck ${f(materials.fck, 0)} MPa · f_cd ${f(materials.fcd, 1)} MPa`} />
          <Row label="Reinforcement" value={`${summary.steel_grade} · f_yk ${f(materials.fyk, 0)} · f_yd ${f(materials.fyd, 0)} MPa`} />
          <Row label="Modular ratio (n)" value={f(materials.modular_ratio, 1)} />
          <Row label="Unit weight γc" value={`${f(materials.unit_weight_concrete, 1)} kN/m³`} />
        </Card>
        <LoadSummaryCard loads={loads} forces={forces} />
      </div>
    </>
  );
}

function SummaryTab({ d, pass }) {
  const { sls, capacity, notes } = d;
  return (
    <>
      <Card title="Summary of Results">
        <Row label="Utilisation — Bending" value={f(capacity.utilization_bending)} />
        <Row label="Utilisation — Shear" value={f(capacity.utilization_shear)} />
        <Row label="Deflection" value={`${f(sls.deflection_actual, 1)} mm (${sls.deflection_status})`} />
        <Row label="Crack Width" value={`${f(sls.crack_width, 2)} mm (${sls.crack_status})`} />
        <div className={`mt-3 rounded-lg border p-3 text-center ${pass ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"}`}>
          <span className={`text-lg font-bold ${pass ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{pass ? "SAFE" : "REVIEW REQUIRED"}</span>
        </div>
      </Card>
      <Card title="Notes" className="mt-4">
        <ul className="space-y-1.5">
          {notes.map((n, i) => <li key={i} className={`flex gap-2 text-[13px] ${TXT_SUB}`}><FiInfo className="mt-0.5 flex-shrink-0" size={13} /> {n}</li>)}
        </ul>
      </Card>
    </>
  );
}

function ReinforcementTab({ reinforcement, summary }) {
  const r = reinforcement;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card title="Reinforcement Details">
          <div className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-[#1f2937]">
            <table className="w-full text-left text-[12px]">
              <thead><tr className="bg-[#f8fafc] dark:bg-[#0b0f19] text-[10px] uppercase tracking-wide text-[#94a3b8]">{["Element", "Provided", "Details"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                <RTableRow a="Tension (Bottom)" b={r.tension.label} c={`A_s ${f(r.tension.area_provided, 0)} mm² (req ${f(r.tension.area_required, 0)})`} />
                <RTableRow a="Compression (Top)" b={r.compression.label} c={`A_s ${f(r.compression.area_provided, 0)} mm²`} />
                <RTableRow a="Shear Links" b={r.stirrups.label} c={`${r.stirrups.legs}-leg`} />
                <RTableRow a="Clear Cover" b={`${r.cover} mm`} c="to link" />
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <Card title="Cross Section">
        <CrossSection width={summary.width} depth={summary.depth} rein={r} />
      </Card>
    </div>
  );
}

/* ---------------- shared cards ---------------- */
function ForcesCard({ forces, capacity, className = "" }) {
  return (
    <Card title="Design Results (ULS)" className={className}>
      <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
        <CalcRow label="Action combination" value={forces.ultimate_combo} />
        <CalcRow label="Design UDL, w_d" value={`${f(forces.design_udl)} kN/m`} />
        <CalcRow label="Max bending moment, M_Ed" value={`${f(forces.max_moment)} kNm`} />
        <CalcRow label="Max shear force, V_Ed" value={`${f(forces.max_shear)} kN`} />
        <CalcRow label="Moment resistance, M_Rd" value={`${f(capacity.moment_resistance)} kNm`} />
        <CalcRow label="Shear resistance, V_Rd,c" value={`${f(capacity.shear_resistance)} kN`} />
      </div>
    </Card>
  );
}
function LoadSummaryCard({ loads, forces }) {
  return (
    <Card title="Load Summary (Characteristic)">
      <div className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-[#1f2937]">
        <table className="w-full text-left text-[12px]">
          <thead><tr className="bg-[#f8fafc] dark:bg-[#0b0f19] text-[10px] uppercase tracking-wide text-[#94a3b8]"><th className="px-3 py-2 font-semibold">Load</th><th className="px-3 py-2 font-semibold">Type</th><th className="px-3 py-2 font-semibold">kN/m</th></tr></thead>
          <tbody>
            {loads.components.map((c, i) => (
              <tr key={i} className={`border-t ${ROW_B} ${TXT_SUB}`}><td className={`px-3 py-1.5 ${TXT_MAIN}`}>{c.name}</td><td className="px-3 py-1.5">{c.kind}</td><td className="px-3 py-1.5 font-mono">{f(c.value)}</td></tr>
            ))}
            <tr className={`border-t ${ROW_B} bg-[#f8fafc] dark:bg-[#0b0f19]`}><td className={`px-3 py-1.5 font-semibold ${TXT_MAIN}`} colSpan={2}>Total Service (Gk + Qk)</td><td className={`px-3 py-1.5 font-mono font-bold ${ACCENT}`}>{f(loads.total_service)}</td></tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------------- primitives ---------------- */
function Card({ title, children, className = "" }) {
  return <section className={`${CARD} ${className}`}><header className="flex items-center gap-1.5 px-5 pt-4 pb-3"><h3 className={`text-[11px] font-bold uppercase tracking-wide ${ACCENT}`}>{title}</h3><FiInfo className="text-[#cbd5e1] dark:text-[#475569]" size={12} /></header><div className="px-5 pb-5">{children}</div></section>;
}
function Row({ label, value }) { return <div className={`flex items-center justify-between border-b ${ROW_B} py-1.5 last:border-0`}><span className={`text-[13px] ${TXT_SUB}`}>{label}</span><span className={`text-[13px] font-medium ${TXT_MAIN}`}>{value}</span></div>; }
function CalcRow({ label, value }) { return <div className={`flex items-center justify-between border-b ${ROW_B} py-1.5`}><span className={`text-[12px] ${TXT_SUB}`}>{label}</span><span className={`text-[12px] font-medium ${TXT_MAIN}`}>{value}</span></div>; }
function RTableRow({ a, b, c }) { return <tr className={`border-t ${ROW_B}`}><td className={`px-3 py-2 font-medium ${TXT_MAIN}`}>{a}</td><td className={`px-3 py-2 ${ACCENT} font-mono`}>{b}</td><td className={`px-3 py-2 ${TXT_SUB}`}>{c}</td></tr>; }
function CheckRow({ label, ok, ratio }) {
  return <div className="flex items-center justify-between py-1"><span className={`flex items-center gap-2 text-[13px] ${TXT_SUB}`}>{ok ? <FiCheck className="text-green-500" /> : <FiXCircle className="text-red-500" />} {label}</span><span className="flex items-center gap-2">{ratio != null && <span className={`text-[11px] ${TXT_SUB}`}>{f(ratio)}</span>}<span className={`text-[11px] font-bold ${ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{ok ? "OK" : "FAIL"}</span></span></div>;
}
function StatusLine({ status }) { const ok = status === "PASS"; return <div className="mt-1.5 flex items-center gap-2">{ok ? <FiCheck className="text-green-500" /> : <FiXCircle className="text-red-500" />}<span className={`text-sm font-bold ${ok ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{ok ? "OK" : "FAIL"}</span></div>; }
function Gauge({ label, value = 0 }) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  const bar = value <= 0.85 ? "bg-green-500" : value <= 1 ? "bg-amber-500" : "bg-red-500";
  return <div className="mt-2"><div className="mb-1 flex items-center justify-between"><span className={`text-[11px] ${TXT_SUB}`}>{label}</span><span className={`text-[11px] font-bold ${TXT_MAIN}`}>{f(value)}</span></div><div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0] dark:bg-[#1f2937]"><div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} /></div></div>;
}

/* ---------------- diagrams (currentColor + theme var) ---------------- */
function Elevation({ support, span, depth }) {
  const DIM = "var(--dim)";
  const layouts = {
    "Both Ends Fixed": [["f", 45], ["f", 315]],
    "Propped Cantilever": [["f", 45], ["t", 315]],
    Cantilever: [["f", 45]],
  };
  const ends = layouts[support] || [["t", 45], ["t", 315]];
  return (
    <svg viewBox="0 0 360 100" className="w-full text-[#475569] dark:text-[#94a3b8] [--dim:#0A2F44] dark:[--dim:#66a4c2]">
      <defs><marker id="el" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={DIM} /></marker></defs>
      <rect x="45" y="30" width="270" height="20" fill="currentColor" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.2" />
      {ends.map(([kind, x], i) => kind === "f"
        ? <g key={`s${i}`} stroke="currentColor"><line x1={x} y1="30" x2={x} y2="66" strokeWidth="2" />{[34, 42, 50, 58].map((y) => <line key={y} x1={x} y1={y} x2={x - 6} y2={y + 4} strokeWidth="1" />)}</g>
        : <path key={`s${i}`} d={`M${x},66 l-8,11 h16 z`} fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.3" />
      )}
      <line x1="45" y1="88" x2="315" y2="88" stroke={DIM} strokeWidth="1" markerStart="url(#el)" markerEnd="url(#el)" />
      <text x="180" y="98" fontSize="9" fill={DIM} textAnchor="middle">L = {span} mm</text>
    </svg>
  );
}
function CrossSection({ width, depth, rein }) {
  const DIM = "var(--dim)";
  const nb = rein?.tension?.count || 3;
  const xs = Array.from({ length: nb }, (_, i) => 64 + (i * 72) / (nb - 1 || 1));
  return (
    <svg viewBox="0 0 200 150" className="w-full text-[#475569] dark:text-[#94a3b8] [--dim:#0A2F44] dark:[--dim:#66a4c2]">
      <defs><marker id="cx" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={DIM} /></marker></defs>
      <rect x="55" y="16" width="90" height="110" fill="currentColor" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.3" />
      <rect x="64" y="25" width="72" height="92" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
      {xs.map((x, i) => <circle key={`b${i}`} cx={x} cy={112} r="3.2" fill="#ef4444" />)}
      {[78, 122].map((x) => <circle key={`t${x}`} cx={x} cy={30} r="2.6" fill="#ef4444" />)}
      <line x1="55" y1="136" x2="145" y2="136" stroke={DIM} strokeWidth="1" markerStart="url(#cx)" markerEnd="url(#cx)" />
      <text x="100" y="147" fontSize="9" fill={DIM} textAnchor="middle">{width} mm</text>
      <line x1="160" y1="16" x2="160" y2="126" stroke={DIM} strokeWidth="1" markerStart="url(#cx)" markerEnd="url(#cx)" />
      <text x="167" y="74" fontSize="9" fill={DIM} transform="rotate(90 167 74)" textAnchor="middle">{depth} mm</text>
    </svg>
  );
}
function MomentDiagram({ m = 0, cantilever }) {
  const x0 = 50, x1 = 470, base = cantilever ? 40 : 95, peak = 60;
  return (
    <div className="text-[#475569] dark:text-[#94a3b8]">
      <svg viewBox="0 0 520 150" className="w-full">
        <line x1={x0} y1={base} x2={x1} y2={base} stroke="currentColor" strokeWidth="1" />
        {cantilever
          ? <path d={`M${x0},${base} L${x0},${base + peak} Q${(x0 + x1) / 2},${base} ${x1},${base} Z`} fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="1.6" />
          : <path d={`M${x0},${base} Q${(x0 + x1) / 2},${base + 2 * peak} ${x1},${base} Z`} fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="1.6" />}
        <text x={(x0 + x1) / 2} y={cantilever ? base + peak + 16 : base + peak + 12} fontSize="11" fill="#ef4444" textAnchor="middle">M_Ed = {f(m)} kNm</text>
      </svg>
    </div>
  );
}
function ShearDiagram({ v = 0, cantilever }) {
  const x0 = 50, x1 = 470, base = 80, h = 45;
  return (
    <div className="text-[#475569] dark:text-[#94a3b8]">
      <svg viewBox="0 0 520 150" className="w-full">
        <line x1={x0} y1={base} x2={x1} y2={base} stroke="currentColor" strokeWidth="1" />
        {cantilever
          ? <polygon points={`${x0},${base} ${x0},${base - h} ${x1},${base}`} fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.4" />
          : <>
              <polygon points={`${x0},${base} ${x0},${base - h} ${(x0 + x1) / 2},${base}`} fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.4" />
              <polygon points={`${(x0 + x1) / 2},${base} ${x1},${base + h} ${x1},${base}`} fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.4" />
            </>}
        <text x={x0} y={base - h - 6} fontSize="10" fill="#10b981">+{f(v)}</text>
        <text x={x1 - 30} y={base + h + 12} fontSize="10" fill="#10b981">-{f(v)} kN</text>
      </svg>
    </div>
  );
}

export default BeamResults;