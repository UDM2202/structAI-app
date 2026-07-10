import React, { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiFileText, FiDownload, FiChevronRight } from "react-icons/fi";
import { exportElementToPdf } from "../utils/exportPdf";

const NAVY = "#0A2F44";
const CARD = "rounded-lg border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937]";
const MAIN = "text-[#0F172A] dark:text-white";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const ACCENT = "text-[#0A2F44] dark:text-[#66a4c2]";
const HEAD = "text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]";
const RED = "#ef4444";
const GREEN = "#16a34a";

const f = (v, d = 2) => (Number.isFinite(v) ? Number(v).toFixed(d) : "\u2014");
const isPass = (s) => s === "PASS" || s === "OK";

export default function BeamResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.designResult;
  const sheetRef = useRef(null);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className={`${CARD} p-8 text-center max-w-md`}>
          <p className={`mb-4 ${MAIN}`}>No beam results. Run a beam design first.</p>
          <button onClick={() => navigate("/beam")} className="rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636]">
            Back to Input
          </button>
        </div>
      </div>
    );
  }

  const { summary, materials, loads, forces, capacity, reinforcement, sls, notes } = data;
  const pass = isPass(summary.status);
  const r = reinforcement;
  const codeShort = (summary.design_code || "").includes("1992") || (summary.design_code || "").includes("EC2") ? "EC2" : summary.design_code;

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] pb-10">
      <div className="border-b border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0A2F44] text-white text-sm font-bold">X</div>
            <span className={`text-sm font-bold ${MAIN}`}>StructDesign EC2</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px]">
            <Step n="1" label="Input" sub="Geometry & Material" />
            <Step n="2" label="Loads" sub="& Combinations" />
            <Step n="3" label="Design" sub="Parameters" />
            <Step n="4" label="Output" sub="Results" active />
            <Step n="5" label="Checks" sub="Summary" />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-lg border border-[#0A2F44] dark:border-[#66a4c2] px-3 py-1.5 text-[12px] font-medium text-[#0A2F44] dark:text-[#66a4c2] hover:bg-[#e6f0f5] dark:hover:bg-[#1e3a4a]">
              <FiFileText size={14} /> Detailed Report (PDF)
            </button>
            <button onClick={() => exportElementToPdf(sheetRef.current, `Beam-${summary.beam_id || "report"}`)} className="flex items-center gap-1.5 rounded-lg bg-[#0A2F44] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#082636]">
              <FiDownload size={14} /> Download Report
            </button>
          </div>
        </div>
      </div>

      <div ref={sheetRef} className="mx-auto max-w-7xl px-6 pt-5">
        <div className="mb-4 flex items-end justify-between">
          <h1 className="text-xl font-extrabold text-[#0A2F44] dark:text-[#66a4c2] uppercase tracking-tight">
            Simply Supported Beam Output ({codeShort})
          </h1>
          <span className={`text-xs font-semibold ${MAIN}`}>Design Code : {summary.design_code}</span>
        </div>

        <div className={`${CARD} mb-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 divide-x divide-[#e2e8f0] dark:divide-[#334155]`}>
          <Strip label="Beam ID" value={summary.beam_id} />
          <Strip label="Support Condition" value={summary.support_condition} />
          <Strip label="Span (L)" value={`${summary.span} mm`} />
          <Strip label="Section" value={`${summary.width} x ${summary.depth}`} />
          <Strip label="Concrete" value={summary.concrete_grade} />
          <Strip label="Reinforcement" value={summary.steel_grade} />
          <Strip label="Analysis" value={summary.analysis} />
          <Strip label="Units" value="kN, mm" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <Card n="1" title="Geometry">
              <div className="flex items-center justify-between gap-4">
                <ElevationSVG span={summary.span} />
                <CrossSectionSVG width={summary.width} depth={summary.depth} rein={r} />
              </div>
              <p className={`mt-2 text-center text-[11px] ${SUB}`}>All dimensions in mm</p>
            </Card>

            <Card n="2" title="Loading Diagram (Characteristic)">
              <LoadingSVG span={summary.span} wk={loads.total_service} />
              <p className={`mt-1 text-center text-[11px] ${SUB}`}>(Includes self weight)</p>
            </Card>

            <Card n="3" title="Materials">
              <Table
                head={["Material", "Grade", "Design Value"]}
                rows={[
                  ["Concrete", summary.concrete_grade, `f_ck = ${f(materials.fck, 0)} MPa,  f_cd = ${f(materials.fcd, 1)} MPa`],
                  ["Reinforcement", summary.steel_grade, `f_yk = ${f(materials.fyk, 0)} MPa,  f_yd = ${f(materials.fyd, 0)} MPa`],
                  ["Modular Ratio (n)", "-", f(materials.modular_ratio, 1)],
                  ["Unit Weight of Concrete (\u03b3c)", "-", `${f(materials.unit_weight_concrete, 1)} kN/m\u00b3`],
                ]}
              />
            </Card>

            <Card n="4" title="Load Summary (Characteristic)">
              <LoadTable loads={loads} />
            </Card>

            <Card n="5" title="Design Situations (ULS)">
              <Table
                head={["Situation", "Action Combination (EN 1990)", "Design UDL, w_d (kN/m)"]}
                rows={[["Persistent / Transient", forces.ultimate_combo, f(forces.design_udl)]]}
              />
            </Card>

            <Card n="6" title="Design Results (ULS)">
              <KV rows={[
                ["Design UDL, w_d", `${f(forces.design_udl)} kN/m`],
                ["Maximum Bending Moment, M_Ed", `${f(forces.max_moment)} kN\u00b7m`],
                ["Maximum Shear Force, V_Ed", `${f(forces.max_shear)} kN`],
              ]} />
            </Card>

            <Card n="7" title="Section Capacity Check (ULS)">
              <KVStatus rows={[
                ["Design Bending Resistance, M_Rd", `${f(capacity.moment_resistance)} kN\u00b7m`, null],
                ["Design Shear Resistance, V_Rd,c", `${f(capacity.shear_resistance)} kN`, null],
                ["Utilisation (Bending)", f(capacity.utilization_bending), capacity.utilization_bending <= 1],
                ["Utilisation (Shear)", f(capacity.utilization_shear), capacity.utilization_shear <= 1],
              ]} />
            </Card>

            <Card n="8" title="Summary of Results">
              <KVStatus rows={[
                ["Deflection Check (SLS)", `${f(sls.deflection_actual, 1)} mm`, isPass(sls.deflection_status)],
                ["Crack Width, w_k", `${f(sls.crack_width, 2)} mm`, isPass(sls.crack_status)],
              ]} />
              <div className={`mt-3 flex items-center justify-between rounded-md px-3 py-2 ${pass ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                <span className={`text-sm font-semibold ${MAIN}`}>Overall Status</span>
                <span className={`text-base font-extrabold ${pass ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {pass ? "SAFE" : "REVIEW"}
                </span>
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card n="9" title="Bending Moment Diagram (Design)">
              <BMDSVG mMax={forces.max_moment} span={summary.span} />
            </Card>

            <Card n="10" title="Shear Force Diagram (Design)">
              <SFDSVG vMax={forces.max_shear} span={summary.span} />
            </Card>

            <Card n="11" title="Reinforcement Details">
              <div className="flex items-start gap-4">
                <CrossSectionSVG width={summary.width} depth={summary.depth} rein={r} big />
                <div className="flex-1">
                  <Table
                    head={["Reinforcement", "Details"]}
                    rows={[
                      ["Tension Reinforcement (Bottom)", `${r.tension.label} (A_s,prov = ${f(r.tension.area_provided, 0)} mm\u00b2)`],
                      ["Compression Reinforcement (Top)", `${r.compression.label} (A_s,prov = ${f(r.compression.area_provided, 0)} mm\u00b2)`],
                      ["Shear Reinforcement (Stirrups)", r.stirrups.label],
                      ["Clear Cover (Bottom / Top / Sides)", `${r.cover} / ${r.cover} / ${r.cover} mm`],
                    ]}
                  />
                </div>
              </div>
            </Card>

            <Card n="12" title="Serviceability Checks (SLS)">
              <Table
                head={["Check", "Limit (EC2)", "Calculated", "Status"]}
                rows={[
                  ["Deflection (Inst.)", `L/250 = ${f(sls.deflection_limit, 1)} mm`, `${f(sls.deflection_actual, 1)} mm`, <Stat key="d" ok={isPass(sls.deflection_status)} />],
                  ["Crack Width, w_k", `${f(sls.crack_limit, 2)} mm`, `${f(sls.crack_width, 2)} mm`, <Stat key="c" ok={isPass(sls.crack_status)} />],
                ]}
              />
            </Card>

            <Card n="13" title="Notes">
              <ul className="space-y-1.5">
                {(notes || []).map((nn, i) => (
                  <li key={i} className={`flex gap-2 text-[12px] ${SUB}`}>
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#94a3b8]" /> {nn}
                  </li>
                ))}
              </ul>
            </Card>

            <Card n="14" title="Detailed Report">
              <p className={`text-[12px] ${SUB} mb-3`}>
                For full calculation details, assumptions, formulas, intermediate steps and checks, download the detailed report.
              </p>
              <button onClick={() => exportElementToPdf(sheetRef.current, `Beam-${summary.beam_id || "report"}`)} className="flex w-full items-center justify-between rounded-lg border border-[#0A2F44] dark:border-[#66a4c2] px-4 py-2.5 text-sm font-medium text-[#0A2F44] dark:text-[#66a4c2] hover:bg-[#e6f0f5] dark:hover:bg-[#1e3a4a]">
                <span className="flex items-center gap-2"><FiFileText size={15} /> Detailed Report (PDF)</span>
                <FiChevronRight size={16} />
              </button>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={() => navigate("/beam")} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${SUB} hover:bg-[#e2e8f0] dark:hover:bg-[#334155]`}>
            <FiArrowLeft size={15} /> Back to Input
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, label, sub, active }) {
  return (
    <div className={`flex items-center gap-2 ${active ? ACCENT : SUB}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${active ? "bg-[#0A2F44] text-white dark:bg-[#66a4c2]" : "bg-[#e2e8f0] dark:bg-[#334155] text-[#64748b]"}`}>{n}</span>
      <div className="leading-tight">
        <div className={`font-semibold ${active ? ACCENT : MAIN}`}>{label}</div>
        <div className="text-[10px] text-[#94a3b8]">{sub}</div>
      </div>
    </div>
  );
}
function Strip({ label, value }) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8]">{label}</div>
      <div className={`text-[12px] font-semibold ${MAIN} leading-tight mt-0.5`}>{value}</div>
    </div>
  );
}
function Card({ n, title, children }) {
  return (
    <section className={CARD}>
      <header className="flex items-center gap-2 border-b border-[#e2e8f0] dark:border-[#334155] px-4 py-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#e6f0f5] dark:bg-[#1e3a4a] text-[11px] font-bold text-[#0A2F44] dark:text-[#66a4c2]">{n}</span>
        <h3 className={HEAD}>{title}</h3>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
function Table({ head, rows }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-[#334155]">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="bg-[#f8fafc] dark:bg-[#0b0f19] text-[10px] uppercase tracking-wide text-[#94a3b8]">
            {head.map((h, i) => <th key={i} className="px-3 py-2 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[#f1f5f9] dark:border-[#263244]">
              {row.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? `font-medium ${MAIN}` : SUB} font-mono`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function LoadTable({ loads }) {
  const comps = loads.components || [];
  const dead = comps.filter((c) => c.kind === "DL");
  const live = comps.filter((c) => c.kind === "LL");
  const descFor = (name) => {
    if (/self/i.test(name)) return "Self weight of beam";
    if (/wall/i.test(name)) return "Masonry / wall load";
    if (/finish/i.test(name)) return "Floor finishes";
    if (/additional/i.test(name)) return "MEP / services";
    if (/^live/i.test(name)) return "Imposed load";
    if (/other/i.test(name)) return "Partitions / equipment";
    return "";
  };
  return (
    <div className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-[#334155]">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="bg-[#f8fafc] dark:bg-[#0b0f19] text-[10px] uppercase tracking-wide text-[#94a3b8]">
            <th className="px-3 py-2 font-semibold">Load Type</th>
            <th className="px-3 py-2 font-semibold">Description</th>
            <th className="px-3 py-2 font-semibold text-right">Value (kN/m)</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {dead.map((c, i) => (
            <tr key={`d${i}`} className="border-t border-[#f1f5f9] dark:border-[#263244]">
              <td className={`px-3 py-1.5 ${MAIN}`}>{c.name}</td>
              <td className={`px-3 py-1.5 ${SUB}`}>{descFor(c.name)}</td>
              <td className={`px-3 py-1.5 text-right ${MAIN}`}>{f(c.value)}</td>
            </tr>
          ))}
          <TotalRow label="TOTAL DEAD LOAD (G_k)" value={loads.total_dead} />
          {live.map((c, i) => (
            <tr key={`l${i}`} className="border-t border-[#f1f5f9] dark:border-[#263244]">
              <td className={`px-3 py-1.5 ${MAIN}`}>{c.name}</td>
              <td className={`px-3 py-1.5 ${SUB}`}>{descFor(c.name)}</td>
              <td className={`px-3 py-1.5 text-right ${MAIN}`}>{f(c.value)}</td>
            </tr>
          ))}
          <TotalRow label="TOTAL LIVE LOAD (Q_k)" value={loads.total_live} />
          <TotalRow label="TOTAL SERVICE LOAD (G_k + Q_k)" value={loads.total_service} strong />
        </tbody>
      </table>
    </div>
  );
}
function TotalRow({ label, value, strong }) {
  return (
    <tr className={`border-t border-[#f1f5f9] dark:border-[#263244] ${strong ? "bg-[#e6f0f5] dark:bg-[#1e3a4a]" : "bg-[#f8fafc] dark:bg-[#0b0f19]"}`}>
      <td className={`px-3 py-1.5 font-semibold ${strong ? "text-[#0A2F44] dark:text-[#66a4c2]" : MAIN}`} colSpan={2}>{label}</td>
      <td className={`px-3 py-1.5 text-right font-mono font-bold ${strong ? "text-[#0A2F44] dark:text-[#66a4c2]" : MAIN}`}>{f(value)}</td>
    </tr>
  );
}
function KV({ rows }) {
  return (
    <div className="divide-y divide-[#f1f5f9] dark:divide-[#263244]">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <span className={`text-[12px] ${SUB}`}>{r[0]}</span>
          <span className={`text-[12px] font-mono font-semibold ${MAIN}`}>{r[1]}</span>
        </div>
      ))}
    </div>
  );
}
function KVStatus({ rows }) {
  return (
    <div className="divide-y divide-[#f1f5f9] dark:divide-[#263244]">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <span className={`text-[12px] ${SUB}`}>{r[0]}</span>
          <span className="flex items-center gap-3">
            <span className={`text-[12px] font-mono font-semibold ${MAIN}`}>{r[1]}</span>
            {r[2] != null && <Stat ok={r[2]} />}
          </span>
        </div>
      ))}
    </div>
  );
}
function Stat({ ok }) {
  return <span className={`text-[11px] font-bold ${ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{ok ? "OK" : "FAIL"}</span>;
}

function ElevationSVG({ span }) {
  return (
    <svg viewBox="0 0 260 150" className="w-[58%]">
      <rect x="30" y="40" width="200" height="26" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" />
      <path d="M30,66 l-11,15 h22 z" fill="none" stroke="#64748b" strokeWidth="1.3" />
      <path d="M230,66 l-11,15 h22 z" fill="none" stroke="#64748b" strokeWidth="1.3" />
      <line x1="14" y1="81" x2="24" y2="81" stroke="#64748b" strokeWidth="1" />
      <line x1="216" y1="81" x2="226" y2="81" stroke="#64748b" strokeWidth="1" />
      <line x1="30" y1="110" x2="230" y2="110" stroke={NAVY} strokeWidth="1" markerStart="url(#ar)" markerEnd="url(#ar)" />
      <text x="130" y="124" fontSize="10" fill={NAVY} textAnchor="middle">{span} mm</text>
      <defs><marker id="ar" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={NAVY} /></marker></defs>
    </svg>
  );
}
function CrossSectionSVG({ width, depth, rein, big }) {
  const nb = rein?.tension?.count || 3;
  const bw = big ? 70 : 54;
  const bh = big ? 110 : 92;
  const x0 = big ? 30 : 24, y0 = 14;
  const xs = Array.from({ length: nb }, (_, i) => x0 + 12 + (i * (bw - 24)) / (nb - 1 || 1));
  const topN = rein?.compression?.count || 2;
  const xt = Array.from({ length: topN }, (_, i) => x0 + 12 + (i * (bw - 24)) / (topN - 1 || 1));
  return (
    <svg viewBox={`0 0 ${bw + 70} ${bh + 40}`} className={big ? "w-[130px]" : "w-[38%]"}>
      <rect x={x0} y={y0} width={bw} height={bh} fill="#e2e8f0" stroke="#64748b" strokeWidth="1.3" />
      <rect x={x0 + 6} y={y0 + 6} width={bw - 12} height={bh - 12} fill="none" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3 2" />
      {xs.map((x, i) => <circle key={`b${i}`} cx={x} cy={y0 + bh - 12} r="3.2" fill="#ef4444" />)}
      {xt.map((x, i) => <circle key={`t${i}`} cx={x} cy={y0 + 12} r="2.6" fill="#ef4444" />)}
      <line x1={x0} y1={y0 + bh + 12} x2={x0 + bw} y2={y0 + bh + 12} stroke={NAVY} strokeWidth="1" markerStart="url(#cx)" markerEnd="url(#cx)" />
      <text x={x0 + bw / 2} y={y0 + bh + 24} fontSize="9" fill={NAVY} textAnchor="middle">{width}</text>
      <line x1={x0 + bw + 12} y1={y0} x2={x0 + bw + 12} y2={y0 + bh} stroke={NAVY} strokeWidth="1" markerStart="url(#cx)" markerEnd="url(#cx)" />
      <text x={x0 + bw + 26} y={y0 + bh / 2} fontSize="9" fill={NAVY} textAnchor="middle" transform={`rotate(90 ${x0 + bw + 26} ${y0 + bh / 2})`}>{depth}</text>
      <defs><marker id="cx" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={NAVY} /></marker></defs>
    </svg>
  );
}
function LoadingSVG({ span, wk }) {
  const x0 = 40, x1 = 320;
  const arrows = [];
  for (let x = x0; x <= x1; x += 20) arrows.push(x);
  return (
    <svg viewBox="0 0 360 120" className="w-full">
      <text x={(x0 + x1) / 2} y="14" fontSize="11" fill={NAVY} textAnchor="middle">w_k = {f(wk)} kN/m</text>
      <line x1={x0} y1="24" x2={x1} y2="24" stroke="#3b82f6" strokeWidth="1.4" />
      {arrows.map((x, i) => <line key={i} x1={x} y1="24" x2={x} y2="46" stroke="#3b82f6" strokeWidth="1" markerEnd="url(#ld)" />)}
      <rect x={x0} y="48" width={x1 - x0} height="16" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
      <path d={`M${x0},64 l-10,13 h20 z`} fill="none" stroke="#64748b" strokeWidth="1.2" />
      <path d={`M${x1},64 l-10,13 h20 z`} fill="none" stroke="#64748b" strokeWidth="1.2" />
      <line x1={x0} y1="98" x2={x1} y2="98" stroke={NAVY} strokeWidth="1" markerStart="url(#lda)" markerEnd="url(#lda)" />
      <text x={(x0 + x1) / 2} y="112" fontSize="10" fill={NAVY} textAnchor="middle">{span} mm</text>
      <defs>
        <marker id="ld" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto"><path d="M0,0 L3,5 L6,0 Z" fill="#3b82f6" /></marker>
        <marker id="lda" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={NAVY} /></marker>
      </defs>
    </svg>
  );
}
function BMDSVG({ mMax, span }) {
  const x0 = 40, x1 = 340, base = 40, depth = 80;
  const mid = (x0 + x1) / 2;
  return (
    <svg viewBox="0 0 380 150" className="w-full">
      <line x1={x0} y1={base} x2={x1} y2={base} stroke="#94a3b8" strokeWidth="1" />
      <path d={`M${x0},${base} Q${mid},${base + 2 * depth} ${x1},${base} Z`} fill={RED} fillOpacity="0.75" stroke={RED} strokeWidth="1.4" />
      <text x={mid} y={base + depth + 4} fontSize="13" fill="#fff" textAnchor="middle" fontWeight="bold">+</text>
      <text x={mid} y={base - 8} fontSize="11" fill={RED} textAnchor="middle" fontWeight="bold">M_Ed,max = {f(mMax)} kN\u00b7m</text>
      <text x={x0 - 4} y={base + 4} fontSize="10" fill="#64748b" textAnchor="end">0</text>
      <text x={x1 + 4} y={base + 4} fontSize="10" fill="#64748b">0</text>
      <line x1={x0} y1={base + depth + 22} x2={x1} y2={base + depth + 22} stroke={NAVY} strokeWidth="1" markerStart="url(#bm)" markerEnd="url(#bm)" />
      <text x={mid} y={base + depth + 36} fontSize="10" fill={NAVY} textAnchor="middle">{span} mm</text>
      <defs><marker id="bm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={NAVY} /></marker></defs>
    </svg>
  );
}
function SFDSVG({ vMax, span }) {
  const x0 = 40, x1 = 340, mid = 60, h = 42;
  const cx = (x0 + x1) / 2;
  return (
    <svg viewBox="0 0 380 150" className="w-full">
      <line x1={x0} y1={mid} x2={x1} y2={mid} stroke="#94a3b8" strokeWidth="1" />
      <polygon points={`${x0},${mid} ${x0},${mid - h} ${cx},${mid}`} fill={RED} fillOpacity="0.75" stroke={RED} strokeWidth="1.3" />
      <polygon points={`${cx},${mid} ${x1},${mid + h} ${x1},${mid}`} fill={GREEN} fillOpacity="0.75" stroke={GREEN} strokeWidth="1.3" />
      <text x={x0 - 4} y={mid - h - 4} fontSize="10" fill={RED}>+{f(vMax)} kN</text>
      <text x={x1 + 4} y={mid + h + 12} fontSize="10" fill={GREEN} textAnchor="end">-{f(vMax)} kN</text>
      <text x={x0 - 6} y={mid + 4} fontSize="10" fill="#64748b" textAnchor="end">0</text>
      <line x1={x0} y1={mid + h + 22} x2={x1} y2={mid + h + 22} stroke={NAVY} strokeWidth="1" markerStart="url(#sf)" markerEnd="url(#sf)" />
      <text x={cx} y={mid + h + 36} fontSize="10" fill={NAVY} textAnchor="middle">{span} mm</text>
      <defs><marker id="sf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={NAVY} /></marker></defs>
    </svg>
  );
}