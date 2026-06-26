import React from 'react';

const AllEdgesContinuousDiagram = () => (
  <svg width="100%" height="90" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet">
    <rect x="30" y="20" width="100" height="55" fill="#f8fafc" stroke="#0A2F44" strokeWidth="1.5" />
    {/* Support symbols on all four edges */}
    <line x1="30" y1="20" x2="130" y2="20" stroke="#0A2F44" strokeWidth="3" />
    <line x1="30" y1="75" x2="130" y2="75" stroke="#0A2F44" strokeWidth="3" />
    <line x1="30" y1="20" x2="30" y2="75" stroke="#0A2F44" strokeWidth="3" />
    <line x1="130" y1="20" x2="130" y2="75" stroke="#0A2F44" strokeWidth="3" />
    {/* Small hatch marks */}
    {[40, 60, 80, 100, 120].map(x => (
      <line key={x} x1={x} y1="20" x2={x} y2="25" stroke="#0A2F44" strokeWidth="1" />
    ))}
    {[40, 60, 80, 100, 120].map(x => (
      <line key={x} x1={x} y1="75" x2={x} y2="70" stroke="#0A2F44" strokeWidth="1" />
    ))}
    {[35, 45, 55, 65].map(y => (
      <line key={y} x1="30" y1={y} x2="25" y2={y} stroke="#0A2F44" strokeWidth="1" />
    ))}
    {[35, 45, 55, 65].map(y => (
      <line key={y} x1="130" y1={y} x2="125" y2={y} stroke="#0A2F44" strokeWidth="1" />
    ))}
    <text x="80" y="88" fontSize="7" textAnchor="middle" fill="#475569">All Edges Continuous</text>
  </svg>
);

const OneShortEdgeDiscontinuousDiagram = () => (
  <svg width="100%" height="90" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet">
    <rect x="30" y="20" width="100" height="55" fill="#f8fafc" stroke="#0A2F44" strokeWidth="1.5" />
    {/* Three edges supported, one short edge free (bottom) */}
    <line x1="30" y1="20" x2="130" y2="20" stroke="#0A2F44" strokeWidth="3" />
    <line x1="30" y1="20" x2="30" y2="75" stroke="#0A2F44" strokeWidth="3" />
    <line x1="130" y1="20" x2="130" y2="75" stroke="#0A2F44" strokeWidth="3" />
    {/* Bottom edge - dashed (discontinuous) */}
    <line x1="30" y1="75" x2="130" y2="75" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3" />
    <text x="80" y="88" fontSize="7" textAnchor="middle" fill="#475569">One Short Edge Discontinuous</text>
  </svg>
);

const OneLongEdgeDiscontinuousDiagram = () => (
  <svg width="100%" height="90" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet">
    <rect x="30" y="20" width="100" height="55" fill="#f8fafc" stroke="#0A2F44" strokeWidth="1.5" />
    {/* Three edges supported, one long edge free (right) */}
    <line x1="30" y1="20" x2="130" y2="20" stroke="#0A2F44" strokeWidth="3" />
    <line x1="30" y1="75" x2="130" y2="75" stroke="#0A2F44" strokeWidth="3" />
    <line x1="30" y1="20" x2="30" y2="75" stroke="#0A2F44" strokeWidth="3" />
    {/* Right edge - dashed (discontinuous) */}
    <line x1="130" y1="20" x2="130" y2="75" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3" />
    <text x="80" y="88" fontSize="7" textAnchor="middle" fill="#475569">One Long Edge Discontinuous</text>
  </svg>
);

const TwoAdjacentEdgesDiscontinuousDiagram = () => (
  <svg width="100%" height="90" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet">
    <rect x="30" y="20" width="100" height="55" fill="#f8fafc" stroke="#0A2F44" strokeWidth="1.5" />
    {/* Two edges supported, two adjacent edges free (bottom and right) */}
    <line x1="30" y1="20" x2="130" y2="20" stroke="#0A2F44" strokeWidth="3" />
    <line x1="30" y1="20" x2="30" y2="75" stroke="#0A2F44" strokeWidth="3" />
    {/* Bottom and right edges - dashed */}
    <line x1="30" y1="75" x2="130" y2="75" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3" />
    <line x1="130" y1="20" x2="130" y2="75" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3" />
    {/* Corner highlight */}
    <circle cx="130" cy="75" r="4" fill="none" stroke="#dc2626" strokeWidth="1" />
    <text x="80" y="88" fontSize="7" textAnchor="middle" fill="#475569">Two Adjacent Edges Discontinuous</text>
  </svg>
);

export const SlabContinuityCard = ({ option, selected, onClick }) => {
  const getDiagram = () => {
    switch(option.value) {
      case 'all_edges_continuous': return <AllEdgesContinuousDiagram />;
      case 'one_short_discontinuous': return <OneShortEdgeDiscontinuousDiagram />;
      case 'one_long_discontinuous': return <OneLongEdgeDiscontinuousDiagram />;
      case 'two_adjacent_discontinuous': return <TwoAdjacentEdgesDiscontinuousDiagram />;
      default: return <AllEdgesContinuousDiagram />;
    }
  };

  const isSelected = selected === option.value;
  
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
        isSelected
          ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a] shadow-sm'
          : 'border-[#e2e8f0] dark:border-[#334155] hover:border-[#94a3b8] bg-white dark:bg-[#1f2937]'
      }`}
    >
      {getDiagram()}
      <p className={`text-xs font-medium mt-2 ${isSelected ? 'text-[#0A2F44] dark:text-[#66a4c2]' : 'text-[#0F172A] dark:text-white'}`}>
        {option.label}
      </p>
    </button>
  );
};