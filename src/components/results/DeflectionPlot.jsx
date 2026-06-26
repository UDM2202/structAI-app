// src/components/results/DeflectionPlot.jsx
import React from 'react';

const DeflectionPlot = ({ data }) => {
  const actualDeflection = data?.actual_deflection || data?.actualDeflection || 0;
  const allowableDeflection = data?.allowable_deflection || data?.allowableDeflection || 16;
  const status = data?.status || 'PASS';

  const width = 400;
  const height = 150;
  const padding = 40;
  
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  
  const maxDeflection = Math.max(actualDeflection, allowableDeflection, 1);
  const scale = plotHeight / (2 * maxDeflection);
  
  // Generate deflection curve
  const points = [];
  const numPoints = 50;
  for (let i = 0; i <= numPoints; i++) {
    const x = padding + (i / numPoints) * plotWidth;
    const t = i / numPoints;
    const deflection = actualDeflection * Math.sin(Math.PI * t);
    const y = height / 2 + deflection * scale;
    points.push({ x, y });
  }
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155] overflow-hidden">
      <div className="px-5 py-3 bg-[#f8fafc] dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155]">
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wide">
          Deflection Check
        </h3>
      </div>
      <div className="p-5">
        <div className="flex justify-center mb-4">
          <svg width={width} height={height} className="rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
            {/* Baseline */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
            <text x={padding-5} y={height/2+3} textAnchor="end" fontSize="8" fill="#64748b">0</text>
            
            {/* Allowable limit line */}
            {allowableDeflection > 0 && (
              <>
                <line 
                  x1={padding} 
                  y1={height/2 - allowableDeflection * scale} 
                  x2={width-padding} 
                  y2={height/2 - allowableDeflection * scale} 
                  stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6,3" 
                />
                <text 
                  x={width-padding-5} 
                  y={height/2 - allowableDeflection * scale - 6} 
                  fontSize="9" fill="#ef4444" textAnchor="end" fontWeight="bold"
                >
                  Limit: {allowableDeflection.toFixed(1)}mm
                </text>
              </>
            )}
            
            {/* Deflection fill */}
            <defs>
              <linearGradient id="deflectGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A2F44" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0A2F44" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={`${pathD} L ${width-padding} ${height/2} L ${padding} ${height/2} Z`} fill="url(#deflectGrad)" />
            
            {/* Deflection curve */}
            <path d={pathD} fill="none" stroke="#0A2F44" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Max deflection point */}
            <circle cx={width/2} cy={height/2 + actualDeflection * scale} r="4" fill="#0A2F44" />
            
            {/* Max deflection label */}
            <text 
              x={width/2} 
              y={height/2 + actualDeflection * scale + 18} 
              fontSize="10" fill="#0A2F44" textAnchor="middle" fontWeight="bold"
            >
              {actualDeflection.toFixed(1)}mm
            </text>

            {/* Support symbols */}
            <polygon points={`${padding-5},${height/2} ${padding+5},${height/2+8} ${padding+5},${height/2-8}`} fill="#64748b" />
            <polygon points={`${width-padding-5},${height/2} ${width-padding-15},${height/2+8} ${width-padding-15},${height/2-8}`} fill="#64748b" />
          </svg>
        </div>
        
        <div className="flex items-center justify-center space-x-8 text-sm">
          <div className="text-center">
            <p className="text-[#64748b] dark:text-[#94a3b8] text-xs">Actual Deflection</p>
            <p className="font-bold text-[#0F172A] dark:text-white">{actualDeflection.toFixed(1)} mm</p>
          </div>
          <div className="text-center">
            <p className="text-[#64748b] dark:text-[#94a3b8] text-xs">Allowable (L/250)</p>
            <p className="font-bold text-[#0F172A] dark:text-white">{allowableDeflection.toFixed(1)} mm</p>
          </div>
          <div className="text-center">
            <p className="text-[#64748b] dark:text-[#94a3b8] text-xs">Status</p>
            <p className={`font-bold text-lg ${status === 'PASS' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeflectionPlot;