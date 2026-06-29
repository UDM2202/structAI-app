// src/pages/ContinuousSlabInput.jsx — renders inside MainLayout
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2, FiLayers, FiLoader } from "react-icons/fi";
import { continuousSlabAPI } from "../services/api";
import Dropdown from "../components/Dropdown";

const CARD = "bg-white dark:bg-[#1f2937] rounded-xl border border-[#e2e8f0] dark:border-[#334155] shadow-sm";
const MAIN = "text-[#0F172A] dark:text-white";
const SUB = "text-[#64748b] dark:text-[#94a3b8]";
const ACCENT = "text-[#0A2F44] dark:text-[#66a4c2]";
const LABEL = "block text-[11px] font-semibold uppercase tracking-wide text-[#64748b] dark:text-[#94a3b8] mb-1";
const INPUT = "w-full rounded-lg border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#0f172a] px-3 py-2 text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44]/30 dark:focus:ring-[#66a4c2]/30";

const SUPPORTS = [{ value: "pinned", label: "Pinned / Simple" }, { value: "fixed", label: "Fixed / Built-in" }];
const CONCRETE = ["C25/30", "C30/37", "C35/45"];
const STEEL = ["B500", "B460"];
const EXPOSURE = ["XC1", "XC2", "XC3", "XC4"];
const REGIONS = ["UK", "Nigeria"];
const BARSETS = [[10, 12, 16], [12, 16, 20], [8, 10, 12]];

const DEFAULTS = {
  spanLengths: ["5", "5", "5"],
  startSupport: "pinned",
  endSupport: "pinned",
  thickness: "200",
  clearCover: "25",
  concreteGrade: "C30/37",
  steelGrade: "B500",
  unitWeightConcrete: "25",
  unitWeightSteel: "78.5",
  deadLoad: "1.0",
  floorFinish: "1.0",
  liveLoad: "3.0",
  additionalDeadLoad: "0",
  additionalLiveLoad: "0",
  designCode: "EC2",
  analysisMethod: "limit_state",
  exposureClass: "XC3",
  fireRating: "60",
  crackWidthLimit: "0.3",
  deflectionLimit: "250",
  barDiameters: [10, 12, 16],
  region: "Nigeria",
};

