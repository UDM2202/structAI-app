// src/pages/FoundationInput.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHome, FiRefreshCw, FiLoader, FiInfo, FiAlertTriangle, FiCheckCircle,
} from "react-icons/fi";
import Dropdown from "../components/Dropdown";
import { foundationAPI } from "../services/api";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155]";
const INPUT = "w-full px-3 py-2 rounded-lg border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] font-mono text-sm";
const LABEL = "block text-xs font-medium text-[#475569] dark:text-[#94a3b8] mb-1";
const SECTION = "text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const MAIN = "text-[#0F172A] dark:text-white";

// foundation types (only Pad is wired; others are visual tabs for now)
const FOUNDATION_TYPES = [
  { id: "pad", label: "Pad Footing", enabled: true },
  { id: "combined", label: "Combined Footing", enabled: true },
  { id: "strip", label: "Strip Footing", enabled: false },
  { id: "raft", label: "Raft Foundation", enabled: false },
  { id: "pile", label: "Pile Foundation", enabled: false },
  { id: "grillage", label: "Grillage Foundation", enabled: false },
];
const COL_SHAPES = ["Rectangular", "Circular"];
const FOOTING_SHAPES = ["Square", "Rectangular"];
const SOIL_TYPES = ["Medium Dense Sand", "Dense Sand", "Loose Sand", "Stiff Clay", "Firm Clay", "Soft Clay", "Rock"];
const CONCRETE = ["C20/25", "C25/30", "C30/37", "C35/45", "C40/50"];
const STEEL = ["B500", "B500B", "B460"];
const BAR_DIAS = [10, 12, 16, 20, 25];
const FIXITY = ["Fixed", "Pinned"];

const DEFAULTS = {
  foundation_type: "pad",
  project: "Residential Building", location: "Bangalore, India",
  // column / support (some display-only)
  column_shape: "Rectangular", column_x_mm: "400", column_y_mm: "400",
  column_location: "Interior", eccentricity: "0", fixity: "Fixed",
  // footing geometry
  footing_shape: "Square", footing_length_mm: "2000", footing_width_mm: "2000",
  footing_depth_mm: "500", pedestal_height_mm: "0", pedestal_size_mm: "0",
  depth_below_ground_mm: "1200",
  // soil & ground (display-only except allowable bearing)
  soil_type: "Medium Dense Sand", allowable_bearing_kN_m2: "200",
  unit_weight_soil: "18.0", ground_level_m: "0.00", water_table_m: "5.00",
  // materials
  concrete_grade_fck: "C25/30", steel_grade_fyk: "B500",
  cover_mm: "50", bar_dia_mm: "16",
  // loads — service + ultimate (engine uses ultimate)
  service_vertical_kN: "500", service_mx: "10", service_my: "5",
  ultimate_vertical_kN: "750", ultimate_mx: "15", ultimate_my: "7.5",
  // design & checks (display-only)
  design_approach: "DA1 - Combination 1", analysis_method: "Rigid (Base Pressure)",
  eccentricity_check: true, punching_check: true,
  min_reinf_ratio: "0.0013", max_reinf_ratio: "0.04",
  notes: "",
};

const gradeNum = (g) => parseFloat(String(g).replace(/[^0-9]/g, "").slice(0, 2)) || 25;

export default function FoundationInput() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const reset = () => { setForm(DEFAULTS); setError(null); };

  const num = (v) => parseFloat(v);
  const run = async () => {
    if (!(num(form.ultimate_vertical_kN) > 0)) { setError("Enter a valid ultimate vertical load."); return; }
    if (!(num(form.footing_length_mm) > 0) || !(num(form.footing_width_mm) > 0)) { setError("Enter valid footing dimensions."); return; }
    setBusy(true); setError(null);
    try {
      const result = await foundationAPI.designPad({
        axial_load_kN: num(form.ultimate_vertical_kN),
        moment_x_kNm: num(form.ultimate_mx) || 0,
        moment_y_kNm: num(form.ultimate_my) || 0,
        footing_length_mm: num(form.footing_length_mm),
        footing_width_mm: num(form.footing_width_mm),
        footing_depth_mm: num(form.footing_depth_mm),
        column_x_mm: num(form.column_x_mm),
        column_y_mm: num(form.column_y_mm),
        concrete_grade_fck: gradeNum(form.concrete_grade_fck),
        steel_grade_fyk: gradeNum(form.steel_grade_fyk) < 100 ? 500 : gradeNum(form.steel_grade_fyk),
        allowable_bearing_kN_m2: num(form.allowable_bearing_kN_m2),
        cover_mm: num(form.cover_mm),
        bar_dia_mm: num(form.bar_dia_mm),
        // pass-through display context (not used by engine calc)
        _meta: { project: form.project, location: form.location, soil_type: form.soil_type,
                 footing_shape: form.footing_shape, column_shape: form.column_shape },
      });
      setBusy(false);
      navigate("/foundation-results", { state: { designResult: result, meta: {
        project: form.project, location: form.location, soil_type: form.soil_type,
        concrete_grade: form.concrete_grade_fck, steel_grade: form.steel_grade_fyk,
      } } });
    } catch (e) {
      setBusy(false);
      setError(e.message === "Failed to fetch"
        ? "Cannot reach the design engine. The backend may be waking up — try again in a minute."
        : e.message);
    }
  };

  const steelK = gradeNum(form.steel_grade_fyk) < 100 ? 500 : gradeNum(form.steel_grade_fyk);

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827]">
      <header className="flex items-center gap-2.5 border-b border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] px-4 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0A2F44] text-white"><FiHome size={15} /></div>
        <div>
          <div className={`text-sm font-bold ${MAIN}`}>Foundation Input (EC2)</div>
          <div className={`text-[11px] ${SUB}`}>EN 1992-1-1 + EN 1997-1 · kN, m</div>
        </div>
      </header>

      {/* foundation type selector */}
      <div className="border-b border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] px-4 py-3">
        <div className="mb-2 text-xs text-[#94a3b8] uppercase tracking-wide">Select Foundation Type</div>
        <div className="flex flex-wrap gap-2">
          {FOUNDATION_TYPES.map((t) => (
            <button key={t.id} onClick={() => {
                if (!t.enabled) return;
                if (t.id === "combined") { navigate("/combined-input"); return; }
                set({ foundation_type: t.id });
              }} disabled={!t.enabled}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                form.foundation_type === t.id ? "border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a] text-[#0A2F44] dark:text-[#66a4c2]"
                : t.enabled ? "border-[#e2e8f0] dark:border-[#334155] text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#334155]"
                : "border-[#e2e8f0] dark:border-[#334155] text-[#cbd5e1] dark:text-[#475569] cursor-not-allowed"}`}>
              {t.label}{!t.enabled && <span className="ml-1 text-[10px]">(soon)</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <FiAlertTriangle className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-5">
            {/* 1. Column / Support */}
            <Card n={1} title="Column / Support Details">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className={LABEL}>Column Shape</label><Dropdown value={form.column_shape} onChange={(v) => set({ column_shape: v })} options={COL_SHAPES} /></div>
                <Num label="Column bx" unit="mm" value={form.column_x_mm} onChange={(v) => set({ column_x_mm: v })} live />
                <Num label="Column by" unit="mm" value={form.column_y_mm} onChange={(v) => set({ column_y_mm: v })} live />
                <div><label className={LABEL}>Location</label><Dropdown value={form.column_location} onChange={(v) => set({ column_location: v })} options={["Interior", "Edge", "Corner"]} /></div>
                <Num label="Eccentricity" unit="mm" value={form.eccentricity} onChange={(v) => set({ eccentricity: v })} />
                <div><label className={LABEL}>Fixity</label><Dropdown value={form.fixity} onChange={(v) => set({ fixity: v })} options={FIXITY} /></div>
              </div>
            </Card>

            {/* 2. Footing Geometry */}
            <Card n={2} title="Footing Geometry">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className={LABEL}>Footing Shape</label><Dropdown value={form.footing_shape} onChange={(v) => set({ footing_shape: v })} options={FOOTING_SHAPES} /></div>
                <Num label="Length (B × L)" unit="mm" value={form.footing_length_mm} onChange={(v) => set({ footing_length_mm: v })} live />
                <Num label="Width" unit="mm" value={form.footing_width_mm} onChange={(v) => set({ footing_width_mm: v })} live />
                <Num label="Thickness (h)" unit="mm" value={form.footing_depth_mm} onChange={(v) => set({ footing_depth_mm: v })} live />
                <Num label="Pedestal Height" unit="mm" value={form.pedestal_height_mm} onChange={(v) => set({ pedestal_height_mm: v })} />
                <Num label="Depth Below Ground" unit="mm" value={form.depth_below_ground_mm} onChange={(v) => set({ depth_below_ground_mm: v })} />
              </div>
            </Card>

            {/* 3. Soil & Ground */}
            <Card n={3} title="Soil & Ground Conditions">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className={LABEL}>Soil Type</label><Dropdown value={form.soil_type} onChange={(v) => set({ soil_type: v })} options={SOIL_TYPES} /></div>
                <Num label="Net Allowable Bearing" unit="kN/m²" value={form.allowable_bearing_kN_m2} onChange={(v) => set({ allowable_bearing_kN_m2: v })} live />
                <Num label="Unit Weight of Soil" unit="kN/m³" value={form.unit_weight_soil} onChange={(v) => set({ unit_weight_soil: v })} />
                <Num label="Ground Level" unit="m" value={form.ground_level_m} onChange={(v) => set({ ground_level_m: v })} />
                <Num label="Water Table Depth" unit="m" value={form.water_table_m} onChange={(v) => set({ water_table_m: v })} />
              </div>
            </Card>

            {/* 4. Materials */}
            <Card n={4} title="Material Properties">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className={LABEL}>Concrete Grade</label><Dropdown value={form.concrete_grade_fck} onChange={(v) => set({ concrete_grade_fck: v })} options={CONCRETE} /></div>
                <div><label className={LABEL}>Steel Grade</label><Dropdown value={form.steel_grade_fyk} onChange={(v) => set({ steel_grade_fyk: v })} options={STEEL} /></div>
                <Num label="Cover" unit="mm" value={form.cover_mm} onChange={(v) => set({ cover_mm: v })} live />
                <div><label className={LABEL}>Bar Dia (mm)</label><Dropdown value={form.bar_dia_mm} onChange={(v) => set({ bar_dia_mm: v })} options={BAR_DIAS} /></div>
              </div>
            </Card>

            {/* 5. Loads */}
            <Card n={5} title="Load Input (Service & Ultimate)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-left ${SUB} border-b border-[#e2e8f0] dark:border-[#334155]`}>
                      <th className="py-2 pr-3 font-medium">Load Type</th>
                      <th className="py-2 pr-3 font-medium">Vertical (kN)</th>
                      <th className="py-2 pr-3 font-medium">Mx (kNm)</th>
                      <th className="py-2 pr-3 font-medium">My (kNm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#f1f5f9] dark:border-[#2a3646]">
                      <td className={`py-2 pr-3 ${MAIN}`}>Service (SLS)</td>
                      <td className="py-2 pr-3"><input type="number" className={INPUT} value={form.service_vertical_kN} onChange={(e) => set({ service_vertical_kN: e.target.value })} /></td>
                      <td className="py-2 pr-3"><input type="number" className={INPUT} value={form.service_mx} onChange={(e) => set({ service_mx: e.target.value })} /></td>
                      <td className="py-2 pr-3"><input type="number" className={INPUT} value={form.service_my} onChange={(e) => set({ service_my: e.target.value })} /></td>
                    </tr>
                    <tr>
                      <td className={`py-2 pr-3 font-semibold ${MAIN}`}>Ultimate (ULS) <span className="text-[10px] text-green-600 dark:text-green-400">← drives design</span></td>
                      <td className="py-2 pr-3"><input type="number" className={INPUT} value={form.ultimate_vertical_kN} onChange={(e) => set({ ultimate_vertical_kN: e.target.value })} /></td>
                      <td className="py-2 pr-3"><input type="number" className={INPUT} value={form.ultimate_mx} onChange={(e) => set({ ultimate_mx: e.target.value })} /></td>
                      <td className="py-2 pr-3"><input type="number" className={INPUT} value={form.ultimate_my} onChange={(e) => set({ ultimate_my: e.target.value })} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={`mt-2 text-xs ${SUB}`}>The engine designs on the Ultimate (ULS) row per EC2.</p>
            </Card>

            {/* 6. Design & Checks */}
            <Card n={6} title="Design & Check Settings">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LABEL}>Design Approach</label><Dropdown value={form.design_approach} onChange={(v) => set({ design_approach: v })} options={["DA1 - Combination 1", "DA1 - Combination 2", "DA2", "DA3"]} /></div>
                <div><label className={LABEL}>Analysis Method</label><Dropdown value={form.analysis_method} onChange={(v) => set({ analysis_method: v })} options={["Rigid (Base Pressure)", "Flexible (Winkler)"]} /></div>
                <Num label="Min Reinf. Ratio" value={form.min_reinf_ratio} onChange={(v) => set({ min_reinf_ratio: v })} />
                <Num label="Max Reinf. Ratio" value={form.max_reinf_ratio} onChange={(v) => set({ max_reinf_ratio: v })} />
              </div>
              <div className="mt-3 flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.eccentricity_check} onChange={(e) => set({ eccentricity_check: e.target.checked })} className="h-4 w-4 accent-[#0A2F44]" /><span className={MAIN}>Eccentricity check</span></label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.punching_check} onChange={(e) => set({ punching_check: e.target.checked })} className="h-4 w-4 accent-[#0A2F44]" /><span className={MAIN}>Punching check</span></label>
              </div>
            </Card>

            {/* 7. Notes */}
            <Card n={7} title="Notes & Attachments" optional>
              <textarea rows={3} className={INPUT} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Any notes or additional information…" />
            </Card>
          </div>

          {/* right: summary */}
          <div className="space-y-4">
            <div className={`${CARD} overflow-hidden`}>
              <div className="border-b border-[#e2e8f0] dark:border-[#334155] px-5 py-3"><h3 className={SECTION}>Input Summary</h3></div>
              <div className="p-5 space-y-2.5">
                <Sum label="Foundation" value="Pad Footing" />
                <Sum label="Column" value={`${form.column_x_mm}×${form.column_y_mm} mm`} />
                <Sum label="Footing" value={`${form.footing_length_mm}×${form.footing_width_mm}×${form.footing_depth_mm}`} />
                <div className="my-2 border-t border-[#e2e8f0] dark:border-[#334155]" />
                <Sum label="Soil type" value={form.soil_type} />
                <Sum label="Allow. bearing" value={`${form.allowable_bearing_kN_m2} kN/m²`} />
                <div className="my-2 border-t border-[#e2e8f0] dark:border-[#334155]" />
                <Sum label="Concrete / Steel" value={`${form.concrete_grade_fck} · ${form.steel_grade_fyk}`} />
                <Sum label="Cover / Bar" value={`${form.cover_mm} / Ø${form.bar_dia_mm}`} />
                <div className="my-2 border-t border-[#e2e8f0] dark:border-[#334155]" />
                <Sum label="ULS Vertical" value={`${form.ultimate_vertical_kN} kN`} strong />
                <Sum label="ULS Mx / My" value={`${form.ultimate_mx} / ${form.ultimate_my} kNm`} />
              </div>
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 rounded-lg bg-[#f0fdf4] dark:bg-[#052e16] p-3">
                  <FiCheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={15} />
                  <p className="text-xs text-green-700 dark:text-green-300">Engine uses fck={gradeNum(form.concrete_grade_fck)}, fyk={steelK}. Extra fields are recorded, not calculated.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* action bar at bottom, full width like other input pages */}
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