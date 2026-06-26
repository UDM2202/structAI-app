// src/components/results/ReinforcementDetails.jsx
import React from 'react';
import { FiArrowDown, FiArrowUp } from 'react-icons/fi';

const ReinforcementDetails = ({ data }) => {
  // Handle both backend snake_case and frontend camelCase
  const bottomSteel = data?.bottomSteel || data?.bottom_steel || {};
  const topSteel = data?.topSteel || data?.top_steel || {};

  const formatSteel = (steel) => ({
    direction: steel?.direction || 'Both Directions',
    barDiameter: steel?.bar_diameter || steel?.barDiameter || 12,
    spacing: steel?.spacing || 150,
    areaProvided: steel?.area_provided || steel?.areaProvided || 0,
    areaRequired: steel?.area_required || steel?.areaRequired || 0,
  });

  const bottom = formatSteel(bottomSteel);
  const top = formatSteel(topSteel);

  const bottomRatio = bottom.areaRequired > 0 ? (bottom.areaProvided / bottom.areaRequired) : 0;
  const topRatio = top.areaRequired > 0 ? (top.areaProvided / top.areaRequired) : 0;

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155] overflow-hidden">
      <div className="px-5 py-3 bg-[#f8fafc] dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155]">
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wide">
          Reinforcement Layout
        </h3>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Bottom Steel */}
          <div className="border border-[#e2e8f0] dark:border-[#334155] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FiArrowDown className="text-blue-600 dark:text-blue-400 text-lg" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] dark:text-white">Bottom Steel</h4>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">{bottom.direction}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b] dark:text-[#94a3b8]">Bar Diameter:</span>
                <span className="font-mono font-bold text-[#0F172A] dark:text-white">Y{bottom.barDiameter}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b] dark:text-[#94a3b8]">Spacing:</span>
                <span className="font-mono font-bold text-[#0F172A] dark:text-white">{bottom.spacing} mm c/c</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b] dark:text-[#94a3b8]">Area Provided:</span>
                <span className="font-mono font-bold text-[#0A2F44] dark:text-[#66a4c2]">{bottom.areaProvided} mm²/m</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b] dark:text-[#94a3b8]">Area Required:</span>
                <span className="font-mono text-[#64748b] dark:text-[#94a3b8]">{bottom.areaRequired} mm²/m</span>
              </div>
              <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#334155]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Ratio (Prov/Req):</span>
                  <span className={`font-mono font-bold ${bottomRatio >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {bottomRatio.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Steel */}
          <div className="border border-[#e2e8f0] dark:border-[#334155] rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <FiArrowUp className="text-red-600 dark:text-red-400 text-lg" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] dark:text-white">Top Steel</h4>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">{top.direction}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b] dark:text-[#94a3b8]">Bar Diameter:</span>
                <span className="font-mono font-bold text-[#0F172A] dark:text-white">Y{top.barDiameter}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b] dark:text-[#94a3b8]">Spacing:</span>
                <span className="font-mono font-bold text-[#0F172A] dark:text-white">{top.spacing} mm c/c</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b] dark:text-[#94a3b8]">Area Provided:</span>
                <span className="font-mono font-bold text-[#0A2F44] dark:text-[#66a4c2]">{top.areaProvided} mm²/m</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748b] dark:text-[#94a3b8]">Area Required:</span>
                <span className="font-mono text-[#64748b] dark:text-[#94a3b8]">{top.areaRequired} mm²/m</span>
              </div>
              <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#334155]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748b] dark:text-[#94a3b8]">Ratio (Prov/Req):</span>
                  <span className={`font-mono font-bold ${topRatio >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {topRatio.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reinforcement Layout SVG */}
        <div className="mt-6 p-4 bg-[#f8fafc] dark:bg-[#1e293b] rounded-lg">
          <div className="flex justify-center">
            <svg width="400" height="120" viewBox="0 0 400 120">
              <rect x="50" y="30" width="300" height="60" fill="#e6f0f5" stroke="#0A2F44" strokeWidth="2" />
              
              {/* Bottom bars */}
              <line x1="50" y1="75" x2="350" y2="75" stroke="#2563eb" strokeWidth="3" />
              {[80, 140, 200, 260, 320].map((cx, i) => (
                <circle key={i} cx={cx} cy="75" r="4" fill="#2563eb" />
              ))}
              
              {/* Top bars */}
              <line x1="50" y1="45" x2="350" y2="45" stroke="#dc2626" strokeWidth="3" />
              {[110, 170, 230, 290].map((cx, i) => (
                <circle key={i} cx={cx} cy="45" r="4" fill="#dc2626" />
              ))}
              
              <text x="200" y="20" textAnchor="middle" fontSize="9" fill="#64748b">Section View</text>
              <text x="370" y="78" fontSize="8" fill="#2563eb">Y{bottom.barDiameter}@{bottom.spacing}</text>
              <text x="370" y="48" fontSize="8" fill="#dc2626">Y{top.barDiameter}@{top.spacing}</text>
              
              <line x1="50" y1="95" x2="350" y2="95" stroke="#64748b" strokeWidth="0.5" />
              <text x="200" y="108" textAnchor="middle" fontSize="8" fill="#64748b">Slab Section</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReinforcementDetails;