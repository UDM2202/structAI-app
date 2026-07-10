// src/pages/ColumnResults.jsx
import React, { useState, useRef } from "react";
import { exportElementToPdf } from "../utils/exportPdf";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiFileText, FiX, FiAlertTriangle, FiDownload } from "react-icons/fi";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Plot from "react-plotly.js";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155]";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const MAIN = "text-[#0F172A] dark:text-white";
const TITLE = "text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]";
const ACCENT = "#0A2F44";
const ACCENT_D = "#66a4c2";

export default function ColumnResults() {
  const navigate = useNavigate();
  const sheetRef = useRef(null);
  const location = useLocation();
  const r = location.state?.designResult;
  const [tab, setTab] = useState("overview");
  const [showReport, setShowReport] = useState(false);

  if (!r) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[#111827] px-6">
        <div className={`${CARD} p-8 text-center max-w-md`}>
          <FiAlertTriangle className="mx-auto mb-3 text-amber-500" size={28} />
          <p className={`mb-4 ${MAIN}`}>No design results. Run a column design first.</p>
          <button onClick={() => navigate("/column-input")} className="rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636]">
            Go to Column Input
          </button>
        </div>
      </div>
    );
  }

  const pass = r.status === "PASS";
  const crit = r.critical || {};
  const maxUtil = Math.max(...(r.levels || []).map((l) => l.utilisation), 0);

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] px-6 py-6">
      <div ref={sheetRef} className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => navigate("/column-input")} className={`flex items-center gap-2 text-sm ${SUB}`}>
            <FiArrowLeft size={16} /> Back to Input
          </button>
          <button onClick={() => setShowReport(true)} className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-4 py-2 text-sm text-[#0A2F44] dark:text-[#66a4c2] hover:bg-[#f1f5f9] dark:hover:bg-[#334155]">
            <FiFileText size={15} /> Detailed Report
          </button>
          <button onClick={() => exportElementToPdf(sheetRef.current, r.summary?.column_id || r.column_id || "C1")} className="flex items-center gap-2 rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636]">
            <FiDownload size={15} /> Download PDF
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className={`${CARD} p-5`}>
            <div className="text-xs text-[#94a3b8] uppercase tracking-wide mb-1">Column Design Output · EN 1992-1-1 (EC2)</div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#0A2F44] dark:text-[#66a4c2]">Column {r.column_id}</h1>
              <span className={`text-sm ${SUB} capitalize`}>{r.column_type} · {r.braced ? "Braced" : "Unbraced"} · {r.end_condition}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Mini label="Section" value={`${r.geometry.b_mm}×${r.geometry.h_mm}`} />
              <Mini label="Concrete" value={r.materials.concrete_grade} />
              <Mini label="Steel" value={`${r.geometry.n_bars}Ø${r.geometry.main_bar_dia_mm}`} />
              <Mini label="rho" value={`${r.reinforcement.rho_pct}%`} />
            </div>
          </div>

          <div className={`rounded-xl border p-5 ${pass ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"}`}>
            <div className={TITLE}>Summary of Results</div>
            <div className="mt-3 flex items-center gap-3">
              {pass ? <FiCheckCircle className="text-green-600 dark:text-green-400" size={32} /> : <FiXCircle className="text-red-600 dark:text-red-400" size={32} />}
              <div>
                <div className={`text-2xl font-bold ${pass ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>{pass ? "SAFE" : "UNSAFE"}</div>
                <div className={`text-xs ${SUB}`}>Governing: {r.governing}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <SumLine label="Max utilisation" value={maxUtil.toFixed(3)} warn={maxUtil > 1} />
              <SumLine label="Critical level" value={crit.level} />
              <SumLine label="Critical NEd" value={`${crit.NEd_kN} kN`} />
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-[#e2e8f0] dark:border-[#334155]">
          {[["overview", "Overview"], ["results", "Results"], ["checks", "Checks"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === k ? "border-[#0A2F44] dark:border-[#66a4c2] text-[#0A2F44] dark:text-[#66a4c2]" : `border-transparent ${SUB}`
              }`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab r={r} />}
        {tab === "results" && <ResultsTab r={r} />}
        {tab === "checks" && <ChecksTab r={r} />}

        <p className={`text-xs ${SUB} text-center pt-2`}>
          Interaction surface & N-M curve by strain compatibility. 2nd-order per EC2 5.8.8, crack width per EC2 7.3.4. Validate against a trusted tool before real design.
        </p>
      </div>

      {showReport && <ReportModal r={r} onClose={() => setShowReport(false)} />}
    </div>
  );
}

