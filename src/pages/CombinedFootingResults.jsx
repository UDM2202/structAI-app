// src/pages/CombinedFootingResults.jsx
import React, { useState, useRef } from "react";
import { exportElementToPdf } from "../utils/exportPdf";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiFileText, FiX, FiAlertTriangle, FiDownload } from "react-icons/fi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import Plot from "react-plotly.js";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155]";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const MAIN = "text-[#0F172A] dark:text-white";
const TITLE = "text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]";
const ACCENT = "#0A2F44", ACCENT_D = "#66a4c2";

export default function CombinedFootingResults() {
  const navigate = useNavigate();
  const sheetRef = useRef(null);
  const location = useLocation();
  const r = location.state?.designResult;
  const meta = location.state?.meta || {};
  const [showReport, setShowReport] = useState(false);

  if (!r) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[#111827] px-6">
        <div className={`${CARD} p-8 text-center max-w-md`}>
          <FiAlertTriangle className="mx-auto mb-3 text-amber-500" size={28} />
          <p className={`mb-4 ${MAIN}`}>No design results. Run a combined footing design first.</p>
          <button onClick={() => navigate("/combined-input")} className="rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636]">
            Go to Combined Footing Input
          </button>
        </div>
      </div>
    );
  }

  const pass = r.status === "PASS";
  const g = r.geometry, sp = r.soil_pressure, res = r.resultant, mo = r.moments;
  const lf = r.flexure.longitudinal, tf = r.flexure.transverse;
  const sh = r.one_way_shear, pn = r.punching, u = r.utilisation, lo = r.longitudinal;

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] px-6 py-6">
      <div ref={sheetRef} className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => navigate("/combined-input")} className={`flex items-center gap-2 text-sm ${SUB}`}>
            <FiArrowLeft size={16} /> Back to Input
          </button>
          <button onClick={() => setShowReport(true)} className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-4 py-2 text-sm text-[#0A2F44] dark:text-[#66a4c2] hover:bg-[#f1f5f9] dark:hover:bg-[#334155]">
            <FiFileText size={15} /> Detailed Report
          </button>
          <button onClick={() => exportElementToPdf(sheetRef.current, "CombinedFooting")} className="flex items-center gap-2 rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636]">
            <FiDownload size={15} /> Download PDF
          </button>
        </div>

        {r.extended_note && (
          <div className="flex items-start gap-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3">
            <FiInfoIcon />
            <p className="text-xs text-amber-800 dark:text-amber-300">{r.extended_note}</p>
          </div>
        )}

        {/* title + summary */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className={`${CARD} p-5`}>
            <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Combined Footing Output · EN 1992-1-1 + EN 1997-1</div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#0A2F44] dark:text-[#66a4c2]">Combined Footing</h1>
              <span className={`text-sm ${SUB}`}>{r.n_columns} columns · {r.load_case}{meta.project ? ` · ${meta.project}` : ""}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Mini label="Footing" value={`${g.footing_length_mm}×${g.footing_width_mm}`} />
              <Mini label="Total load" value={`${res.W_kN} kN`} />
              <Mini label="qmax" value={`${sp.qmax} kN/m²`} />
              <Mini label="Overall util" value={`${u.overall_pct}%`} />
            </div>
          </div>

          <div className={`rounded-xl border p-5 ${pass ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"}`}>
            <div className={TITLE}>Summary of Results</div>
            <div className="mt-3 flex items-center gap-3">
              {pass ? <FiCheckCircle className="text-green-600 dark:text-green-400" size={32} /> : <FiXCircle className="text-red-600 dark:text-red-400" size={32} />}
              <div className={`text-2xl font-bold ${pass ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>{pass ? "SAFE" : "UNSAFE"}</div>
            </div>
            <div className="mt-3 space-y-1.5">
              <SumLine label="Bearing" value={`${u.bearing_pct}%`} warn={u.bearing_pct > 100} />
              <SumLine label="Shear" value={`${u.shear_pct}%`} warn={u.shear_pct > 100} />
              <SumLine label="Punching" value={`${u.punching_pct}%`} warn={u.punching_pct > 100} />
            </div>
          </div>
        </div>

        {/* geometry + resultant */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Panel title="Foundation Geometry (Adopted)">
            <LayoutSVG columns={r.columns} L={g.L_m} B={g.B_m} />
            <div className="mt-3 grid grid-cols-2 gap-x-6">
              <KV label="Footing" value={`${g.footing_length_mm} × ${g.footing_width_mm} mm`} />
              <KV label="Thickness" value={`${g.footing_depth_mm} mm`} />
              <KV label="d (long / trans)" value={`${g.d_long_mm} / ${g.d_trans_mm} mm`} />
              <KV label="Cover" value={`${g.cover_mm} mm`} />
            </div>
          </Panel>

          <Panel title="Resultant & Bearing">
            <KV label="Total load W" value={`${res.W_kN} kN`} strong />
            <KV label="Resultant xR" value={`${res.xR_m} m from left`} />
            <KV label="My_total / ex" value={`${mo.My_total} kNm / ${mo.ex_m} m`} />
            <KV label="q0 / qmax / qmin" value={`${sp.q0} / ${sp.qmax} / ${sp.qmin}`} />
            <KV label="Bearing utilisation" value={`${u.bearing_pct}%`} strong warn={!sp.bearing_ok} />
          </Panel>
        </div>

        {/* SFD / BMD */}
        <Panel title="Longitudinal Analysis — Shear Force & Bending Moment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className={`mb-1 text-xs font-semibold ${SUB}`}>Shear Force (kN)</div>
              <DiagramChart data={lo.diagram} dataKey="V" color="#ef4444" columns={r.columns} />
            </div>
            <div>
              <div className={`mb-1 text-xs font-semibold ${SUB}`}>Bending Moment (kNm)</div>
              <DiagramChart data={lo.diagram} dataKey="M" color={ACCENT} columns={r.columns} invert />
            </div>
          </div>
          <p className={`mt-2 text-xs ${SUB}`}>Max moment {lo.max_M_kNm} kNm at x = {lo.max_M_location_m} m (drives longitudinal reinforcement). Beam on linear soil reaction.</p>
        </Panel>

        {/* reinforcement */}
        <Panel title="Reinforcement Design">
          <Table
            head={["Direction", "M (kNm)", "b (mm)", "d (mm)", "As,req", "As,prov", "Bar / Spacing", "Status"]}
            rows={[
              ["Longitudinal", lf.M_kNm, lf.b_mm, lf.d_eff_mm, lf.As_req, lf.As_provided, `Y${lf.bar_dia}@${lf.spacing_mm}`, <Badge key="l" ok={lf.status === "OK"}>{lf.status}</Badge>],
              ["Transverse", tf.M_kNm, tf.b_mm, tf.d_eff_mm, tf.As_req, tf.As_provided, `Y${tf.bar_dia}@${tf.spacing_mm}`, <Badge key="t" ok={tf.status === "OK"}>{tf.status}</Badge>],
            ]}
          />
        </Panel>

        {/* soil pressure 3D + shear checks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Panel title="Soil Pressure Distribution">
            <SoilPressure3D corners={sp.corners} L={g.L_m} B={g.B_m} />
            <p className={`mt-2 text-xs ${SUB}`}>qmax {sp.qmax} / qmin {sp.qmin} kN/m². {sp.bearing_ok ? "Within allowable." : "Exceeds allowable bearing."}</p>
          </Panel>

          <Panel title="Shear Checks">
            <Table
              head={["Check", "VEd / vEd", "Resistance", "Status"]}
              rows={[
                ["One-way shear", `${sh.VEd_kN} kN`, `${sh.VRdc_kN} kN`, <Badge key="s" ok={sh.status === "OK"}>{sh.status}</Badge>],
                ["Punching (6.4)", `${pn.vEd_MPa} MPa`, `${pn.vRdc_MPa} MPa`, <Badge key="p" ok={pn.status === "OK"}>{pn.status}</Badge>],
              ]}
            />
            <div className="mt-3"><KV label="Punching perimeter u1" value={`${pn.u1_m} m`} /><KV label="Punching force" value={`${pn.VEd_punch_kN} kN`} /></div>
          </Panel>
        </div>

        {/* summary chips */}
        <Panel title="Design Summary">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Chip label="Bearing" pct={u.bearing_pct} ok={sp.bearing_ok} />
            <Chip label="One-way shear" ok={sh.status === "OK"} />
            <Chip label="Punching" pct={u.punching_pct} ok={pn.status === "OK"} />
            <Chip label="Reinforcement" ok={lf.status === "OK" && tf.status === "OK"} />
            <Chip label="Uplift" ok={sp.uplift_ok} />
          </div>
        </Panel>

        <p className={`text-xs ${SUB} text-center pt-2`}>
          Computed per EN 1992-1-1 (§6.2, §6.4, §9.8) & EN 1997-1. Beam-on-soil longitudinal analysis. Validate against a trusted tool before real design.
        </p>
      </div>

      {showReport && <ReportModal r={r} onClose={() => setShowReport(false)} />}
    </div>
  );
}

function FiInfoIcon() {
  return <FiAlertTriangle className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" size={14} />;
}

/* SFD/BMD chart */
function DiagramChart({ data, dataKey, color, columns, invert }) {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const gridColor = dark ? "#334155" : "#e2e8f0";
  const tickColor = dark ? "#94a3b8" : "#64748b";
  // downsample for performance (501 -> ~100 pts)
  const step = Math.max(1, Math.floor(data.length / 120));
  const pts = data.filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((p) => ({ x: p.x, val: invert ? -p[dataKey] : p[dataKey] }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={pts} margin={{ top: 5, right: 10, bottom: 18, left: 0 }}>
        <CartesianGrid stroke={gridColor} strokeOpacity={0.5} />
        <XAxis dataKey="x" type="number" domain={[0, "dataMax"]} tick={{ fontSize: 10, fill: tickColor }}
          tickFormatter={(v) => v.toFixed(1)} stroke={gridColor}
          label={{ value: "x (m)", position: "insideBottom", offset: -6, fontSize: 10, fill: tickColor }} />
        <YAxis tick={{ fontSize: 10, fill: tickColor }} stroke={gridColor} tickFormatter={(v) => (invert ? -v : v).toFixed(0)} />
        <Tooltip contentStyle={{ fontSize: 11, background: dark ? "#1f2937" : "#fff", border: `1px solid ${gridColor}` }}
          formatter={(v) => [(invert ? -v : v).toFixed(2), dataKey === "V" ? "V (kN)" : "M (kNm)"]}
          labelFormatter={(v) => `x = ${(+v).toFixed(3)} m`} />
        <ReferenceLine y={0} stroke={tickColor} strokeWidth={1} />
        {columns.map((c, i) => <ReferenceLine key={i} x={c.x_m} stroke={ACCENT_D} strokeDasharray="3 3" strokeOpacity={0.6} />)}
        <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* 3D soil pressure surface */
function SoilPressure3D({ corners, L, B }) {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const axFont = dark ? "#94a3b8" : "#64748b";
  const gridC = dark ? "#334155" : "#e2e8f0";
  const N = 12, x = [], y = [], z = [];
  for (let j = 0; j <= N; j++) y.push((B * j) / N);
  for (let i = 0; i <= N; i++) x.push((L * i) / N);
  for (let j = 0; j <= N; j++) {
    const row = [], ty = j / N;
    for (let i = 0; i <= N; i++) {
      const tx = i / N;
      const top = corners.c3 * (1 - tx) + corners.c1 * tx;
      const bot = corners.c4 * (1 - tx) + corners.c2 * tx;
      row.push(bot * (1 - ty) + top * ty);
    }
    z.push(row);
  }
  return (
    <div data-pdf-skip="3D interaction surface — view interactively in the app">
    <Plot
      data={[{ type: "surface", x, y, z, colorscale: "Jet", showscale: true, colorbar: { title: "kN/m²", thickness: 10, len: 0.7 } }]}
      layout={{
        autosize: true, height: 280, margin: { l: 0, r: 0, t: 0, b: 0 },
        scene: {
          xaxis: { title: { text: "L (m)", font: { size: 10, color: axFont } }, tickfont: { size: 9, color: axFont }, gridcolor: gridC, showbackground: false },
          yaxis: { title: { text: "B (m)", font: { size: 10, color: axFont } }, tickfont: { size: 9, color: axFont }, gridcolor: gridC, showbackground: false },
          zaxis: { title: { text: "q", font: { size: 10, color: axFont } }, tickfont: { size: 9, color: axFont }, gridcolor: gridC, showbackground: false },
          camera: { eye: { x: 1.6, y: 1.4, z: 1.0 } },
        },
        paper_bgcolor: "rgba(0,0,0,0)",
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
      useResizeHandler
    />
    </div>
  );
}

/* plan diagram with columns */
function LayoutSVG({ columns, L, B }) {
  if (!(L > 0) || !(B > 0)) return null;
  const W = 500, H = 90, pad = 24, draw = W - 2 * pad, s = draw / L;
  const fh = Math.min(B * s, H - 2 * pad), x0 = pad, y0 = (H - fh) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect x={x0} y={y0} width={L * s} height={fh} className="fill-[#eef2f6] dark:fill-[#0f172a]" stroke={ACCENT} strokeWidth="1.5" />
      {columns.map((c, i) => {
        const cx = x0 + c.x_m * s;
        return (
          <g key={i}>
            <rect x={cx - 5} y={y0 + fh / 2 - 5} width={10} height={10} fill={ACCENT} />
            <text x={cx} y={y0 - 4} textAnchor="middle" fontSize="9" className="fill-[#0A2F44] dark:fill-[#66a4c2]" fontWeight="bold">{c.id}</text>
            <text x={cx} y={y0 + fh + 11} textAnchor="middle" fontSize="8" className="fill-[#94a3b8]">{c.P_kN}kN</text>
          </g>
        );
      })}
    </svg>
  );
}

function ReportModal({ r, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`${CARD} max-h-[85vh] w-full max-w-3xl overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] px-5 py-3">
          <h3 className={TITLE}>Detailed Calculation Report — Combined Footing</h3>
          <button onClick={onClose} className={SUB}><FiX size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          {(r.report || []).map((sec, i) => (
            <div key={i}>
              <h4 className={`mb-2 text-sm font-bold ${MAIN}`}>{sec.section}</h4>
              <table className="w-full text-xs">
                <tbody>
                  {sec.rows.map((row, j) => (
                    <tr key={j} className="border-b border-[#f1f5f9] dark:border-[#2a3646]">
                      <td className={`py-1.5 pr-3 ${SUB} whitespace-nowrap align-top`} style={{ width: "26%" }}>{row.ref}</td>
                      <td className={`py-1.5 pr-3 font-mono ${MAIN}`}>{row.calc}</td>
                      <td className="py-1.5 font-mono font-semibold text-[#0A2F44] dark:text-[#66a4c2] text-right whitespace-nowrap">{row.out}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className={CARD}>
      <div className="border-b border-[#e2e8f0] dark:border-[#334155] px-5 py-3"><h3 className={TITLE}>{title}</h3></div>
      <div className="p-5">{children}</div>
    </div>
  );
}
function KV({ label, value, strong, warn }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#f1f5f9] dark:border-[#2a3646] last:border-0">
      <span className={`text-xs ${SUB}`}>{label}</span>
      <span className={`text-xs ${strong ? "font-bold" : "font-medium"} ${warn ? "text-red-600 dark:text-red-400" : MAIN}`}>{value}</span>
    </div>
  );
}
function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f8fafc] dark:bg-[#111827] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[#94a3b8]">{label}</div>
      <div className={`text-sm font-semibold ${MAIN}`}>{value}</div>
    </div>
  );
}
function SumLine({ label, value, warn }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${SUB}`}>{label}</span>
      <span className={`text-xs font-semibold ${warn ? "text-red-600 dark:text-red-400" : MAIN}`}>{value}</span>
    </div>
  );
}
function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className={`text-left ${SUB} border-b border-[#e2e8f0] dark:border-[#334155]`}>
          {head.map((h, i) => <th key={i} className="py-2 pr-3 font-medium whitespace-nowrap">{h}</th>)}
        </tr></thead>
        <tbody className={MAIN}>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#f1f5f9] dark:border-[#2a3646]">
              {row.map((c, j) => <td key={j} className="py-2 pr-3 font-mono whitespace-nowrap">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Badge({ ok, children }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ok ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}>{children}</span>;
}
function Chip({ label, pct, ok }) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-lg border p-3 ${ok ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"}`}>
      {ok ? <FiCheckCircle className="text-green-600 dark:text-green-400" size={18} /> : <FiXCircle className="text-red-600 dark:text-red-400" size={18} />}
      <span className={`text-[11px] text-center ${MAIN}`}>{label}</span>
      {pct != null && <span className={`text-[11px] font-semibold ${ok ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>{pct}%</span>}
    </div>
  );
}