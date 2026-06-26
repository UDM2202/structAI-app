import React from 'react';

const OneWaySlabDiagram = () => (
  <svg width="100%" height="120" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
    {/* Slab body - isometric/3D perspective */}
    <polygon points="30,80 170,80 180,95 20,95" fill="#e6f0f5" stroke="#0A2F44" strokeWidth="1.5" />
    <polygon points="30,80 170,80 170,65 30,65" fill="#cce1eb" stroke="#0A2F44" strokeWidth="1.5" />
    <polygon points="170,80 180,95 180,80 170,65" fill="#99c2d6" stroke="#0A2F44" strokeWidth="1.5" />
    
    {/* Supports on left and right edges only */}
    <rect x="25" y="60" width="4" height="35" fill="#0A2F44" />
    <rect x="171" y="60" width="4" height="35" fill="#0A2F44" />
    
    {/* Downward load arrows */}
    <line x1="60" y1="50" x2="60" y2="65" stroke="#2E7D32" strokeWidth="1" />
    <polygon points="58,52 60,48 62,52" fill="#2E7D32" />
    <line x1="100" y1="50" x2="100" y2="65" stroke="#2E7D32" strokeWidth="1" />
    <polygon points="98,52 100,48 102,52" fill="#2E7D32" />
    <line x1="140" y1="50" x2="140" y2="65" stroke="#2E7D32" strokeWidth="1" />
    <polygon points="138,52 140,48 142,52" fill="#2E7D32" />
    
    {/* Load transfer arrow */}
    <line x1="50" y1="100" x2="150" y2="100" stroke="#0A2F44" strokeWidth="2" />
    <polygon points="145,96 155,100 145,104" fill="#0A2F44" />
    <text x="100" y="115" fontSize="8" textAnchor="middle" fill="#475569">Load transfer in one direction</text>
  </svg>
);

const TwoWaySlabDiagram = () => (
  <svg width="100%" height="120" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
    {/* Slab body - isometric/3D perspective */}
    <polygon points="30,80 170,80 180,95 20,95" fill="#e6f0f5" stroke="#0A2F44" strokeWidth="1.5" />
    <polygon points="30,80 170,80 170,65 30,65" fill="#cce1eb" stroke="#0A2F44" strokeWidth="1.5" />
    <polygon points="170,80 180,95 180,80 170,65" fill="#99c2d6" stroke="#0A2F44" strokeWidth="1.5" />
    
    {/* Supports on all four edges */}
    <rect x="25" y="60" width="4" height="35" fill="#0A2F44" />
    <rect x="171" y="60" width="4" height="35" fill="#0A2F44" />
    <rect x="30" y="100" width="150" height="3" fill="#0A2F44" />
    
    {/* Mesh grid on top surface */}
    <line x1="60" y1="65" x2="60" y2="80" stroke="#99c2d6" strokeWidth="0.5" strokeDasharray="2,2" />
    <line x1="100" y1="65" x2="100" y2="80" stroke="#99c2d6" strokeWidth="0.5" strokeDasharray="2,2" />
    <line x1="140" y1="65" x2="140" y2="80" stroke="#99c2d6" strokeWidth="0.5" strokeDasharray="2,2" />
    <line x1="30" y1="72" x2="170" y2="72" stroke="#99c2d6" strokeWidth="0.5" strokeDasharray="2,2" />
    
    {/* Downward load arrows */}
    <line x1="60" y1="50" x2="60" y2="65" stroke="#2E7D32" strokeWidth="1" />
    <polygon points="58,52 60,48 62,52" fill="#2E7D32" />
    <line x1="100" y1="50" x2="100" y2="65" stroke="#2E7D32" strokeWidth="1" />
    <polygon points="98,52 100,48 102,52" fill="#2E7D32" />
    <line x1="140" y1="50" x2="140" y2="65" stroke="#2E7D32" strokeWidth="1" />
    <polygon points="138,52 140,48 142,52" fill="#2E7D32" />
    
    {/* Bidirectional load transfer arrows */}
    <line x1="50" y1="90" x2="150" y2="90" stroke="#0A2F44" strokeWidth="1.5" />
    <polygon points="145,87 155,90 145,93" fill="#0A2F44" />
    <line x1="90" y1="90" x2="90" y2="100" stroke="#0A2F44" strokeWidth="1.5" />
    <polygon points="87,95 90,105 93,95" fill="#0A2F44" />
    <text x="100" y="115" fontSize="8" textAnchor="middle" fill="#475569">Load transfer in both directions</text>
  </svg>
);

export const SlabBehaviourCard = ({ type, selected, onClick }) => {
  const isSelected = selected === type;
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
        isSelected
          ? 'border-[#0A2F44] bg-[#e6f0f5] dark:bg-[#1e3a4a] shadow-md'
          : 'border-[#e2e8f0] dark:border-[#334155] hover:border-[#94a3b8] bg-white dark:bg-[#1f2937]'
      }`}
    >
      {type === 'one-way' ? <OneWaySlabDiagram /> : <TwoWaySlabDiagram />}
      <p className={`font-semibold text-sm mt-2 ${isSelected ? 'text-[#0A2F44] dark:text-[#66a4c2]' : 'text-[#0F172A] dark:text-white'}`}>
        {type === 'one-way' ? 'One-Way Slab' : 'Two-Way Slab'}
      </p>
      <p className="text-xs text-[#64748b] mt-1">
        {type === 'one-way' ? 'Load transfer in one direction' : 'Load transfer in both directions'}
      </p>
    </button>
  );
};