function OverviewTab({ r }) {
  const g = r.geometry, m = r.materials, re = r.reinforcement;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Panel title="Column Overview">
        <KV label="Column ID" value={r.column_id} />
        <KV label="Type" value={r.column_type} cap />
        <KV label="Bracing" value={r.braced ? "Braced" : "Unbraced"} />
        <KV label="End condition" value={r.end_condition} />
        <KV label="Section" value={`${g.b_mm} x ${g.h_mm} mm`} />
        <KV label="Tributary area" value={`${g.tributary_area_m2} m2`} />
      </Panel>

      <Panel title="Section & Reinforcement">
        <div className="flex items-center gap-4">
          <SectionSVG g={g} />
          <div className="flex-1 space-y-1.5">
            <KV label="Bars" value={`${g.n_bars} x D${g.main_bar_dia_mm}`} />
            <KV label="As provided" value={`${re.As_provided_mm2} mm2`} />
            <KV label="rho" value={`${re.rho_pct}%`} />
            <KV label="Cover" value={`${g.cover_mm} mm`} />
            <KV label="Links" value={`D${g.link_dia_mm}`} />
          </div>
        </div>
      </Panel>

      <Panel title="Design Summary (Governing)">
        <KV label="Design method" value="Load take-down + min. eccentricity" />
        <KV label="Critical level" value={r.critical.level} />
        <KV label="NEd" value={`${r.critical.NEd_kN} kN`} strong />
        <KV label="NRd" value={`${re.NRd_kN} kN`} />
        <KV label="Status" value={r.status} strong warn={r.status !== "PASS"} />
      </Panel>

      <Panel title="Materials (EC2 3.1.6 / 3.2.7)">
        <KV label="Concrete / fck" value={`${m.concrete_grade} - ${m.fck} MPa`} />
        <KV label="Steel / fyk" value={`${m.steel_grade} - ${m.fyk} MPa`} />
        <KV label="fcd" value={`${m.fcd} MPa`} />
        <KV label="fyd" value={`${m.fyd} MPa`} />
        <KV label="nu = 1 - fck/250" value={m.nu} />
      </Panel>
    </div>
  );
}

function ResultsTab({ r }) {
  const ic = r.interaction_curve || {};
  const be = r.biaxial_envelope || {};
  const sl = r.slenderness || {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="Axial Load - Interaction Check (N-M)">
          <InteractionChart points={ic.points || []} design={ic.design_point} />
          <p className={`mt-2 text-xs ${SUB}`}>Design point ({ic.design_point ? ic.design_point.M_kNm : "-"} kNm, {ic.design_point ? ic.design_point.N_kN : "-"} kN) - inside envelope is safe.</p>
        </Panel>
        <Panel title="Interaction Surface (N-Mx-My)">
          <Surface3D data={r.surface_3d || {}} />
          <p className={`mt-2 text-xs ${SUB}`}>3D failure surface by strain compatibility - drag to rotate. Red = design point.</p>
        </Panel>
      </div>

      <Panel title="Design Results (per level)">
        <Table
          head={["Level", "NEd (kN)", "Mx (kNm)", "My (kNm)", "ex (mm)", "ey (mm)", "Utilisation", "Check"]}
          rows={(r.levels || []).map((l) => [
            l.level, l.NEd_kN, l.Mx_kNm, l.My_kNm, l.ex_mm, l.ey_mm, l.utilisation,
            <Badge key="c" ok={l.check === "PASS"}>{l.check}</Badge>,
          ])}
        />
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="Effective Length & Slenderness (5.8.3)">
          <KV label="K (end condition)" value={sl.K} />
          <KV label="C (bracing)" value={sl.C} />
          <KV label="Leff" value={`${sl.Leff_m} m`} />
          <KV label="lambda" value={sl.lambda} />
          <KV label="lambda_lim = 20C/sqrt(n)" value={sl.lambda_lim} />
          <KV label="Classification" value={sl.classification} strong />
        </Panel>

        <Panel title="Second-Order Effects (5.8.8)">
          <Table
            head={["Level", "Kr", "Kphi", "e2 (mm)", "M2 (kNm)", "MEd (kNm)"]}
            rows={Object.entries(r.second_order || {}).map(([lvl, s]) => [
              lvl, s.Kr, s.Kphi, s.e2_mm, s.M2_kNm, s.MEd_kNm,
            ])}
          />
          <p className={`mt-2 text-xs ${SUB}`}>EC2 5.8.8 nominal curvature - Kr=(nu-n)/(nu-nbal), Kphi=1+beta*phi_ef.</p>
        </Panel>
      </div>
    </div>
  );
}