export default function ContinuousSlabInput() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const setSpan = (i, v) => {
    const s = [...form.spanLengths];
    s[i] = v;
    set({ spanLengths: s });
  };
  const addSpan = () => set({ spanLengths: [...form.spanLengths, "5"] });
  const removeSpan = (i) => {
    if (form.spanLengths.length <= 1) return;
    set({ spanLengths: form.spanLengths.filter((_, j) => j !== i) });
  };

  const submit = async () => {
    setError("");
    const lens = form.spanLengths.map((v) => parseFloat(v));
    if (lens.some((v) => !v || v <= 0)) {
      setError("All span lengths must be greater than 0.");
      return;
    }
    setLoading(true);
    try {
      const result = await continuousSlabAPI.startDesign(form);
      navigate("/continuous-slab-results", { state: { designResult: result } });
    } catch (e) {
      setError(e.message || "Design failed.");
    } finally {
      setLoading(false);
    }
  };

  const totalLen = form.spanLengths.reduce((a, b) => a + (parseFloat(b) || 0), 0);

  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <h1 className={`flex items-center gap-2 text-lg font-bold uppercase tracking-wide ${ACCENT}`}>
          <FiLayers /> Continuous One-Way Slab — Input
        </h1>
        <p className={`text-sm ${SUB}`}>Multi-span continuous slab · EC2 · stiffness-method analysis</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Spans & supports */}
        <section className={`${CARD} lg:col-span-2`}>
          <header className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-2.5 dark:border-[#334155]">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">1. Spans & Supports</h3>
            <button onClick={addSpan} className="flex items-center gap-1.5 rounded-lg bg-[#e6f0f5] px-2.5 py-1 text-xs font-medium text-[#0A2F44] hover:bg-[#d4e6ef] dark:bg-[#1e3a4a] dark:text-[#66a4c2]">
              <FiPlus size={13} /> Add span
            </button>
          </header>
          <div className="p-4">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Start Support</label>
                <Dropdown value={form.startSupport} onChange={(v) => set({ startSupport: v })} options={SUPPORTS} />
              </div>
              <div>
                <label className={LABEL}>End Support</label>
                <Dropdown value={form.endSupport} onChange={(v) => set({ endSupport: v })} options={SUPPORTS} />
              </div>
            </div>

            <label className={LABEL}>Span Lengths (m)</label>
            <div className="space-y-2">
              {form.spanLengths.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-16 text-xs font-semibold ${SUB}`}>Span {i + 1}</span>
                  <input type="number" step="0.1" min="0" className={INPUT} value={v} onChange={(e) => setSpan(i, e.target.value)} />
                  <button
                    onClick={() => removeSpan(i)}
                    disabled={form.spanLengths.length <= 1}
                    className="rounded-lg p-2 text-[#64748b] hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-900/20"
                    title="Remove span"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <p className={`mt-3 text-[11px] ${SUB}`}>{form.spanLengths.length} spans · total length {totalLen.toFixed(2)} m · {form.spanLengths.length + 1} supports</p>
          </div>
        </section>

        {/* Section & materials */}
        <section className={CARD}>
          <header className="border-b border-[#e2e8f0] px-4 py-2.5 dark:border-[#334155]">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">2. Section & Materials</h3>
          </header>
          <div className="grid grid-cols-2 gap-3 p-4">
            <div><label className={LABEL}>Thickness (mm)</label><input type="number" className={INPUT} value={form.thickness} onChange={(e) => set({ thickness: e.target.value })} /></div>
            <div><label className={LABEL}>Clear Cover (mm)</label><input type="number" className={INPUT} value={form.clearCover} onChange={(e) => set({ clearCover: e.target.value })} /></div>
            <div><label className={LABEL}>Concrete</label><Dropdown value={form.concreteGrade} onChange={(v) => set({ concreteGrade: v })} options={CONCRETE} /></div>
            <div><label className={LABEL}>Steel</label><Dropdown value={form.steelGrade} onChange={(v) => set({ steelGrade: v })} options={STEEL} /></div>
            <div><label className={LABEL}>Bar set (mm)</label><Dropdown value={form.barDiameters.join(",")} onChange={(v) => set({ barDiameters: v.split(",").map(Number) })} options={BARSETS.map((b) => ({ value: b.join(","), label: b.join(", ") }))} /></div>
            <div><label className={LABEL}>Region</label><Dropdown value={form.region} onChange={(v) => set({ region: v })} options={REGIONS} /></div>
          </div>
        </section>

        {/* Loads */}
        <section className={`${CARD} lg:col-span-2`}>
          <header className="border-b border-[#e2e8f0] px-4 py-2.5 dark:border-[#334155]">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">3. Loads (kN/m²)</h3>
          </header>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            <div><label className={LABEL}>Partition / Dead</label><input type="number" step="0.1" className={INPUT} value={form.deadLoad} onChange={(e) => set({ deadLoad: e.target.value })} /></div>
            <div><label className={LABEL}>Floor Finish</label><input type="number" step="0.1" className={INPUT} value={form.floorFinish} onChange={(e) => set({ floorFinish: e.target.value })} /></div>
            <div><label className={LABEL}>Extra Dead</label><input type="number" step="0.1" className={INPUT} value={form.additionalDeadLoad} onChange={(e) => set({ additionalDeadLoad: e.target.value })} /></div>
            <div><label className={LABEL}>Live (Imposed)</label><input type="number" step="0.1" className={INPUT} value={form.liveLoad} onChange={(e) => set({ liveLoad: e.target.value })} /></div>
            <div><label className={LABEL}>Extra Live</label><input type="number" step="0.1" className={INPUT} value={form.additionalLiveLoad} onChange={(e) => set({ additionalLiveLoad: e.target.value })} /></div>
            <div className="flex items-end"><p className={`text-[11px] ${SUB}`}>Self-weight is auto-computed from thickness.</p></div>
          </div>
        </section>

        {/* Design params */}
        <section className={CARD}>
          <header className="border-b border-[#e2e8f0] px-4 py-2.5 dark:border-[#334155]">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#0A2F44] dark:text-[#66a4c2]">4. Design Parameters</h3>
          </header>
          <div className="grid grid-cols-2 gap-3 p-4">
            <div><label className={LABEL}>Code</label><input className={`${INPUT} opacity-70`} value="EC2" readOnly /></div>
            <div><label className={LABEL}>Exposure</label><Dropdown value={form.exposureClass} onChange={(v) => set({ exposureClass: v })} options={EXPOSURE} /></div>
            <div><label className={LABEL}>Fire (min)</label><input type="number" className={INPUT} value={form.fireRating} onChange={(e) => set({ fireRating: e.target.value })} /></div>
            <div><label className={LABEL}>Deflection L/?</label><input type="number" className={INPUT} value={form.deflectionLimit} onChange={(e) => set({ deflectionLimit: e.target.value })} /></div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={submit} disabled={loading} className="flex items-center gap-2 rounded-lg bg-[#0A2F44] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#082636] disabled:opacity-60">
          {loading ? <><FiLoader className="animate-spin" /> Designing…</> : "Run Design"}
        </button>
      </div>
    </div>
  );
}