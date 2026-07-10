// src/pages/CombinedFootingInput.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiRefreshCw, FiLoader, FiInfo, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import Dropdown from "../components/Dropdown";
import { foundationAPI } from "../services/api";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155]";
const INPUT = "w-full px-3 py-2 rounded-lg border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] font-mono text-sm";
const LABEL = "block text-xs font-medium text-[#475569] dark:text-[#94a3b8] mb-1";
const SECTION = "text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const MAIN = "text-[#0F172A] dark:text-white";
const ACCENT = "#0A2F44";

const CONCRETE = ["C20/25", "C25/30", "C30/37", "C35/45", "C40/50"];
const STEEL = ["B500", "B500B", "B460"];
const BAR_DIAS = [10, 12, 16, 20, 25];
const SOIL_TYPES = ["Medium Dense Sand", "Dense Sand", "Loose Sand", "Stiff Clay", "Firm Clay", "Soft Clay", "Rock"];
const gradeNum = (g) => parseFloat(String(g).replace(/[^0-9]/g, "").slice(0, 2)) || 25;

// default column sets (2-col reproduces the source example)
const COLS_2 = [
  { label: "C1", P_kN: "72.967", x_m: "0.550", Mx_kNm: "0", My_kNm: "0" },
  { label: "C2", P_kN: "24.987", x_m: "1.370", Mx_kNm: "0", My_kNm: "0" },
];
const COLS_3 = [
  { label: "C1", P_kN: "80", x_m: "0.600", Mx_kNm: "0", My_kNm: "0" },
  { label: "C2", P_kN: "60", x_m: "1.800", Mx_kNm: "0", My_kNm: "0" },
  { label: "C3", P_kN: "70", x_m: "3.000", Mx_kNm: "0", My_kNm: "0" },
];

const DEFAULTS = {
  n_columns: 2,
  columns: COLS_2,
  footing_length_m: "1.870", footing_width_m: "0.550", footing_depth_mm: "400",
  column_x_mm: "300", column_y_mm: "300",
  concrete_grade: "C25/30", steel_grade: "B500", cover_mm: "50", bar_dia_mm: "12",
  soil_type: "Medium Dense Sand", allowable_bearing_kN_m2: "100",
  project: "Residential Building", location: "Bangalore, India",
  notes: "",
};

export default function CombinedFootingInput() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const reset = () => { setForm(DEFAULTS); setError(null); };

  const setColumnCount = (n) => {
    set({ n_columns: n, columns: n === 2 ? COLS_2 : COLS_3 });
  };
  const setCol = (i, key, v) => {
    const cols = form.columns.map((c, idx) => (idx === i ? { ...c, [key]: v } : c));
    set({ columns: cols });
  };

  const num = (v) => parseFloat(v);
  const L = num(form.footing_length_m), B = num(form.footing_width_m);

  const run = async () => {
    if (!(num(form.footing_length_m) > 0) || !(num(form.footing_width_m) > 0)) { setError("Enter valid footing dimensions."); return; }
    for (const c of form.columns) {
      if (!(num(c.P_kN) > 0)) { setError(`Column ${c.label}: enter a valid load.`); return; }
      if (num(c.x_m) < 0 || num(c.x_m) > L) { setError(`Column ${c.label}: position must be between 0 and L (${L} m).`); return; }
    }
    setBusy(true); setError(null);
    try {
      const result = await foundationAPI.designCombined({
        columns: form.columns.map((c) => ({
          P_kN: num(c.P_kN), x_m: num(c.x_m),
          Mx_kNm: num(c.Mx_kNm) || 0, My_kNm: num(c.My_kNm) || 0, label: c.label,
        })),
        footing_length_m: num(form.footing_length_m),
        footing_width_m: num(form.footing_width_m),
        footing_depth_mm: num(form.footing_depth_mm),
        column_x_mm: num(form.column_x_mm),
        column_y_mm: num(form.column_y_mm),
        concrete_grade_fck: gradeNum(form.concrete_grade),
        steel_grade_fyk: gradeNum(form.steel_grade) < 100 ? 500 : gradeNum(form.steel_grade),
        allowable_bearing_kN_m2: num(form.allowable_bearing_kN_m2),
        cover_mm: num(form.cover_mm),
        bar_dia_mm: num(form.bar_dia_mm),
      });
      setBusy(false);
      navigate("/combined-results", { state: { designResult: result, meta: {
        project: form.project, location: form.location, soil_type: form.soil_type,
        concrete_grade: form.concrete_grade, steel_grade: form.steel_grade,
      } } });
    } catch (e) {
      setBusy(false);
      setError(e.message === "Failed to fetch"
        ? "Cannot reach the design engine. The backend may be waking up — try again in a minute."
        : e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827]">
      <header className="flex items-center gap-2.5 border-b border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] px-4 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0A2F44] text-white"><FiHome size={15} /></div>
        <div>
          <div className={`text-sm font-bold ${MAIN}`}>Combined Footing Input (EC2)</div>
          <div className={`text-[11px] ${SUB}`}>EN 1992-1-1 + EN 1997-1 · beam on soil · kN, m</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <FiAlertTriangle className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-5">
            {/* 1. Column count + layout */}
            <Card n={1} title="Column Layout">
              <div className="mb-4 flex items-center gap-3">
                <span className={`text-xs ${SUB}`}>Number of columns:</span>
                {[2, 3].map((nc) => (
                  <button key={nc} onClick={() => setColumnCount(nc)}
                    className={`rounded-lg border px-4 py-1.5 text-sm font-medium ${
                      form.n_columns === nc ? "border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a] text-[#0A2F44] dark:text-[#66a4c2]"
                      : "border-[#e2e8f0] dark:border-[#334155] text-[#64748b] dark:text-[#94a3b8]"}`}>
                    {nc} Columns
                  </button>
                ))}
              </div>
              {form.n_columns === 3 && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <FiInfo className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" size={14} />
                  <p className="text-xs text-amber-800 dark:text-amber-300">3-column mode uses the 2-column method generalised to N columns (same EC2 formulas). Validate against a trusted tool before real design.</p>
                </div>
              )}
              <LayoutSVG columns={form.columns} L={L} B={B} />
            </Card>

            {/* 2. Column loads */}
            <Card n={2} title="Column Loads & Positions">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-left ${SUB} border-b border-[#e2e8f0] dark:border-[#334155]`}>
                      <th className="py-2 pr-3 font-medium">Column</th>
                      <th className="py-2 pr-3 font-medium">P (kN)</th>
                      <th className="py-2 pr-3 font-medium">x from left (m)</th>
                      <th className="py-2 pr-3 font-medium">Mx (kNm)</th>
                      <th className="py-2 pr-3 font-medium">My (kNm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.columns.map((c, i) => (
                      <tr key={i} className="border-b border-[#f1f5f9] dark:border-[#2a3646]">
                        <td className={`py-2 pr-3 font-semibold ${MAIN}`}>{c.label}</td>
                        <td className="py-2 pr-3"><input type="number" className={INPUT} value={c.P_kN} onChange={(e) => setCol(i, "P_kN", e.target.value)} /></td>
                        <td className="py-2 pr-3"><input type="number" className={INPUT} value={c.x_m} onChange={(e) => setCol(i, "x_m", e.target.value)} /></td>
                        <td className="py-2 pr-3"><input type="number" className={INPUT} value={c.Mx_kNm} onChange={(e) => setCol(i, "Mx_kNm", e.target.value)} /></td>
                        <td className="py-2 pr-3"><input type="number" className={INPUT} value={c.My_kNm} onChange={(e) => setCol(i, "My_kNm", e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={`mt-2 text-xs ${SUB}`}>x is measured from the left edge of the footing. All positions must lie within 0…L.</p>
            </Card>

            {/* 3. Footing geometry */}
            <Card n={3} title="Footing Geometry">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Num label="Length L" unit="m" value={form.footing_length_m} onChange={(v) => set({ footing_length_m: v })} live />
                <Num label="Width B" unit="m" value={form.footing_width_m} onChange={(v) => set({ footing_width_m: v })} live />
                <Num label="Thickness h" unit="mm" value={form.footing_depth_mm} onChange={(v) => set({ footing_depth_mm: v })} live />
                <Num label="Column bx" unit="mm" value={form.column_x_mm} onChange={(v) => set({ column_x_mm: v })} live />
                <Num label="Column by" unit="mm" value={form.column_y_mm} onChange={(v) => set({ column_y_mm: v })} live />
              </div>
            </Card>

            {/* 4. Soil & materials */}
            <Card n={4} title="Soil & Materials">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className={LABEL}>Soil Type</label><Dropdown value={form.soil_type} onChange={(v) => set({ soil_type: v })} options={SOIL_TYPES} /></div>
                <Num label="Allowable Bearing" unit="kN/m²" value={form.allowable_bearing_kN_m2} onChange={(v) => set({ allowable_bearing_kN_m2: v })} live />
                <div><label className={LABEL}>Concrete Grade</label><Dropdown value={form.concrete_grade} onChange={(v) => set({ concrete_grade: v })} options={CONCRETE} /></div>
                <div><label className={LABEL}>Steel Grade</label><Dropdown value={form.steel_grade} onChange={(v) => set({ steel_grade: v })} options={STEEL} /></div>
                <Num label="Cover" unit="mm" value={form.cover_mm} onChange={(v) => set({ cover_mm: v })} live />
                <div><label className={LABEL}>Bar Dia (mm)</label><Dropdown value={form.bar_dia_mm} onChange={(v) => set({ bar_dia_mm: v })} options={BAR_DIAS} /></div>
              </div>
            </Card>

            {/* 5. Notes */}
            <Card n={5} title="Notes" optional>
              <textarea rows={3} className={INPUT} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Any notes…" />
            </Card>
          </div>

          {/* summary */}
          <div className="space-y-4">
            <div className={`${CARD} overflow-hidden`}>
              <div className="border-b border-[#e2e8f0] dark:border-[#334155] px-5 py-3"><h3 className={SECTION}>Input Summary</h3></div>
              <div className="p-5 space-y-2.5">
                <Sum label="Foundation" value="Combined Footing" />
                <Sum label="Columns" value={`${form.n_columns} columns`} />
                <Sum label="Total load" value={`${form.columns.reduce((s, c) => s + (parseFloat(c.P_kN) || 0), 0).toFixed(1)} kN`} strong />
                <div className="my-2 border-t border-[#e2e8f0] dark:border-[#334155]" />
                <Sum label="Footing" value={`${form.footing_length_m}×${form.footing_width_m} m`} />
                <Sum label="Thickness" value={`${form.footing_depth_mm} mm`} />
                <div className="my-2 border-t border-[#e2e8f0] dark:border-[#334155]" />
                <Sum label="Allow. bearing" value={`${form.allowable_bearing_kN_m2} kN/m²`} />
                <Sum label="Concrete / Steel" value={`${form.concrete_grade} · ${form.steel_grade}`} />
                <Sum label="Cover / Bar" value={`${form.cover_mm} / Ø${form.bar_dia_mm}`} />
              </div>
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 rounded-lg bg-[#f0fdf4] dark:bg-[#052e16] p-3">
                  <FiCheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={15} />
                  <p className="text-xs text-green-700 dark:text-green-300">{form.n_columns === 2 ? "2-column: validated against source engine." : "3-column: generalised formulas — verify before real design."}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* bottom action bar */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#e2e8f0] dark:border-[#334155] pt-5">
          <button onClick={reset} className={`flex items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-5 py-2.5 text-sm ${SUB} hover:bg-[#f1f5f9] dark:hover:bg-[#334155]`}>
            <FiRefreshCw size={15} /> Reset
          </button>
          <button onClick={run} disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#0A2F44] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#082636] disabled:opacity-50">
            {busy ? <FiLoader className="animate-spin" size={15} /> : null} Save & Proceed to Design
          </button>
        </div>
      </div>
    </div>
  );
}

/* column-location plan diagram */
function LayoutSVG({ columns, L, B }) {
  if (!(L > 0) || !(B > 0)) return <div className="flex h-[100px] items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] dark:border-[#475569] text-xs text-[#94a3b8]">Enter footing L, B</div>;
  const W = 560, H = 110, pad = 30;
  const draw = W - 2 * pad;
  const s = draw / L;
  const fh = Math.min(B * s, H - 2 * pad);
  const x0 = pad, y0 = (H - fh) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect x={x0} y={y0} width={L * s} height={fh} className="fill-[#eef2f6] dark:fill-[#0f172a]" stroke={ACCENT} strokeWidth="1.5" />
      {columns.map((c, i) => {
        const xm = parseFloat(c.x_m);
        if (!(xm >= 0)) return null;
        const cx = x0 + xm * s;
        return (
          <g key={i}>
            <rect x={cx - 6} y={y0 + fh / 2 - 6} width={12} height={12} fill={ACCENT} />
            <line x1={cx} y1={y0} x2={cx} y2={y0 + fh} stroke={ACCENT} strokeWidth="0.5" strokeDasharray="2 2" />
            <text x={cx} y={y0 - 6} textAnchor="middle" fontSize="10" className="fill-[#0A2F44] dark:fill-[#66a4c2]" fontWeight="bold">{c.label}</text>
            <text x={cx} y={y0 + fh + 12} textAnchor="middle" fontSize="8" className="fill-[#64748b] dark:fill-[#94a3b8]">{c.P_kN}kN</text>
            <text x={cx} y={y0 + fh + 22} textAnchor="middle" fontSize="8" className="fill-[#94a3b8]">{c.x_m}m</text>
          </g>
        );
      })}
      <text x={x0 + (L * s) / 2} y={H - 2} textAnchor="middle" fontSize="9" className="fill-[#64748b] dark:fill-[#94a3b8]">L = {L} m</text>
    </svg>
  );
}

function Card({ n, title, optional, children }) {
  return (
    <div className={CARD}>
      <div className="border-b border-[#e2e8f0] dark:border-[#334155] px-5 py-3 flex items-center gap-2">
        <h2 className={SECTION}>{n}. {title}</h2>
        {optional && <span className="text-xs lowercase font-normal text-[#94a3b8]">(optional)</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
function Num({ label, unit, value, onChange, live }) {
  return (
    <div>
      <label className={LABEL}>{label} {unit ? <span className="text-[#94a3b8]">({unit})</span> : null}
        {live && <span className="ml-1 text-[9px] text-green-600 dark:text-green-400">●</span>}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />
    </div>
  );
}
function Sum({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs ${SUB}`}>{label}</span>
      <span className={`text-xs text-right ${strong ? "font-bold text-[#0A2F44] dark:text-[#66a4c2]" : `font-medium ${MAIN}`}`}>{value}</span>
    </div>
  );
}