// src/pages/ColumnResults.jsx — EC2 column design output
//
// Reads the shape returned by services/column_service.py:ColumnDesignResult:
//   summary, materials, axial_by_level, levels[], detailing,
//   interaction_x[], interaction_y[], failed_checks[], report[]
// Report rows are { reference, calculation, output }.
import React, { useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { exportElementToPdf } from "../utils/exportPdf";
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiFileText, FiX,
  FiAlertTriangle, FiDownload, FiInfo,
} from "react-icons/fi";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155]";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const MAIN = "text-[#0F172A] dark:text-white";
const TITLE = "text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]";
const ACCENT = "#0A2F44", ACCENT_D = "#66a4c2";

const n1 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "—" : Number(v).toFixed(1));
const n2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "—" : Number(v).toFixed(2));
const n3 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "—" : Number(v).toFixed(3));
const UTIL_CAP = 999;
const utilText = (u) => (u >= UTIL_CAP ? "no capacity" : n3(u));

export default function ColumnResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const sheetRef = useRef(null);
  const r = location.state?.designResult;
  const [tab, setTab] = useState("overview");
  const [showReport, setShowReport] = useState(false);

  if (!r || !r.summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-6 dark:bg-[#111827]">
        <div className={`${CARD} max-w-md p-8 text-center`}>
          <FiAlertTriangle className="mx-auto mb-3 text-amber-500" size={28} />
          <p className={`mb-4 ${MAIN}`}>No design results. Run a column design first.</p>
          <button onClick={() => navigate("/column-input")}
            className="rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636]">
            Go to Column Input
          </button>
        </div>
      </div>
    );
  }

  const s = r.summary;
  const pass = s.status === "PASS";
  const levels = r.levels || [];
  const crit = levels.find((l) => l.level === s.critical_level) || levels[0] || {};
  const failed = r.failed_checks || [];
  const isBiaxial = s.column_type === "biaxial";

  return (
    <div className="min-h-screen bg-[#f3f4f6] px-6 py-6 dark:bg-[#111827]">
      <div ref={sheetRef} className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => navigate("/column-input")} className={`flex items-center gap-2 text-sm ${SUB}`}>
            <FiArrowLeft size={16} /> Back to Input
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-[#0A2F44] hover:bg-[#f1f5f9] dark:border-[#334155] dark:text-[#66a4c2] dark:hover:bg-[#334155]">
              <FiFileText size={15} /> Detailed Report
            </button>
            <button onClick={() => exportElementToPdf(sheetRef.current, `Column-${s.column_id}`)}
              className="flex items-center gap-2 rounded-lg bg-[#0A2F44] px-4 py-2 text-sm font-medium text-white hover:bg-[#082636]">
              <FiDownload size={15} /> Download PDF
            </button>
          </div>
        </div>

        {/* header + verdict */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div className={`${CARD} p-5`}>
            <div className="mb-1 text-xs uppercase tracking-wide text-[#94a3b8]">
              Column Design Output · {s.design_code}
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl font-bold text-[#0A2F44] dark:text-[#66a4c2]">Column {s.column_id}</h1>
              <span className={`text-sm capitalize ${SUB}`}>
                {s.column_type} · {s.braced ? "Braced" : "Unbraced"} · {s.end_condition}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Mini label="Section" value={`${n1(s.b_mm)} × ${n1(s.h_mm)}`} />
              <Mini label="Concrete" value={s.concrete_grade} />
              <Mini label="Bars" value={`${s.n_bars}Ø${n1(s.bar_dia_mm)}`} />
              <Mini label="ρ" value={`${n2(r.detailing?.rho_pct)}%`} />
            </div>
          </div>

          <div className={`rounded-xl border p-5 ${pass
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"}`}>
            <div className={TITLE}>Summary of Results</div>
            <div className="mt-3 flex items-center gap-3">
              {pass ? <FiCheckCircle className="text-green-600 dark:text-green-400" size={32} />
                    : <FiXCircle className="text-red-600 dark:text-red-400" size={32} />}
              <div>
                <div className={`text-2xl font-bold ${pass ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                  {pass ? "SAFE" : "CHECK REQUIRED"}
                </div>
                <div className={`text-xs ${SUB}`}>
                  {s.used_takedown ? "Load take-down" : "N_Ed supplied directly"}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <SumLine label="Critical level" value={s.critical_level} />
              <SumLine label="N_Ed" value={`${n2(s.NEd_critical_kN)} kN`} />
              <SumLine label="Governing utilisation" value={utilText(crit.governing_utilisation)}
                warn={crit.governing_utilisation > 1} />
              <SumLine label="Axial utilisation" value={utilText(crit.axial_utilisation)}
                warn={crit.axial_utilisation > 1} />
            </div>
          </div>
        </div>

        {/* named failures — never a bare FAIL */}
        {failed.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
            <div className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-300">
              <FiAlertTriangle /> Failed checks
            </div>
            <ul className="ml-5 list-disc space-y-1 text-sm text-red-700 dark:text-red-300">
              {failed.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        <div className="flex gap-1 border-b border-[#e2e8f0] dark:border-[#334155]">
          {[["overview", "Overview"], ["interaction", "Interaction"],
            ["levels", "Per level"], ["checks", "Checks"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === k ? "border-[#0A2F44] text-[#0A2F44] dark:border-[#66a4c2] dark:text-[#66a4c2]"
                          : `border-transparent ${SUB}`}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab r={r} crit={crit} />}
        {tab === "interaction" && <InteractionTab r={r} crit={crit} isBiaxial={isBiaxial} />}
        {tab === "levels" && <LevelsTab r={r} isBiaxial={isBiaxial} />}
        {tab === "checks" && <ChecksTab r={r} crit={crit} />}

        <p className={`pt-2 text-center text-xs ${SUB}`}>
          Section capacity by strain compatibility (EC2 Cl. 3.1.7 stress block, Cl. 3.2.7 bilinear steel).
          Second-order effects by nominal curvature, Cl. 5.8.8. Check against your own calculations before use.
        </p>
      </div>

      {showReport && <ReportModal r={r} onClose={() => setShowReport(false)} />}
    </div>
  );
}

/* ---------------- OVERVIEW ---------------- */
function OverviewTab({ r, crit }) {
  const s = r.summary, m = r.materials, d = r.detailing || {};
  const gap = (crit.NRd_simplified_kN || 0) - (crit.NRd_max_kN || 0);
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Panel title="Column">
        <KV label="Column ID" value={s.column_id} />
        <KV label="Type" value={s.column_type} cap />
        <KV label="Bracing" value={s.braced ? "Braced" : "Unbraced"} />
        <KV label="End condition" value={s.end_condition} />
        <KV label="Storey height" value={`${n2(s.storey_height_m)} m`} />
        <KV label="Section" value={`${n1(s.b_mm)} × ${n1(s.h_mm)} mm`} />
        <KV label="Exposure class" value={s.exposure_class} />
      </Panel>

      <Panel title="Section & Reinforcement">
        <div className="flex items-center gap-4">
          <SectionSVG s={s} d={d} />
          <div className="flex-1 space-y-1.5">
            <KV label="Bars" value={`${s.n_bars} × Ø${n1(s.bar_dia_mm)}`} />
            <KV label="Layout" value={`${d.n_bars_b_face}/b-face, ${d.n_bars_h_face}/h-face`} />
            <KV label="As provided" value={`${n1(d.As_provided_mm2)} mm²`} />
            <KV label="ρ" value={`${n2(d.rho_pct)}%`} />
            <KV label="Cover" value={`${n1(s.cover_mm)} mm`} />
            <KV label="d′" value={`${n1(d.d_prime_mm)} mm`} />
            <KV label="Links" value={`Ø${n1(s.link_dia_mm)}`} />
          </div>
        </div>
      </Panel>

      <Panel title="Materials">
        <KV label="Concrete / fck" value={`${s.concrete_grade} — ${n1(m.fck)} MPa`} />
        <KV label="fcd" value={`${n3(m.fcd)} MPa`} />
        <KV label="Steel / fyk" value={`${s.steel_grade} — ${n1(m.fyk)} MPa`} />
        <KV label="fyd" value={`${n3(m.fyd)} MPa`} />
        <KV label="Stress block λ / η" value={`${n3(m.lambda_block)} / ${n3(m.eta_block)}`} />
        <KV label="εcu3 / εc3" value={`${m.eps_cu3} / ${m.eps_c3}`} />
      </Panel>

      <Panel title="Axial Capacity">
        <KV label="N_Ed (critical)" value={`${n2(crit.NEd_kN)} kN`} strong />
        <KV label="N_Rd,max — strain compatibility" value={`${n2(crit.NRd_max_kN)} kN`} strong />
        <KV label="N_Rd — textbook form Ac·fcd + As·fyd" value={`${n2(crit.NRd_simplified_kN)} kN`} />
        <KV label="Difference" value={`${n2(gap)} kN`} />
        <KV label="Utilisation" value={utilText(crit.axial_utilisation)} warn={crit.axial_utilisation > 1} />
        <Note>
          The governing value deducts the concrete displaced by the bars and caps the steel stress at
          Es·εc3, which is below fyd for B500. The textbook form does neither, so it reads higher.
        </Note>
      </Panel>
    </div>
  );
}

/* ---------------- INTERACTION ---------------- */
function InteractionTab({ r, crit, isBiaxial }) {
  const bi = crit.biaxial;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Panel title="N–M interaction, x axis (depth h)">
          <NMChart points={r.interaction_x} NEd={crit.NEd_kN}
            MEd={crit.x?.MEd} MRd={crit.x?.MRd} />
          <div className="mt-2 space-y-1.5">
            <KV label="M_Ed,x" value={`${n2(crit.x?.MEd)} kNm`} />
            <KV label="M_Rd,x at this N_Ed" value={`${n2(crit.x?.MRd)} kNm`} strong />
            <KV label="Utilisation" value={utilText(crit.x?.utilisation)} warn={crit.x?.utilisation > 1} />
          </div>
        </Panel>

        <Panel title="N–M interaction, y axis (depth b)">
          <NMChart points={r.interaction_y} NEd={crit.NEd_kN}
            MEd={crit.y?.MEd} MRd={crit.y?.MRd} />
          <div className="mt-2 space-y-1.5">
            <KV label="M_Ed,y" value={`${n2(crit.y?.MEd)} kNm`} />
            <KV label="M_Rd,y at this N_Ed" value={`${n2(crit.y?.MRd)} kNm`} strong />
            <KV label="Utilisation" value={utilText(crit.y?.utilisation)} warn={crit.y?.utilisation > 1} />
          </div>
        </Panel>
      </div>

      {isBiaxial && bi && (
        <Panel title="Biaxial Interaction (EC2 Cl. 5.8.9)">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <KV label="N_Ed / N_Rd" value={n3(bi.N_ratio)} />
              <KV label="Exponent a" value={n3(bi.a)} />
              <KV label="(M_Edx/M_Rdx)^a" value={n3(Math.pow(safeRatio(crit.x), bi.a))} />
              <KV label="(M_Edy/M_Rdy)^a" value={n3(Math.pow(safeRatio(crit.y), bi.a))} />
              <KV label="Sum" value={utilText(bi.interaction)} strong warn={bi.interaction > 1} />
            </div>
            <div>
              <UtilBar label="Biaxial interaction" value={bi.interaction} />
              <Note>
                a is interpolated on N_Ed/N_Rd: 1.0 at 0.1, 1.5 at 0.7, 2.0 at 1.0, with
                N_Rd = Ac·fcd + As·fyd as Cl. 5.8.9 defines it for this clause.
              </Note>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Reading M_Rd against a design chart">
        <Note>
          M_Rd here is solved from the section, so it changes with N_Ed rather than being one fixed
          number. Published design charts are plotted for symmetrical steel on two opposite faces at a
          fixed d₂/h and fyk = 500. Where the real cage puts bars on all four faces, or d₂/h differs,
          a chart reading will not match this curve and is usually the conservative side. Treat a
          difference as something to reconcile, not as slack to design into.
        </Note>
      </Panel>
    </div>
  );
}

function safeRatio(ax) {
  if (!ax || !(ax.MRd > 1e-9)) return 0;
  return ax.MEd / ax.MRd;
}

function NMChart({ points, NEd, MEd, MRd }) {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const line = dark ? ACCENT_D : ACCENT;
  const grid = dark ? "#334155" : "#e2e8f0";
  const tick = dark ? "#94a3b8" : "#64748b";
  const data = useMemo(
    () => (points || []).map((p) => ({ x: p.M_kNm, y: p.N_kN })),
    [points]
  );
  if (!data.length) {
    return <div className="flex h-[240px] items-center justify-center text-xs text-[#94a3b8]">No curve data</div>;
  }
  const design = MEd !== undefined && NEd !== undefined ? [{ x: MEd, y: NEd }] : [];
  const capacity = MRd !== undefined && NEd !== undefined ? [{ x: MRd, y: NEd }] : [];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 10, right: 15, bottom: 22, left: 5 }}>
        <CartesianGrid stroke={grid} strokeOpacity={0.5} />
        <XAxis type="number" dataKey="x" name="M" tick={{ fontSize: 11, fill: tick }} stroke={grid}
          label={{ value: "M (kNm)", position: "insideBottom", offset: -10, fontSize: 11, fill: tick }} />
        <YAxis type="number" dataKey="y" name="N" tick={{ fontSize: 11, fill: tick }} stroke={grid}
          label={{ value: "N (kN)", angle: -90, position: "insideLeft", fontSize: 11, fill: tick }} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }}
          formatter={(v, n) => [Number(v).toFixed(2), n === "x" ? "M (kNm)" : "N (kN)"]}
          contentStyle={{ fontSize: 12, background: dark ? "#1f2937" : "#fff", border: `1px solid ${grid}`, color: dark ? "#fff" : "#0F172A" }} />
        {NEd !== undefined && <ReferenceLine y={NEd} stroke="#94a3b8" strokeDasharray="4 3" />}
        <Scatter name="Capacity envelope" data={data} line={{ stroke: line, strokeWidth: 2 }} fill={line} shape={() => null} />
        <Scatter name="M_Rd" data={capacity} fill="#1baf7a" shape="circle" />
        <Scatter name="Design point" data={design} fill="#e34948" shape="cross" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* ---------------- PER LEVEL ---------------- */
function LevelsTab({ r, isBiaxial }) {
  const levels = r.levels || [];
  const slenderAny = levels.some((l) => l.x?.slender || l.y?.slender);
  return (
    <div className="space-y-5">
      <Panel title="Axial Load Take-down">
        <Table head={["Level", "N_Ed (kN)", "N_Rd,max (kN)", "Axial util.", "Governing util.", "Status"]}
          rows={levels.map((l) => [
            l.level.replace(/_/g, " "), n2(l.NEd_kN), n2(l.NRd_max_kN),
            n3(l.axial_utilisation), utilText(l.governing_utilisation),
            <Badge key="b" ok={l.status === "PASS"}>{l.status}</Badge>,
          ])} />
      </Panel>

      {["x", "y"].map((ax) => (
        <Panel key={ax} title={`Slenderness & Design Moments — ${ax} axis (depth ${ax === "x" ? "h" : "b"})`}>
          <Table
            head={["Level", "l₀ (mm)", "λ", "λlim", "Class", "eᵢ (mm)", "M_end", "M_eq", "M₂", "M_Ed", "M_Rd", "Util."]}
            rows={levels.map((l) => {
              const a = l[ax] || {};
              return [
                l.level.replace(/_/g, " "), n1(a.l0_mm), n2(a.lambda), n2(a.lambda_lim),
                <span key="c" className={a.slender ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>
                  {a.slender ? "slender" : "short"}
                </span>,
                n2(a.ei_mm), n2(a.M_end), n2(a.M_eq), n2(a.M2), n2(a.MEd), n2(a.MRd),
                <span key="u" className={a.utilisation > 1 ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                  {utilText(a.utilisation)}
                </span>,
              ];
            })} />
          <p className={`mt-2 text-xs ${SUB}`}>
            l₀ source: {levels[0]?.[ax]?.l0_source || "—"}. M_end is the larger end moment plus the
            imperfection moment; M_eq is the equivalent moment M0e plus the same. M_Ed is the worst of
            M_end, M_eq + M₂ and the minimum-eccentricity moment.
          </p>
        </Panel>
      ))}

      {slenderAny && (
        <Panel title="Second-Order Effects (Nominal Curvature, Cl. 5.8.8)">
          <Table head={["Level", "Axis", "ω", "n", "Kr", "Kφ", "1/r (1/mm)", "e₂ (mm)", "M₂ (kNm)"]}
            rows={levels.flatMap((l) =>
              ["x", "y"].filter((ax) => l[ax]?.slender).map((ax) => {
                const so = l[ax].second_order || {};
                return [
                  l.level.replace(/_/g, " "), ax, n3(so.omega), n3(so.n), n3(so.Kr),
                  n3(so.Kphi), so.inv_r ? Number(so.inv_r).toExponential(3) : "—",
                  n2(so.e2_mm), n2(so.M2_kNm),
                ];
              })
            )} />
        </Panel>
      )}
      {!slenderAny && (
        <Panel title="Second-Order Effects">
          <Note>Every level is short about both axes, so second-order effects may be ignored and M₂ = 0 throughout.</Note>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- CHECKS ---------------- */
function ChecksTab({ r, crit }) {
  const d = r.detailing || {};
  const asOk = d.As_provided_mm2 >= d.As_min_mm2 && d.As_provided_mm2 <= d.As_max_mm2;
  const tieOk = d.link_dia_mm >= d.phi_t_min_mm;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Panel title="Longitudinal Reinforcement (Cl. 9.5.2)">
          <KV label="Basis 1 — 0.10·N_Ed/fyd" value={`${n1(d.As_min_basis_1_mm2)} mm²`} />
          <KV label="Basis 2 — 0.002·Ac" value={`${n1(d.As_min_basis_2_mm2)} mm²`} />
          <KV label="As,min = max of the two" value={`${n1(d.As_min_mm2)} mm²`} strong />
          <KV label="As,max = 0.04·Ac" value={`${n1(d.As_max_mm2)} mm²`} />
          <KV label="As provided" value={`${n1(d.As_provided_mm2)} mm²`} strong />
          <CheckLine label="As,min ≤ As ≤ As,max" ok={asOk} />
        </Panel>

        <Panel title="Transverse Reinforcement (Cl. 9.5.3)">
          <KV label="φt,min = max(6, φ/4)" value={`${n1(d.phi_t_min_mm)} mm`} />
          <KV label="Provided" value={`Ø${n1(d.link_dia_mm)}`} />
          <CheckLine label="φt ≥ φt,min" ok={tieOk} />
          <KV label="s_cl,tmax = min(20φ, min(b,h), 400)" value={`${n1(d.s_max_mm)} mm`} strong />
          <KV label="Reduced zones (0.6 × s_max)" value={`${n1(d.s_reduced_mm)} mm`} />
          <Note>
            Use the reduced spacing within a distance equal to the larger column dimension above and
            below a beam or slab, and through lap lengths.
          </Note>
        </Panel>
      </div>

      <Panel title="All Checks by Level">
        <Table head={["Level", "Check", "Result"]}
          rows={(r.levels || []).flatMap((l) =>
            (l.checks || []).map((c) => [
              l.level.replace(/_/g, " "), c.name,
              <Badge key="b" ok={c.pass}>{c.pass ? "PASS" : "FAIL"}</Badge>,
            ])
          )} />
      </Panel>

      <Panel title="Capacity Utilisation (Critical Level)">
        <UtilBar label="Axial" value={crit.axial_utilisation} detail={`${n2(crit.NEd_kN)} / ${n2(crit.NRd_max_kN)} kN`} />
        <UtilBar label="Moment about x" value={crit.x?.utilisation} detail={`${n2(crit.x?.MEd)} / ${n2(crit.x?.MRd)} kNm`} />
        <UtilBar label="Moment about y" value={crit.y?.utilisation} detail={`${n2(crit.y?.MEd)} / ${n2(crit.y?.MRd)} kNm`} />
        {crit.biaxial && <UtilBar label="Biaxial interaction" value={crit.biaxial.interaction} detail={`exponent a = ${n3(crit.biaxial.a)}`} />}
      </Panel>
    </div>
  );
}

/* ---------------- REPORT ---------------- */
function ReportModal({ r, onClose }) {
  const s = r.summary;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4" onClick={onClose}>
      <div className={`${CARD} my-4 max-h-[88vh] w-full max-w-5xl overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e2e8f0] bg-white px-5 py-3 dark:border-[#334155] dark:bg-[#1f2937]">
          <div>
            <h3 className={TITLE}>Detailed Calculation Report</h3>
            <p className={`text-xs ${SUB}`}>{s.column_id} · {s.design_code} · {s.column_type}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-[#e6f0f5] px-3 py-1.5 text-sm text-[#0A2F44] hover:bg-[#d4e6ef] dark:bg-[#1e3a4a] dark:text-[#66a4c2]">
              <FiDownload size={14} /> Print / PDF
            </button>
            <button onClick={onClose} className={SUB}><FiX size={18} /></button>
          </div>
        </div>
        <div className="space-y-6 p-5">
          <div className="grid grid-cols-[170px_1fr_180px] gap-4 border-b border-[#e2e8f0] pb-2 text-sm font-semibold dark:border-[#334155]">
            <div className={MAIN}>Reference</div><div className={MAIN}>Calculation</div>
            <div className={`text-right ${MAIN}`}>Output</div>
          </div>
          {(r.report || []).map((sec, i) => (
            <div key={i}>
              <h4 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">
                {sec.title}
              </h4>
              {(sec.rows || []).map((row, j) => (
                <div key={j} className="grid grid-cols-[170px_1fr_180px] gap-4 border-b border-[#f1f5f9] py-2 text-[13px] dark:border-[#2a3646]">
                  <div className={`font-mono text-[11px] ${SUB}`}>{row.reference}</div>
                  <div className={`whitespace-pre-line font-mono text-[12px] ${MAIN}`}>{row.calculation}</div>
                  <div className="whitespace-pre-line text-right font-mono font-semibold text-[#0A2F44] dark:text-[#66a4c2]">{row.output}</div>
                </div>
              ))}
            </div>
          ))}
          <p className={`text-[11px] ${SUB}`}>
            Trace generated by the design engine. Verify clause references and coefficients against your
            own copy of EN 1992-1-1 before relying on this for construction.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SHARED ---------------- */
function Panel({ title, children }) {
  return (
    <div className={CARD}>
      <div className="border-b border-[#e2e8f0] px-5 py-3 dark:border-[#334155]"><h3 className={TITLE}>{title}</h3></div>
      <div className="p-5">{children}</div>
    </div>
  );
}
function KV({ label, value, strong, warn, cap }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] py-1.5 last:border-0 dark:border-[#2a3646]">
      <span className={`text-xs ${SUB}`}>{label}</span>
      <span className={`text-xs ${cap ? "capitalize" : ""} ${strong ? "font-bold" : "font-medium"} ${warn ? "text-red-600 dark:text-red-400" : MAIN}`}>{value}</span>
    </div>
  );
}
function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f8fafc] px-3 py-2 dark:bg-[#111827]">
      <div className="text-[10px] uppercase tracking-wide text-[#94a3b8]">{label}</div>
      <div className={`text-sm font-semibold ${MAIN}`}>{value}</div>
    </div>
  );
}
function SumLine({ label, value, warn }) {
  return (
    <div className="flex items-center justify-between gap-3">
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
          <tr className={`border-b border-[#e2e8f0] text-left dark:border-[#334155] ${SUB}`}>
            {head.map((h, i) => <th key={i} className="whitespace-nowrap py-2 pr-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className={MAIN}>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#f1f5f9] dark:border-[#2a3646]">
              {row.map((c, j) => <td key={j} className="whitespace-nowrap py-2 pr-3 font-mono text-xs">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Badge({ ok, children }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ok
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{children}</span>;
}
function CheckLine({ label, ok }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {ok ? <FiCheckCircle className="flex-shrink-0 text-green-600 dark:text-green-400" size={15} />
          : <FiXCircle className="flex-shrink-0 text-red-600 dark:text-red-400" size={15} />}
      <span className={`text-xs ${MAIN}`}>{label}</span>
    </div>
  );
}
function UtilBar({ label, value, detail }) {
  const v = Number.isFinite(value) ? value : 0;
  const ok = v <= 1;
  const capped = v >= UTIL_CAP;
  return (
    <div className="border-b border-[#f1f5f9] py-2 last:border-0 dark:border-[#2a3646]">
      <div className="flex items-center justify-between">
        <span className={`text-xs ${SUB}`}>{label}</span>
        <span className={`font-mono text-xs ${MAIN}`}>{detail}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e2e8f0] dark:bg-[#334155]">
          <div className={`h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(v * 100, 100)}%` }} />
        </div>
        <span className={`text-[11px] font-semibold ${ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {capped ? "no capacity" : `${(v * 100).toFixed(0)}%`}
        </span>
      </div>
    </div>
  );
}
function Note({ children }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border-l-4 border-[#0A2F44] bg-[#e6f0f5] p-3 dark:bg-[#1e3a4a]">
      <FiInfo className="mt-0.5 flex-shrink-0 text-[#0A2F44] dark:text-[#66a4c2]" size={14} />
      <p className="text-xs text-[#0A2F44] dark:text-[#cce1eb]">{children}</p>
    </div>
  );
}

/* bar layout uses the engine's own face counts */
function SectionSVG({ s, d }) {
  const VB = 140, pad = 14, draw = VB - 2 * pad;
  const b = s.b_mm, h = s.h_mm;
  if (!(b > 0) || !(h > 0)) return null;
  const scale = draw / Math.max(b, h);
  const w = b * scale, ht = h * scale;
  const x0 = (VB - w) / 2, y0 = (VB - ht) / 2;
  const inset = (d.d_prime_mm || 40) * scale;
  const nB = d.n_bars_b_face || 2, nH = d.n_bars_h_face || 2;
  const xL = x0 + inset, xR = x0 + w - inset, yT = y0 + inset, yB = y0 + ht - inset;
  const lerp = (a, z, t) => a + (z - a) * t;
  const bars = [];
  for (let i = 0; i < nB; i++) {
    const t = nB === 1 ? 0.5 : i / (nB - 1);
    bars.push([lerp(xL, xR, t), yT]); bars.push([lerp(xL, xR, t), yB]);
  }
  for (let i = 1; i < nH - 1; i++) {
    const t = i / (nH - 1);
    bars.push([xL, lerp(yT, yB, t)]); bars.push([xR, lerp(yT, yB, t)]);
  }
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="w-[140px] flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
      <rect x={x0} y={y0} width={w} height={ht} className="fill-[#eef2f6] dark:fill-[#0f172a]" stroke={ACCENT} strokeWidth="1.5" />
      <rect x={xL - 3} y={yT - 3} width={xR - xL + 6} height={yB - yT + 6} fill="none" stroke={ACCENT_D} strokeWidth="0.7" strokeDasharray="3 2" />
      {bars.map(([bx, by], i) => <circle key={i} cx={bx} cy={by} r={2.8} fill={ACCENT} />)}
    </svg>
  );
}