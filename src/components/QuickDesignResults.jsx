import React, { useState } from 'react';
import { FiDownload, FiSave, FiTrendingUp, FiZap, FiCheckCircle, FiAlertCircle, FiArrowRight, FiFolderPlus } from 'react-icons/fi';

const QuickDesignResults = ({ results, formData, onBack, onSave, onExport, onConvertToProject }) => {
  const [selectedOption, setSelectedOption] = useState(results?.options?.[0]?.id);
  const [isExporting, setIsExporting] = useState(false);

  const selected = results?.options?.find(opt => opt.id === selectedOption);

  const handleExportJSON = () => {
    setIsExporting(true);
    const exportData = {
      designName: formData.designName || 'Quick Design',
      date: new Date().toISOString(),
      inputs: formData,
      results: results,
      selectedOption: selected
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quick_design_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    const headers = ['Rank', 'Thickness (mm)', 'Bar Dia (mm)', 'Spacing (mm)', 'As Prov (mm²/m)', 'Cost (€/m²)', 'Carbon (kgCO₂/m²)', 'Utilisation'];
    const rows = results.options.map(opt => [
      opt.rank,
      opt.thickness,
      opt.barDiameter,
      opt.spacing,
      opt.asProv,
      opt.cost,
      opt.carbon,
      opt.utilisation
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quick_design_results_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onSave}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiSave />
            <span>Save Design</span>
          </button>
          <button
            onClick={onConvertToProject}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiFolderPlus />
            <span>Convert to Project</span>
          </button>
          <div className="relative">
            <button
              onClick={() => document.getElementById('export-menu')?.classList.toggle('hidden')}
              className="flex items-center space-x-2 px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
            >
              <FiDownload />
              <span>Export</span>
            </button>
            <div id="export-menu" className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] rounded-lg shadow-xl hidden z-10">
              <button onClick={handleExportJSON} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-t-lg">JSON Format</button>
              <button onClick={handleExportCSV} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f3f4f6] dark:hover:bg-[#374151]">CSV Format</button>
              <button onClick={handlePrint} className="w-full px-4 py-2 text-left text-sm hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-b-lg">Print / PDF</button>
            </div>
          </div>
        </div>
        <button onClick={onBack} className="text-sm text-[#6b7280] hover:text-[#0A2F44]">
          ← Back to inputs
        </button>
      </div>

      {/* Recommended Option Card */}
      {selected && (
        <div className="bg-gradient-to-r from-[#0A2F44] to-[#2E7D32] rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FiTrendingUp className="text-2xl" />
              <h3 className="text-lg font-semibold">Recommended Option</h3>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Rank #{selected.rank}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-white/70 text-sm">Thickness</p>
              <p className="text-xl font-bold">{selected.thickness} mm</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Reinforcement</p>
              <p className="text-xl font-bold">φ{selected.barDiameter} @ {selected.spacing}mm</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Cost</p>
              <p className="text-xl font-bold">€{selected.cost}/m²</p>
            </div>
            <div>
              <p className="text-white/70 text-sm">Carbon</p>
              <p className="text-xl font-bold">{selected.carbon} kgCO₂/m²</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 flex justify-between">
            <div className="flex items-center space-x-2">
              <FiCheckCircle className="text-green-300" />
              <span className="text-sm">Utilisation: {(selected.utilisation * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <FiZap className="text-yellow-300" />
              <span className="text-sm">As prov: {selected.asProv} mm²/m</span>
            </div>
          </div>
        </div>
      )}

      {/* All Options Table */}
      <div className="bg-white dark:bg-[#1f2937] rounded-2xl shadow-xl border border-[#e5e7eb] dark:border-[#374151] overflow-hidden">
        <div className="p-4 border-b border-[#e5e7eb] dark:border-[#374151]">
          <h3 className="font-semibold text-[#02090d] dark:text-white">All Design Options</h3>
          <p className="text-sm text-[#6b7280]">{results.options.length} options found</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] dark:bg-[#374151]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Thickness</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Rebar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">As prov</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Carbon</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Utilisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#374151]">
              {results.options.map((opt) => (
                <tr 
                  key={opt.id} 
                  className={`cursor-pointer hover:bg-[#f9fafb] dark:hover:bg-[#374151] transition-colors ${selectedOption === opt.id ? 'bg-[#e6f0f5] dark:bg-[#1e3a4a]' : ''}`}
                  onClick={() => setSelectedOption(opt.id)}
                >
                  <td className="px-4 py-3">
                    {opt.rank === 1 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">★ Best</span>
                    ) : (
                      `#${opt.rank}`
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{opt.thickness} mm</td>
                  <td className="px-4 py-3">φ{opt.barDiameter} @ {opt.spacing}mm</td>
                  <td className="px-4 py-3">{opt.asProv} mm²/m</td>
                  <td className="px-4 py-3">€{opt.cost}</td>
                  <td className="px-4 py-3">{opt.carbon} kgCO₂/m²</td>
                  <td className="px-4 py-3">
                    <span className={opt.utilisation <= 1 ? 'text-green-600' : 'text-red-600'}>
                      {(opt.utilisation * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuickDesignResults;