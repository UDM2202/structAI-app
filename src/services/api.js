// src/services/api.js
const API_BASE = 'https://structdh-1.onrender.com';

export const slabAPI = {
  startDesign: async (formData) => {
    const request = {
      slab_type: formData.slabType === 'one-way' ? 'one_way' : 'two_way',
      continuity: formData.continuity,
      geometry: {
        span_lx: parseFloat(formData.spanLx),
        span_ly: parseFloat(formData.spanLy),
        thickness: parseFloat(formData.thickness),
        effective_depth: parseFloat(formData.effectiveDepth),
        clear_cover: parseFloat(formData.clearCover)
      },
      materials: {
        concrete_grade: formData.concreteGrade,
        steel_grade: formData.steelGrade,
        unit_weight_concrete: parseFloat(formData.unitWeightConcrete),
        unit_weight_steel: parseFloat(formData.unitWeightSteel)
      },
      loads: {
        dead_load: parseFloat(formData.deadLoad),
        floor_finish: parseFloat(formData.floorFinish),
        live_load: parseFloat(formData.liveLoad),
        additional_dead_load: parseFloat(formData.additionalDeadLoad),
        additional_live_load: parseFloat(formData.additionalLiveLoad)
      },
      design_params: {
        design_code: formData.designCode,
        analysis_method: formData.analysisMethod,
        exposure_class: formData.exposureClass,
        fire_rating: parseInt(formData.fireRating),
        crack_width_limit: parseFloat(formData.crackWidthLimit),
        deflection_limit: parseInt(formData.deflectionLimit)
      },
      bar_diameters: [10, 12, 16],
      use_ai: false,
      region: "Nigeria",
      building_use: formData.buildingUse || "office"
    };

    const response = await fetch(`${API_BASE}/api/slab/design/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
  const error = await response.json();
  console.error("422 DETAIL →", JSON.stringify(error.detail, null, 2));
  throw new Error(typeof error.detail === "string" ? error.detail : JSON.stringify(error.detail));
}
    
    return response.json();
  },

  getRates: async (region = 'Nigeria') => {
    const response = await fetch(`${API_BASE}/api/rates/${region}`);
    if (!response.ok) throw new Error('Failed to fetch rates');
    return response.json();
  }
};

export const beamAPI = {
  startDesign: async (formData) => {
    const request = {
      beam_id: formData.beamId || "B1",
      design_code: formData.designCode,                 // EC2 | BS8110 | ACI318
      support_condition: formData.supportCondition,     // e.g. both_ends_simply_supported
      top_restraint: formData.topRestraint,             // continuous | one_end_discontinuous | both_ends_discontinuous
      geometry: {
        span: parseFloat(formData.span),                // mm
        width: parseFloat(formData.width),              // mm
        depth: parseFloat(formData.depth),              // mm
        effective_cover: parseFloat(formData.effectiveCover),
      },
      materials: {
        concrete_grade: formData.concreteGrade,
        steel_grade: formData.steelGrade,
        unit_weight_concrete: parseFloat(formData.unitWeightConcrete),
        unit_weight_steel: parseFloat(formData.unitWeightSteel),
      },
      loads: {
        self_weight_auto: !!formData.selfWeightAuto,
        wall_load: parseFloat(formData.wallLoad) || 0,
        finishes: parseFloat(formData.finishes) || 0,
        additional_dead_load: parseFloat(formData.additionalDeadLoad) || 0,
        live_load: parseFloat(formData.liveLoad) || 0,
        other_live_load: parseFloat(formData.otherLiveLoad) || 0,
      },
      bar_diameters: [16, 20, 25, 32],
      link_diameter: 8,
      region: formData.region || "Nigeria",
    };

    const res = await fetch(`${API_BASE}/api/beam/design/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(
        err?.detail ? (typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)) : `Request failed: ${res.status}`
      );
    }
    return res.json();
  },
};


export const continuousBeamAPI = {
  startDesign: async (form) => {
    const request = {
      beam_id: form.beamId || "CB1",
      design_code: form.designCode,
      analysis_method: form.analysisMethod || "Linear Elastic",
      geometry: {
        n_spans: parseInt(form.nSpans),
        span_lengths: form.spanLengths.map((v) => parseFloat(v)),
        width: parseFloat(form.width),
        depth: parseFloat(form.depth),
        effective_depth: form.effectiveDepth ? parseFloat(form.effectiveDepth) : null,
        cover: parseFloat(form.cover),
      },
      materials: {
        concrete_grade: form.concreteGrade,
        steel_grade: form.steelGrade,
        unit_weight_concrete: parseFloat(form.unitWeightConcrete),
        unit_weight_steel: parseFloat(form.unitWeightSteel),
      },
      loads: {
        self_weight_auto: !!form.selfWeightAuto,
        wall_load: parseFloat(form.wallLoad) || 0,
        finishes: parseFloat(form.finishes) || 0,
        additional_dead_load: parseFloat(form.additionalDeadLoad) || 0,
        live_load: parseFloat(form.liveLoad) || 0,
        other_live_load: parseFloat(form.otherLiveLoad) || 0,
      },
      span_loads: form.spanLoads && form.spanLoads.length ? form.spanLoads : null,
      end_support: form.endSupport || "simple",
      design_params: {
        design_working_life: parseInt(form.designWorkingLife) || 50,
        exposure_class: form.exposureClass || "XC1",
        cracked_section_sls: form.crackedSectionSls !== false,
      },
      bar_diameters: [16, 20, 25, 32],
      link_diameter: 8,
      region: form.region || "Nigeria",
    };
    const res = await fetch(`${API_BASE}/api/continuous-beam/design/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail ? (typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)) : `Request failed: ${res.status}`);
    }
    return res.json();
  },
};

export const continuousSlabAPI = {
  startDesign: async (form) => {
    const request = {
      span_lengths: (form.spanLengths || []).map((v) => parseFloat(v)),
      start_support: form.startSupport || "pinned",
      end_support: form.endSupport || "pinned",
      geometry_thickness: parseFloat(form.thickness),
      clear_cover: parseFloat(form.clearCover),
      materials: {
        concrete_grade: form.concreteGrade,
        steel_grade: form.steelGrade,
        unit_weight_concrete: parseFloat(form.unitWeightConcrete) || 25,
        unit_weight_steel: parseFloat(form.unitWeightSteel) || 78.5,
      },
      loads: {
        dead_load: parseFloat(form.deadLoad) || 0,
        floor_finish: parseFloat(form.floorFinish) || 0,
        live_load: parseFloat(form.liveLoad) || 0,
        additional_dead_load: parseFloat(form.additionalDeadLoad) || 0,
        additional_live_load: parseFloat(form.additionalLiveLoad) || 0,
      },
      design_params: {
        design_code: form.designCode || "EC2",
        analysis_method: form.analysisMethod || "limit_state",
        exposure_class: form.exposureClass || "XC3",
        fire_rating: parseInt(form.fireRating) || 60,
        crack_width_limit: parseFloat(form.crackWidthLimit) || 0.3,
        deflection_limit: parseInt(form.deflectionLimit) || 250,
      },
      bar_diameters: form.barDiameters || [10, 12, 16],
      region: form.region || "Nigeria",
    };

    const res = await fetch(`${API_BASE}/api/continuous-slab/design/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail ? (typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail)) : `Request failed: ${res.status}`);
    }
    return res.json();
  },
};
