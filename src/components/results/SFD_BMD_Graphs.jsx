// src/components/results/SFD_BMD_Graphs.jsx
import React from 'react';

const SFD_BMD_Graphs = ({ data }) => {
  const width = 400;
  const height = 200;
  const padding = 40;
  
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  
  const maxSagging = data?.maxSaggingMoment || data?.max_sagging_moment || 0;
  const maxHogging = data?.maxHoggingMoment || data?.max_hogging_moment || 0;
  
  const maxMoment = Math.max(Math.abs(maxSagging), Math.abs(maxHogging), 1);
  const scale = plotHeight / (2 * maxMoment);
  
  // Generate moment diagram points
  const points = [];
  const numPoints = 50;
  for (let i = 0; i <= numPoints; i++) {
    const x = padding + (i / numPoints) * plotWidth;
    const t = i / numPoints;
    const moment = -4 * maxHogging * t * (1 - t) + maxSagging * Math.sin(Math.PI * t);
    const y = height / 2 - moment * scale;
    points.push({ x, y });
  }
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155] overflow-hidden">
      <div className="px-5 py-3 bg-[#f8fafc] dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155]">
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wide">
          Bending Moment Diagram (BMD)
        </h3>
      </div>
      <div className="p-5">
        <div className="flex justify-center">
          <svg width={width} height={height} className="rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
            {/* Grid lines */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="4" />
            <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#94a3b8" strokeWidth="0.5" />
            
            {/* Zero line */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#64748b" strokeWidth="1" />
            
            {/* Supports */}
            <polygon points={`${padding-5},${height/2} ${padding+5},${height/2+8} ${padding+5},${height/2-8}`} fill="#0A2F44" />
            <polygon points={`${width-padding-5},${height/2} ${width-padding-15},${height/2+8} ${width-padding-15},${height/2-8}`} fill="#0A2F44" />
            
            {/* Moment diagram fill */}
            <defs>
              <linearGradient id="momentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A2F44" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0A2F44" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={`${pathD} L ${width-padding} ${height/2} L ${padding} ${height/2} Z`} fill="url(#momentGrad)" />
            
            {/* Moment diagram line */}
            <path d={pathD} fill="none" stroke="#0A2F44" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Peak markers */}
            {maxSagging > 0 && (
              <circle cx={width/2} cy={height/2 - maxSagging * scale} r="4" fill="#0A2F44" />
            )}
            {maxHogging > 0 && (
              <>
                <circle cx={width*0.25} cy={height/2 + maxHogging * scale} r="4" fill="#2E7D32" />
                <circle cx={width*0.75} cy={height/2 + maxHogging * scale} r="4" fill="#2E7D32" />
              </>
            )}
            
            {/* Labels */}
            <text x={width/2} y={height-5} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="500">Span Length</text>
            <text x={width-padding+5} y={height/2-15} textAnchor="end" fontSize="9" fill="#2E7D32" fontWeight="bold">
              Hogging: {maxHogging.toFixed(1)} kNm
            </text>
            <text x={width-padding+5} y={height/2+20} textAnchor="end" fontSize="9" fill="#0A2F44" fontWeight="bold">
              Sagging: {maxSagging.toFixed(1)} kNm
            </text>
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#0A2F44' }}></div>
            <span className="text-[#64748b] dark:text-[#94a3b8]">Sagging Moment</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#2E7D32' }}></div>
            <span className="text-[#64748b] dark:text-[#94a3b8]">Hogging Moment</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SFD_BMD_Graphs;