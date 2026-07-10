// src/pages/ColumnInput.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHome, FiRefreshCw, FiLoader, FiInfo, FiAlertTriangle, FiCheck,
  FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import Dropdown from "../components/Dropdown";
import { columnAPI } from "../services/api";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155]";
const INPUT = "w-full px-3 py-2 rounded-lg border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] font-mono text-sm disabled:opacity-50";
const LABEL = "block text-xs font-medium text-[#475569] dark:text-[#94a3b8] mb-1";
const SECTION = "text-[13px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const MAIN = "text-[#0F172A] dark:text-white";
const ACCENT = "#0A2F44", ACCENT_D = "#66a4c2";

const COLUMN_TYPES = [
  { value: "axial", label: "Axially Loaded" },
  { value: "uniaxial", label: "Uniaxially Loaded" },
  { value: "biaxial", label: "Biaxially Loaded" },
];
const END_CONDITIONS = [
  { value: "fixed-fixed", label: "Fixed–Fixed (K=0.5)" },
  { value: "fixed-pinned", label: "Fixed–Pinned (K=0.7)" },
  { value: "pinned-pinned", label: "Pinned–Pinned (K=1.0)" },
  { value: "fixed-free", label: "Fixed–Free (K=2.0)" },
];
const BRACING = [{ value: "braced", label: "Braced" }, { value: "unbraced", label: "Unbraced" }];
const EXPOSURE = ["XC1", "XC2", "XC3", "XC4"];
const CONCRETE = ["C20/25", "C25/30", "C30/37", "C35/45", "C40/50", "C45/55", "C50/60"];
const STEEL = ["B500", "B460"];
const BAR_DIAS = [12, 16, 20, 25, 32];
const LINK_DIAS = [8, 10, 12];
const BUILDING_USES = [
  "office", "residential", "retail", "shopping_mall", "hospital_ward",
  "school_classroom", "library_reading", "parking_cars", "roof_no_access", "roof_access",
];

const beamDefault = (span) => ({
  width_m: "0.23", depth_m: "0.45", span_m: String(span),
  wall_present: false, wall_thickness_m: "0.15", wall_opening_ratio: "0",
});
const floorDefault = (use, imposed) => ({
  building_use: use, slab_thickness_m: "0.15",
  finishes_kN_per_m2: "1.0", services_kN_per_m2: "0.5", partitions_kN_per_m2: "1.0",
  imposed_override_kN_per_m2: imposed,
  beam_x: beamDefault(4.5), beam_y: beamDefault(2.5),
});

const DEFAULTS = {
  column_id: "C1", column_type: "biaxial", end_condition: "fixed-fixed",
  bracing: "braced", exposure_class: "XC1", storey_height_m: "3.5",
  concrete_grade: "C25/30", steel_grade: "B500",
  auto_select: false,
  b_mm: "300", h_mm: "500", clear_cover_mm: "40", link_dia_mm: 8,
  main_bar_dia_mm: 20, n_bars_total: "8",
  left_x_m: "4.0", right_x_m: "5.0", top_y_m: "3.5", bottom_y_m: "1.5",
  number_of_typical_floors: "3",
  typical_floor: floorDefault("office", "2.5"),
  roof_floor: floorDefault("roof_no_access", "0.75"),
  moments: {}, // keyed by level -> {M01x,M02x,M01y,M02y}
};

const STEPS = ["Column", "Section", "Floors", "Moments", "Review"];

export default function ColumnInput() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setFloor = (which, patch) => setForm((f) => ({ ...f, [which]: { ...f[which], ...patch } }));
  const setBeam = (which, axis, patch) =>
    setForm((f) => ({ ...f, [which]: { ...f[which], [axis]: { ...f[which][axis], ...patch } } }));

  const isAxial = form.column_type === "axial";
  const isBiaxial = form.column_type === "biaxial";

  const levels = useMemo(() => {
    const n = parseInt(form.number_of_typical_floors) || 0;
    const arr = [];
    for (let i = n; i >= 1; i--) arr.push(`Typical_Floor_${i}`);
    arr.push("Roof");
    return arr;
  }, [form.number_of_typical_floors]);

  // per-step validity (hard block)
  const stepValid = (s) => {
    const num = (v) => parseFloat(v) > 0;
    if (s === 0) return form.column_id.trim() && num(form.storey_height_m);
    if (s === 1) {
      if (form.auto_select) return num(form.left_x_m) && num(form.right_x_m) && num(form.top_y_m) && num(form.bottom_y_m);
      return num(form.b_mm) && num(form.h_mm) && num(form.clear_cover_mm) && parseInt(form.n_bars_total) >= 4 &&
        num(form.left_x_m) && num(form.right_x_m) && num(form.top_y_m) && num(form.bottom_y_m);
    }
    if (s === 2) return parseInt(form.number_of_typical_floors) >= 1;
    if (s === 3) return true; // moments optional
    return true;
  };
  const allValidUpto = (target) => {
    for (let s = 0; s < target; s++) if (!stepValid(s)) return s;
    return -1;
  };
  const goTo = (target) => {
    if (target <= step) { setStep(target); return; }         // backward: free
    const bad = allValidUpto(target);                          // forward: require valid
    if (bad === -1) { setStep(target); setMaxReached((m) => Math.max(m, target)); }
    else { setStep(bad); setError(`Complete “${STEPS[bad]}” first.`); }
  };
  const next = () => goTo(step + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const buildRequest = () => {
    const f = form;
    const beam = (b) => ({
      width_m: parseFloat(b.width_m), depth_m: parseFloat(b.depth_m), span_m: parseFloat(b.span_m),
      wall_present: !!b.wall_present, wall_thickness_m: parseFloat(b.wall_thickness_m) || 0,
      wall_opening_ratio: parseFloat(b.wall_opening_ratio) || 0,
    });
    const floor = (fl) => ({
      building_use: fl.building_use, slab_thickness_m: parseFloat(fl.slab_thickness_m),
      finishes_kN_per_m2: parseFloat(fl.finishes_kN_per_m2), services_kN_per_m2: parseFloat(fl.services_kN_per_m2),
      partitions_kN_per_m2: parseFloat(fl.partitions_kN_per_m2),
      imposed_override_kN_per_m2: fl.imposed_override_kN_per_m2 === "" ? null : parseFloat(fl.imposed_override_kN_per_m2),
      beam_x: beam(fl.beam_x), beam_y: beam(fl.beam_y),
    });
    // moment dicts from table
    const M01 = {}, M02 = {}, M01y = {}, M02y = {};
    if (!isAxial) {
      for (const lvl of levels) {
        const m = f.moments[lvl] || {};
        M01[lvl] = parseFloat(m.M01x) || 0; M02[lvl] = parseFloat(m.M02x) || 0;
        if (isBiaxial) { M01y[lvl] = parseFloat(m.M01y) || 0; M02y[lvl] = parseFloat(m.M02y) || 0; }
      }
    }
    return {
      column_id: f.column_id, column_type: f.column_type, end_condition: f.end_condition,
      braced: f.bracing === "braced", exposure_class: f.exposure_class,
      auto_select: !!f.auto_select,
      b_mm: parseFloat(f.b_mm), h_mm: parseFloat(f.h_mm), clear_cover_mm: parseFloat(f.clear_cover_mm),
      link_dia_mm: parseFloat(f.link_dia_mm), main_bar_dia_mm: parseFloat(f.main_bar_dia_mm),
      n_bars_total: parseInt(f.n_bars_total), storey_height_m: parseFloat(f.storey_height_m),
      left_x_m: parseFloat(f.left_x_m), right_x_m: parseFloat(f.right_x_m),
      top_y_m: parseFloat(f.top_y_m), bottom_y_m: parseFloat(f.bottom_y_m),
      concrete_grade: f.concrete_grade, steel_grade: f.steel_grade,
      number_of_typical_floors: parseInt(f.number_of_typical_floors),
      typical_floor: floor(f.typical_floor), roof_floor: floor(f.roof_floor),
      include_min_eccentricity: true,
      M01_kNm: M01, M02_kNm: M02, M01y_kNm: M01y, M02y_kNm: M02y,
      Mx_override_kNm: {}, My_override_kNm: {},
    };
  };

  const run = async () => {
    const bad = allValidUpto(STEPS.length - 1);
    if (bad !== -1) { setStep(bad); setError(`Complete “${STEPS[bad]}” first.`); return; }
    setBusy(true); setError(null);
    try {
      const result = await columnAPI.startDesign(buildRequest());
      setBusy(false);
      navigate("/column-results", { state: { designResult: result } });
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
          <div className={`text-sm font-bold ${MAIN}`}>Column Input (EC2)</div>
          <div className={`text-[11px] ${SUB}`}>EN 1992-1-1 · load take-down · kN, mm, m</div>
        </div>
      </header>

      {/* stepper */}
      <div className="border-b border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1f2937] px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          {STEPS.map((label, i) => {
            const done = i < step && stepValid(i);
            const active = i === step;
            const reachable = i <= maxReached || i <= step;
            return (
              <React.Fragment key={label}>
                <button onClick={() => goTo(i)} disabled={!reachable && i > step}
                  className={`flex items-center gap-2 ${reachable || i <= step ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    active ? "bg-[#0A2F44] text-white" : done ? "bg-green-500 text-white" : "bg-[#e2e8f0] dark:bg-[#334155] text-[#64748b] dark:text-[#94a3b8]"
                  }`}>{done ? <FiCheck size={14} /> : i + 1}</span>
                  <span className={`hidden sm:block text-xs font-medium ${active ? "text-[#0A2F44] dark:text-[#66a4c2]" : SUB}`}>{label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px mx-2 bg-[#e2e8f0] dark:bg-[#334155]" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <FiAlertTriangle className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {step === 0 && <StepColumn form={form} set={set} />}
        {step === 1 && <StepSection form={form} set={set} />}
        {step === 2 && <StepFloors form={form} set={set} setFloor={setFloor} setBeam={setBeam} />}
        {step === 3 && <StepMoments form={form} set={set} levels={levels} isAxial={isAxial} isBiaxial={isBiaxial} />}
        {step === 4 && <StepReview form={form} levels={levels} isAxial={isAxial} isBiaxial={isBiaxial} />}

        {/* nav */}
        <div className="mt-6 flex items-center justify-between">
          <button onClick={back} disabled={step === 0}
            className={`flex items-center gap-2 rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-4 py-2 text-sm ${SUB} disabled:opacity-40`}>
            <FiChevronLeft size={15} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next}
              className="flex items-center gap-2 rounded-lg bg-[#0A2F44] px-5 py-2 text-sm font-medium text-white hover:bg-[#082636]">
              Next <FiChevronRight size={15} />
            </button>
          ) : (
            <button onClick={run} disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-[#0A2F44] px-5 py-2 text-sm font-medium text-white hover:bg-[#082636] disabled:opacity-50">
              {busy ? <FiLoader className="animate-spin" size={15} /> : null} Run Column Design
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- STEP 1: COLUMN ---------------- */
function StepColumn({ form, set }) {
  return (
    <Card title="Column & Classification">
      <div className="grid grid-cols-2 gap-4">
        <div><label className={LABEL}>Column ID</label><input className={INPUT} value={form.column_id} onChange={(e) => set({ column_id: e.target.value })} /></div>
        <div><label className={LABEL}>Column Type</label><Dropdown value={form.column_type} onChange={(v) => set({ column_type: v })} options={COLUMN_TYPES} /></div>
        <div><label className={LABEL}>End Condition</label><Dropdown value={form.end_condition} onChange={(v) => set({ end_condition: v })} options={END_CONDITIONS} /></div>
        <div><label className={LABEL}>Bracing</label><Dropdown value={form.bracing} onChange={(v) => set({ bracing: v })} options={BRACING} /></div>
        <div><label className={LABEL}>Exposure Class</label><Dropdown value={form.exposure_class} onChange={(v) => set({ exposure_class: v })} options={EXPOSURE} /></div>
        <Num label="Storey Height" unit="m" value={form.storey_height_m} onChange={(v) => set({ storey_height_m: v })} step="0.1" />
        <div><label className={LABEL}>Concrete Grade</label><Dropdown value={form.concrete_grade} onChange={(v) => set({ concrete_grade: v })} options={CONCRETE} /></div>
        <div><label className={LABEL}>Steel Grade</label><Dropdown value={form.steel_grade} onChange={(v) => set({ steel_grade: v })} options={STEEL} /></div>
      </div>
    </Card>
  );
}

/* ---------------- STEP 2: SECTION ---------------- */
function StepSection({ form, set }) {
  const auto = form.auto_select;
  return (
    <div className="space-y-5">
      <Card title="Section & Reinforcement">
        <label className="mb-4 flex items-center justify-between rounded-lg border border-[#e2e8f0] dark:border-[#475569] bg-[#f1f5f9] dark:bg-[#334155] px-3 py-2 cursor-pointer">
          <span className={`text-sm ${MAIN}`}>Auto-select section & bars <span className={SUB}>(engine picks from candidate list)</span></span>
          <input type="checkbox" checked={auto} onChange={(e) => set({ auto_select: e.target.checked })} className="h-4 w-4 accent-[#0A2F44]" />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-start">
          <SectionSVG b={parseFloat(form.b_mm) || 0} h={parseFloat(form.h_mm) || 0}
            cover={parseFloat(form.clear_cover_mm) || 0} n={parseInt(form.n_bars_total) || 4}
            dia={parseFloat(form.main_bar_dia_mm) || 16} link={parseFloat(form.link_dia_mm) || 8} muted={auto} />
          <div className="grid grid-cols-2 gap-4">
            <Num label="Width b" unit="mm" value={form.b_mm} onChange={(v) => set({ b_mm: v })} step="25" disabled={auto} />
            <Num label="Depth h" unit="mm" value={form.h_mm} onChange={(v) => set({ h_mm: v })} step="25" disabled={auto} />
            <Num label="Cover" unit="mm" value={form.clear_cover_mm} onChange={(v) => set({ clear_cover_mm: v })} step="5" disabled={auto} />
            <div><label className={LABEL}>Link dia (mm)</label><Dropdown value={form.link_dia_mm} onChange={(v) => set({ link_dia_mm: v })} options={LINK_DIAS} disabled={auto} /></div>
            <div><label className={LABEL}>Main bar dia (mm)</label><Dropdown value={form.main_bar_dia_mm} onChange={(v) => set({ main_bar_dia_mm: v })} options={BAR_DIAS} disabled={auto} /></div>
            <Num label="No. of bars (total)" value={form.n_bars_total} onChange={(v) => set({ n_bars_total: v })} step="1" disabled={auto} />
          </div>
        </div>
        {auto && <p className={`mt-3 text-xs ${SUB}`}>Auto-select is on — the engine will choose section and reinforcement; the values above are ignored.</p>}
      </Card>

      <Card title="Tributary Spans">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
          <TributarySVG lx={parseFloat(form.left_x_m)} rx={parseFloat(form.right_x_m)} ty={parseFloat(form.top_y_m)} by={parseFloat(form.bottom_y_m)} />
          <div className="grid grid-cols-2 gap-4">
            <Num label="Left span (x)" unit="m" value={form.left_x_m} onChange={(v) => set({ left_x_m: v })} step="0.5" />
            <Num label="Right span (x)" unit="m" value={form.right_x_m} onChange={(v) => set({ right_x_m: v })} step="0.5" />
            <Num label="Top span (y)" unit="m" value={form.top_y_m} onChange={(v) => set({ top_y_m: v })} step="0.5" />
            <Num label="Bottom span (y)" unit="m" value={form.bottom_y_m} onChange={(v) => set({ bottom_y_m: v })} step="0.5" />
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- STEP 3: FLOORS ---------------- */
function StepFloors({ form, set, setFloor, setBeam }) {
  return (
    <div className="space-y-5">
      <Card title="Building">
        <Num label="Number of typical floors" value={form.number_of_typical_floors} onChange={(v) => set({ number_of_typical_floors: v })} step="1" />
      </Card>
      <FloorCard title="Typical Floor" which="typical_floor" floor={form.typical_floor} setFloor={setFloor} setBeam={setBeam} />
      <FloorCard title="Roof Floor" which="roof_floor" floor={form.roof_floor} setFloor={setFloor} setBeam={setBeam} />
    </div>
  );
}

function FloorCard({ title, which, floor, setFloor, setBeam }) {
  return (
    <Card title={title}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div><label className={LABEL}>Building use</label><Dropdown value={floor.building_use} onChange={(v) => setFloor(which, { building_use: v })} options={BUILDING_USES} /></div>
        <Num label="Slab thickness" unit="m" value={floor.slab_thickness_m} onChange={(v) => setFloor(which, { slab_thickness_m: v })} step="0.01" />
        <Num label="Imposed override" unit="kN/m²" value={floor.imposed_override_kN_per_m2} onChange={(v) => setFloor(which, { imposed_override_kN_per_m2: v })} step="0.25" />
        <Num label="Finishes" unit="kN/m²" value={floor.finishes_kN_per_m2} onChange={(v) => setFloor(which, { finishes_kN_per_m2: v })} step="0.25" />
        <Num label="Services" unit="kN/m²" value={floor.services_kN_per_m2} onChange={(v) => setFloor(which, { services_kN_per_m2: v })} step="0.25" />
        <Num label="Partitions" unit="kN/m²" value={floor.partitions_kN_per_m2} onChange={(v) => setFloor(which, { partitions_kN_per_m2: v })} step="0.25" />
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <BeamBlock label="Beam X" b={floor.beam_x} onChange={(p) => setBeam(which, "beam_x", p)} />
        <BeamBlock label="Beam Y" b={floor.beam_y} onChange={(p) => setBeam(which, "beam_y", p)} />
      </div>
    </Card>
  );
}

function BeamBlock({ label, b, onChange }) {
  return (
    <div className="rounded-lg border border-[#e2e8f0] dark:border-[#334155] p-3">
      <div className={`mb-2 text-xs font-semibold ${MAIN}`}>{label}</div>
      <div className="grid grid-cols-3 gap-2">
        <Num label="w" unit="m" value={b.width_m} onChange={(v) => onChange({ width_m: v })} step="0.01" />
        <Num label="d" unit="m" value={b.depth_m} onChange={(v) => onChange({ depth_m: v })} step="0.01" />
        <Num label="span" unit="m" value={b.span_m} onChange={(v) => onChange({ span_m: v })} step="0.5" />
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={!!b.wall_present} onChange={(e) => onChange({ wall_present: e.target.checked })} className="h-3.5 w-3.5 accent-[#0A2F44]" />
        <span className={SUB}>Wall on this beam</span>
      </label>
      {b.wall_present && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Num label="wall t" unit="m" value={b.wall_thickness_m} onChange={(v) => onChange({ wall_thickness_m: v })} step="0.05" />
          <Num label="opening" unit="0–1" value={b.wall_opening_ratio} onChange={(v) => onChange({ wall_opening_ratio: v })} step="0.1" />
        </div>
      )}
    </div>
  );
}

/* ---------------- STEP 4: MOMENTS ---------------- */
function StepMoments({ form, set, levels, isAxial, isBiaxial }) {
  if (isAxial) {
    return (
      <Card title="Moments">
        <div className="flex items-start gap-2 rounded-lg border-l-4 border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a] p-3">
          <FiInfo className="mt-0.5 flex-shrink-0 text-[#0A2F44] dark:text-[#66a4c2]" size={14} />
          <p className={`text-xs ${SUB}`}>Axially loaded column — no applied moments. Design uses minimum eccentricity (e₀ = max(20 mm, h/30)) automatically.</p>
        </div>
      </Card>
    );
  }
  const setM = (lvl, key, v) => set({ moments: { ...form.moments, [lvl]: { ...(form.moments[lvl] || {}), [key]: v } } });
  return (
    <Card title={`First-Order Moments (M01 / M02) — ${isBiaxial ? "x and y" : "x only"}`}>
      <p className={`mb-3 text-xs ${SUB}`}>Engine computes governing M0e = max(0.6·M02 + 0.4·M01, 0.4·M02) per level. Leave blank for 0.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-left ${SUB} border-b border-[#e2e8f0] dark:border-[#334155]`}>
              <th className="py-2 pr-3 font-medium">Level</th>
              <th className="py-2 pr-3 font-medium">M01x</th>
              <th className="py-2 pr-3 font-medium">M02x</th>
              {isBiaxial && <th className="py-2 pr-3 font-medium">M01y</th>}
              {isBiaxial && <th className="py-2 pr-3 font-medium">M02y</th>}
            </tr>
          </thead>
          <tbody>
            {levels.map((lvl) => {
              const m = form.moments[lvl] || {};
              return (
                <tr key={lvl} className="border-b border-[#f1f5f9] dark:border-[#2a3646]">
                  <td className={`py-1.5 pr-3 ${MAIN}`}>{lvl.replace("_", " ").replace("_", " ")}</td>
                  <td className="py-1.5 pr-3"><input type="number" className={INPUT} value={m.M01x ?? ""} onChange={(e) => setM(lvl, "M01x", e.target.value)} /></td>
                  <td className="py-1.5 pr-3"><input type="number" className={INPUT} value={m.M02x ?? ""} onChange={(e) => setM(lvl, "M02x", e.target.value)} /></td>
                  {isBiaxial && <td className="py-1.5 pr-3"><input type="number" className={INPUT} value={m.M01y ?? ""} onChange={(e) => setM(lvl, "M01y", e.target.value)} /></td>}
                  {isBiaxial && <td className="py-1.5 pr-3"><input type="number" className={INPUT} value={m.M02y ?? ""} onChange={(e) => setM(lvl, "M02y", e.target.value)} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------------- STEP 5: REVIEW ---------------- */
function StepReview({ form, levels, isAxial, isBiaxial }) {
  return (
    <div className="space-y-5">
      <Card title="Review">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6">
          <RV label="Column" value={`${form.column_id} · ${form.column_type}`} />
          <RV label="End / bracing" value={`${form.end_condition} · ${form.bracing}`} />
          <RV label="Storey height" value={`${form.storey_height_m} m`} />
          <RV label="Section" value={form.auto_select ? "auto-select" : `${form.b_mm}×${form.h_mm} mm`} />
          <RV label="Bars" value={form.auto_select ? "auto" : `${form.n_bars_total}×Ø${form.main_bar_dia_mm}`} />
          <RV label="Materials" value={`${form.concrete_grade} · ${form.steel_grade}`} />
          <RV label="Tributary" value={`x ${form.left_x_m}/${form.right_x_m}, y ${form.top_y_m}/${form.bottom_y_m} m`} />
          <RV label="Floors" value={`${form.number_of_typical_floors} typical + roof`} />
          <RV label="Exposure" value={form.exposure_class} />
        </div>
      </Card>
      {!isAxial && (
        <Card title="Moments (governing input)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-left ${SUB} border-b border-[#e2e8f0] dark:border-[#334155]`}>
                <th className="py-2 pr-3">Level</th><th className="py-2 pr-3">M01x</th><th className="py-2 pr-3">M02x</th>
                {isBiaxial && <th className="py-2 pr-3">M01y</th>}{isBiaxial && <th className="py-2 pr-3">M02y</th>}
              </tr></thead>
              <tbody className={MAIN}>
                {levels.map((lvl) => {
                  const m = form.moments[lvl] || {};
                  return <tr key={lvl} className="border-b border-[#f1f5f9] dark:border-[#2a3646]">
                    <td className="py-1.5 pr-3">{lvl.replace("_", " ").replace("_", " ")}</td>
                    <td className="py-1.5 pr-3 font-mono">{m.M01x || 0}</td><td className="py-1.5 pr-3 font-mono">{m.M02x || 0}</td>
                    {isBiaxial && <td className="py-1.5 pr-3 font-mono">{m.M01y || 0}</td>}
                    {isBiaxial && <td className="py-1.5 pr-3 font-mono">{m.M02y || 0}</td>}
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3">
        <p className="text-xs text-amber-800 dark:text-amber-300"><strong>v1 engine.</strong> Interaction curve is computed; biaxial envelope, 2nd-order & SLS are simplified. Verify before real design.</p>
      </div>
    </div>
  );
}

/* ---------------- SHARED ---------------- */
function Card({ title, children }) {
  return (
    <div className={CARD}>
      <div className="border-b border-[#e2e8f0] dark:border-[#334155] px-5 py-3"><h2 className={SECTION}>{title}</h2></div>
      <div className="p-5">{children}</div>
    </div>
  );
}
function Num({ label, unit, value, onChange, step, disabled }) {
  return (
    <div>
      <label className={LABEL}>{label} {unit ? <span className="text-[#94a3b8]">({unit})</span> : null}</label>
      <input type="number" step={step} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={INPUT} />
    </div>
  );
}
function RV({ label, value }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-[#94a3b8]">{label}</div><div className={`text-sm font-medium ${MAIN}`}>{value}</div></div>;
}

function SectionSVG({ b, h, cover, n, dia, link, muted }) {
  const VB = 200, pad = 30, draw = VB - 2 * pad;
  if (!(b > 0) || !(h > 0)) return <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] dark:border-[#475569] text-xs text-[#94a3b8]">Enter b, h</div>;
  const scale = draw / Math.max(b, h);
  const w = b * scale, ht = h * scale, x0 = (VB - w) / 2, y0 = (VB - ht) / 2;
  const inset = (cover + link + dia / 2) * scale;
  const per = Math.max(2, Math.round((n + 4) / 4));
  const bars = [];
  const xL = x0 + inset, xR = x0 + w - inset, yT = y0 + inset, yB = y0 + ht - inset;
  const lerp = (a, z, t) => a + (z - a) * t;
  for (let i = 0; i < per; i++) { const t = per === 1 ? 0.5 : i / (per - 1); bars.push([lerp(xL, xR, t), yT]); bars.push([lerp(xL, xR, t), yB]); }
  for (let i = 1; i < per - 1; i++) { const t = i / (per - 1); bars.push([xL, lerp(yT, yB, t)]); bars.push([xR, lerp(yT, yB, t)]); }
  const col = muted ? "#94a3b8" : ACCENT;
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className={`w-full max-w-[200px] ${muted ? "opacity-50" : ""}`} xmlns="http://www.w3.org/2000/svg">
      <rect x={x0} y={y0} width={w} height={ht} className="fill-[#eef2f6] dark:fill-[#0f172a]" stroke={col} strokeWidth="1.5" />
      <rect x={x0 + inset} y={y0 + inset} width={w - 2 * inset} height={ht - 2 * inset} fill="none" stroke={muted ? "#94a3b8" : ACCENT_D} strokeWidth="0.7" strokeDasharray="3 2" />
      {bars.map(([bx, by], i) => <circle key={i} cx={bx} cy={by} r={Math.max(2.2, Math.min(5, dia * scale * 0.5))} fill={col} />)}
      <text x={VB / 2} y={y0 + ht + 18} textAnchor="middle" fontSize="10" className="fill-[#64748b] dark:fill-[#94a3b8]">b = {b}</text>
      <text x={x0 - 16} y={VB / 2} textAnchor="middle" fontSize="10" transform={`rotate(-90 ${x0 - 16} ${VB / 2})`} className="fill-[#64748b] dark:fill-[#94a3b8]">h = {h}</text>
    </svg>
  );
}

function TributarySVG({ lx, rx, ty, by }) {
  if (!(lx > 0) || !(rx > 0) || !(ty > 0) || !(by > 0)) return <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] dark:border-[#475569] text-xs text-[#94a3b8]">Enter spans</div>;
  const VB = 200, cx = VB * (lx / (lx + rx)), cy = VB * (ty / (ty + by));
  const tx = (lx + rx) / 2, tyw = (ty + by) / 2;
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full max-w-[200px]" xmlns="http://www.w3.org/2000/svg">
      {/* tributary rectangle (half spans around the column) */}
      <rect x={cx * 0.5} y={cy * 0.5} width={VB - cx * 0.5 - (VB - cx) * 0.5} height={VB - cy * 0.5 - (VB - cy) * 0.5}
        className="fill-[#e6f0f5] dark:fill-[#1e3a4a]" stroke={ACCENT_D} strokeWidth="0.8" strokeDasharray="3 2" />
      {/* grid lines */}
      <line x1={cx} y1="0" x2={cx} y2={VB} stroke="#cbd5e1" strokeWidth="0.6" />
      <line x1="0" y1={cy} x2={VB} y2={cy} stroke="#cbd5e1" strokeWidth="0.6" />
      {/* column at intersection */}
      <rect x={cx - 6} y={cy - 6} width="12" height="12" fill={ACCENT} />
      <text x={VB / 2} y={VB - 4} textAnchor="middle" fontSize="9" className="fill-[#64748b] dark:fill-[#94a3b8]">At = {(tx * tyw).toFixed(2)} m²</text>
    </svg>
  );
}