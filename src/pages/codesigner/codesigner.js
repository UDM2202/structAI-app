// Co-designer helpers (non-component exports).
// A design the Co-designer ran (assistant message metadata.designs[]) is the
// same engine JSON the app's own pages get, so it opens on the results pages.

// member_type / design_type (API dispatcher) -> app element key + results page
const KINDS = {
  'slab:slab_simply_supported_one_way_and_two_way': { element: 'slab', route: '/slab-results', label: 'Slab' },
  'slab:slab_continuous': { element: 'continuous-slab', route: '/continuous-slab-results', label: 'Continuous slab' },
  'beam:beam_simply_supported': { element: 'beam', route: '/beam-results', label: 'Beam' },
  'beam:beam_continuous': { element: 'continuous-beam', route: '/continuous-beam-results', label: 'Continuous beam' },
  'column:column': { element: 'column', route: '/column-results', label: 'Column' },
  'foundation:foundation': { element: 'foundation', route: '/foundation-results', label: 'Pad footing' },
  'foundation:foundation_combined_footing': { element: 'foundation', route: '/foundation-results', label: 'Combined footing' },
  'staircase:staircase': { element: 'staircase', route: '/staircase-results', label: 'Staircase' },
};

export function designKind(d) {
  return KINDS[`${d.member_type}:${d.design_type}`] || (d.member_type === 'column' ? KINDS['column:column'] : null);
}

// PASS / FAIL as the results pages show it
export function designStatus(result) {
  if (!result || typeof result !== 'object') return '';
  // slabs, beams, column: summary.status; footings, staircase: status
  // (slab results also have status "completed", so summary comes first)
  const v = String(result.summary?.status || result.status || '').toUpperCase();
  return v === 'PASS' || v === 'FAIL' ? v : '';
}

// Router state for a results page (meta is display-only on foundation/staircase)
export function designRouterState(d) {
  const i = d.inputs || {};
  return {
    designResult: d.result,
    meta: {
      concrete_grade: i.concrete_grade_fck || i.materials?.concrete_grade || i.concrete,
      steel_grade: i.steel_grade_fyk || i.materials?.steel_grade || i.fyk,
    },
  };
}

// A saved design attached to a message so the Co-designer can continue it:
// element, name, result and the parts of the engine JSON that describe it.
const CONTEXT_KEYS = ['summary', 'inputs', 'input', 'geometry', 'materials', 'loads', 'forces', 'loading', 'utilisation', 'utilization', 'checks', 'reinforcement'];
export const ATTACH_LIMIT = 4000;

export function designContext(saved, elementLabel) {
  const r = saved.state?.designResult || saved.designResult || {};
  const picked = {};
  for (const k of CONTEXT_KEYS) if (r[k] !== undefined) picked[k] = r[k];
  let json = JSON.stringify(picked);
  if (json.length > ATTACH_LIMIT) json = `${json.slice(0, ATTACH_LIMIT)}…(truncated)`;
  return [
    `[Attached design: ${elementLabel} "${saved.name || 'Untitled'}"${saved.status ? `, result ${saved.status}` : ''}${saved.subtitle ? `, ${saved.subtitle}` : ''}]`,
    `Engine output (excerpt): ${json}`,
  ].join('\n');
}

export const EXAMPLES = {
  question: [
    'How does EC2 6.4 check punching shear at an internal column?',
    'When does wind lead the load combination on a roof slab?',
    'What minimum cover do I need for XC3 exposure and a 50-year life?',
  ],
  task: [
    'Design a simply supported beam: 6 m span, 300 x 500, wall load 10 kN/m, imposed 3 kN/m.',
    'Design a continuous slab over three 4 m spans, 175 mm thick, office imposed load.',
    'Try a 300 x 300 column for 1500 kN axial load over a 3.5 m storey.',
  ],
};
