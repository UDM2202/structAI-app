import React from 'react';

const DesignForcesTable = ({ data }) => {
  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155] overflow-hidden">
      <div className="px-5 py-3 bg-[#f8fafc] dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155]">
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wide">
          Design Forces
        </h3>
      </div>
      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] dark:border-[#334155]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase">Parameter</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase">Value</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase">Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#e2e8f0] dark:border-[#334155]">
                <td className="py-3 px-4 font-medium text-[#0F172A] dark:text-white">Ultimate Load (wEd)</td>
                <td className="py-3 px-4 text-right font-mono text-[#0A2F44] dark:text-[#66a4c2]">{data.ultimateLoad.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-[#64748b] dark:text-[#94a3b8]">kN/m²</td>
              </tr>
              <tr className="border-b border-[#e2e8f0] dark:border-[#334155]">
                <td className="py-3 px-4 font-medium text-[#0F172A] dark:text-white">Service Load (Gk + Qk)</td>
                <td className="py-3 px-4 text-right font-mono text-[#0F172A] dark:text-white">{data.serviceLoad.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-[#64748b] dark:text-[#94a3b8]">kN/m²</td>
              </tr>
              <tr className="border-b border-[#e2e8f0] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#1e293b]">
                <td className="py-3 px-4 font-semibold text-[#0A2F44] dark:text-[#66a4c2]">Max Sagging Moment</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-[#0A2F44] dark:text-[#66a4c2]">{data.maxSaggingMoment.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-[#64748b] dark:text-[#94a3b8]">kNm/m</td>
              </tr>
              <tr className="border-b border-[#e2e8f0] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#1e293b]">
                <td className="py-3 px-4 font-semibold text-[#2E7D32] dark:text-[#4caf50]">Max Hogging Moment</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-[#2E7D32] dark:text-[#4caf50]">{data.maxHoggingMoment.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-[#64748b] dark:text-[#94a3b8]">kNm/m</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-[#475569] dark:text-[#94a3b8]">Max Shear Force</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-[#475569] dark:text-[#cbd5e1]">{data.maxShearForce.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-[#64748b] dark:text-[#94a3b8]">kN/m</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DesignForcesTable;