function ChecksTab({ r }) {
  const re = r.reinforcement, c = r.checks || {}, sls = r.sls || {}, t = r.ties || {}, crit = r.critical || {};
  const be = r.biaxial_envelope || {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="Min & Max Reinforcement (9.5.2)">
          <KV label="As provided" value={`${re.As_provided_mm2} mm2`} />
          <CheckLine label={`As,min = ${re.As_min_mm2} mm2`} ok={c.As_min} />
          <CheckLine label={`As,max = ${re.As_max_mm2} mm2`} ok={c.As_max} />
        </Panel>

        <Panel title="Section Capacity Check">
          <CapRow label="Axial" ed={crit.NEd_kN} rd={re.NRd_kN} unit="kN" />
          <CapRow label="Moment x" ed={be.design_point ? be.design_point.Mx_kNm : 0} rd={re.MRx_kNm} unit="kNm" />
          <CapRow label="Moment y" ed={be.design_point ? be.design_point.My_kNm : 0} rd={re.MRy_kNm} unit="kNm" />
        </Panel>

        <Panel title="Serviceability - Crack Width (EC2 7.3.4)">
          <CapRow label="Crack width wk" ed={sls.wk_mm} rd={sls.wk_limit_mm} unit="mm" />
          {sls.cracks && (
            <div className="mt-1">
              <KV label="Steel stress sigma_s" value={`${sls.sigma_s_MPa} MPa`} />
              <KV label="rho_p,eff" value={sls.rho_p_eff} />
              <KV label="sr,max" value={`${sls.sr_max_mm} mm`} />
            </div>
          )}
          <p className={`mt-2 text-xs ${SUB}`}>{sls.note}</p>
        </Panel>

        <Panel title="Column Classification (EC2)">
          <KV label="Slenderness lambda" value={r.slenderness ? r.slenderness.lambda : "-"} />
          <KV label="lambda_lim" value={r.slenderness ? r.slenderness.lambda_lim : "-"} />
          <KV label="Result" value={r.slenderness ? r.slenderness.classification : "-"} strong />
          <div className="mt-3"><KV label="Column type" value={r.column_type} cap /></div>
        </Panel>

        <Panel title="Tie Design (9.5.3)">
          <KV label="Min tie dia" value={`${t.min_dia_mm} mm`} />
          <KV label="Provided" value={`D${t.provided_dia_mm}`} />
          <KV label="Max spacing" value={`${t.max_spacing_mm} mm`} />
          <CheckLine label="Provided >= minimum" ok={c.tie_dia} />
        </Panel>

        <Panel title="All Checks">
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(c).filter(([, v]) => typeof v === "boolean").map(([k, v]) => (
              <CheckLine key={k} label={labelFor(k)} ok={v} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function InteractionChart({ points, design }) {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const lineColor = dark ? "#66a4c2" : "#0A2F44";
  const gridColor = dark ? "#334155" : "#e2e8f0";
  const tickColor = dark ? "#94a3b8" : "#64748b";
  const data = points.map((p) => ({ x: p.M_kNm, y: p.N_kN }));
  const dp = design ? [{ x: design.M_kNm, y: design.N_kN }] : [];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 10, right: 15, bottom: 20, left: 5 }}>
        <CartesianGrid stroke={gridColor} strokeOpacity={0.5} />
        <XAxis type="number" dataKey="x" name="M" unit=" kNm" tick={{ fontSize: 11, fill: tickColor }} stroke={gridColor}
          label={{ value: "M (kNm)", position: "insideBottom", offset: -8, fontSize: 11, fill: tickColor }} />
        <YAxis type="number" dataKey="y" name="N" unit=" kN" tick={{ fontSize: 11, fill: tickColor }} stroke={gridColor}
          label={{ value: "N (kN)", angle: -90, position: "insideLeft", fontSize: 11, fill: tickColor }} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ fontSize: 12, background: dark ? "#1f2937" : "#fff", border: `1px solid ${gridColor}`, color: dark ? "#fff" : "#0F172A" }} />
        <Scatter name="Capacity envelope" data={data} line={{ stroke: lineColor, strokeWidth: 2 }} fill={lineColor} shape="circle" />
        <Scatter name="Design point" data={dp} fill="#ef4444" shape="cross" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function Surface3D({ data }) {
  const pts = data.points || [];
  const dp = data.design_point;
  if (!pts.length) return <div className="flex h-[300px] items-center justify-center text-xs text-[#94a3b8]">No surface data</div>;
  // clip to compression (N >= 0) so it reads like the design dome
  const c = pts.filter((p) => p.N_kN >= 0);
  const mesh = {
    type: "mesh3d",
    x: c.map((p) => p.Mx_kNm),
    y: c.map((p) => p.My_kNm),
    z: c.map((p) => p.N_kN),
    intensity: c.map((p) => p.N_kN),
    colorscale: "Jet",
    opacity: 0.85,
    alphahull: 6,
    showscale: true,
    colorbar: { title: "N (kN)", thickness: 10, len: 0.7 },
  };
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const axFont = dark ? "#94a3b8" : "#64748b";
  const gridC = dark ? "#334155" : "#e2e8f0";
  const point = dp ? [{
    type: "scatter3d", mode: "markers",
    x: [dp.Mx_kNm], y: [dp.My_kNm], z: [dp.N_kN],
    marker: { size: 6, color: "#ef4444" }, name: "Design point",
  }] : [];
  const axis = (title) => ({
    title: { text: title, font: { size: 10, color: axFont } },
    tickfont: { size: 9, color: axFont }, gridcolor: gridC,
    backgroundcolor: "rgba(0,0,0,0)", showbackground: false, zerolinecolor: gridC,
  });
  return (
    <div className="w-full">
      <div data-pdf-skip="3D interaction surface — view interactively in the app">
      <Plot
        data={[mesh, ...point]}
        layout={{
          autosize: true, height: 320, margin: { l: 0, r: 0, t: 0, b: 0 },
          scene: {
            xaxis: axis("Mx (kNm)"), yaxis: axis("My (kNm)"), zaxis: axis("N (kN)"),
            camera: { eye: { x: 1.6, y: 1.6, z: 1.1 } },
          },
          showlegend: false,
          paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%" }}
        useResizeHandler
      />
      </div>
    </div>
  );
}

function SectionSVG({ g }) {
  const VB = 130, pad = 14;
  const draw = VB - 2 * pad;
  const scale = draw / Math.max(g.b_mm, g.h_mm);
  const w = g.b_mm * scale, h = g.h_mm * scale;
  const x0 = (VB - w) / 2, y0 = (VB - h) / 2;
  const inset = (g.cover_mm + g.link_dia_mm + g.main_bar_dia_mm / 2) * scale;
  const n = Math.max(2, Math.round((g.n_bars + 4) / 4));
  const bars = [];
  const xL = x0 + inset, xR = x0 + w - inset, yT = y0 + inset, yB = y0 + h - inset;
  const lerp = (a, b, t) => a + (b - a) * t;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    bars.push([lerp(xL, xR, t), yT]); bars.push([lerp(xL, xR, t), yB]);
  }
  for (let i = 1; i < n - 1; i++) {
    const t = i / (n - 1);
    bars.push([xL, lerp(yT, yB, t)]); bars.push([xR, lerp(yT, yB, t)]);
  }
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="w-[130px] flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
      <rect x={x0} y={y0} width={w} height={h} className="fill-[#eef2f6] dark:fill-[#0f172a]" stroke={ACCENT} strokeWidth="1.5" />
      <rect x={x0 + inset} y={y0 + inset} width={w - 2 * inset} height={h - 2 * inset} fill="none" stroke={ACCENT_D} strokeWidth="0.7" strokeDasharray="3 2" />
      {bars.map(([bx, by], i) => <circle key={i} cx={bx} cy={by} r={2.6} fill={ACCENT} />)}
    </svg>
  );
}

function ReportModal({ r, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`${CARD} max-h-[85vh] w-full max-w-3xl overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] px-5 py-3">
          <h3 className={TITLE}>Detailed Calculation Report - {r.column_id}</h3>
          <button onClick={onClose} className={SUB}><FiX size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          {(r.report || []).map((sec, i) => (
            <div key={i}>
              <h4 className={`mb-2 text-sm font-bold ${MAIN}`}>{sec.section}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {sec.rows.map((row, j) => (
                      <tr key={j} className="border-b border-[#f1f5f9] dark:border-[#2a3646]">
                        <td className={`py-1.5 pr-3 ${SUB} whitespace-nowrap align-top`} style={{ width: "22%" }}>{row.ref}</td>
                        <td className={`py-1.5 pr-3 font-mono ${MAIN}`}>{row.calc}</td>
                        <td className="py-1.5 font-mono font-semibold text-[#0A2F44] dark:text-[#66a4c2] text-right whitespace-nowrap">{row.out}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
function KV({ label, value, strong, warn, cap }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#f1f5f9] dark:border-[#2a3646] last:border-0">
      <span className={`text-xs ${SUB}`}>{label}</span>
      <span className={`text-xs ${cap ? "capitalize" : ""} ${strong ? "font-bold" : "font-medium"} ${warn ? "text-red-600 dark:text-red-400" : MAIN}`}>{value}</span>
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
        <thead>
          <tr className={`text-left ${SUB} border-b border-[#e2e8f0] dark:border-[#334155]`}>
            {head.map((h, i) => <th key={i} className="py-2 pr-3 font-medium whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
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
function CheckLine({ label, ok }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {ok ? <FiCheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={15} /> : <FiXCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={15} />}
      <span className={`text-xs ${MAIN}`}>{label}</span>
    </div>
  );
}
function CapRow({ label, ed, rd, unit }) {
  const util = rd > 0 ? ed / rd : 0;
  const ok = util <= 1;
  return (
    <div className="py-1.5 border-b border-[#f1f5f9] dark:border-[#2a3646] last:border-0">
      <div className="flex items-center justify-between">
        <span className={`text-xs ${SUB}`}>{label}</span>
        <span className={`text-xs font-mono ${MAIN}`}>{ed} / {rd} {unit}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-[#e2e8f0] dark:bg-[#334155] overflow-hidden">
          <div className={`h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min(util * 100, 100)}%` }} />
        </div>
        <span className={`text-[11px] font-semibold ${ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{(util * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
function labelFor(k) {
  return {
    axial: "Axial capacity (NRd >= NEd)", As_min: "Minimum reinforcement",
    As_max: "Maximum reinforcement", interaction: "N-M interaction", tie_dia: "Tie diameter",
  }[k] || k;
}