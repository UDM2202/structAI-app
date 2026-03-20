import React, { useState } from 'react';
import { FiBarChart2, FiDownload, FiEye, FiCheckCircle, FiAlertTriangle, FiXCircle, FiChevronDown } from 'react-icons/fi';

const SlabResultsComparison = ({ options, onViewReport, onCompare, onExport, onBackToInput }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [sortBy, setSortBy] = useState('rank');

  const toggleOption = (id) => {
    setSelectedOptions(prev =>
      prev.includes(id)
        ? prev.filter(optId => optId !== id)
        : [...prev, id]
    );
  };

  const getStatusBadge = (status, warningMessage) => {
    switch(status) {
      case 'optimal':
        return (
          <div className="relative group">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <FiCheckCircle className="mr-1" /> Optimal
            </span>
            {warningMessage && (
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                {warningMessage}
              </div>
            )}
          </div>
        );
      case 'pass':
        return (
          <div className="relative group">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              PASS
            </span>
            {warningMessage && (
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                {warningMessage}
              </div>
            )}
          </div>
        );
      case 'warning':
        return (
          <div className="relative group">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 cursor-help">
              <FiAlertTriangle className="mr-1" /> Warning
            </span>
            {warningMessage && (
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                {warningMessage}
              </div>
            )}
          </div>
        );
      case 'fail':
        return (
          <div className="relative group">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-help">
              <FiXCircle className="mr-1" /> FAIL
            </span>
            {warningMessage && (
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                {warningMessage}
              </div>
            )}
          </div>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  const getSortOptions = () => {
    switch(sortBy) {
      case 'rank':
        return [...options].sort((a, b) => a.rank - b.rank);
      case 'cost':
        return [...options].sort((a, b) => a.cost - b.cost);
      case 'carbon':
        return [...options].sort((a, b) => a.carbon - b.carbon);
      case 'thickness':
        return [...options].sort((a, b) => a.thickness - b.thickness);
      case 'utilisation':
        return [...options].sort((a, b) => parseFloat(a.utilisation) - parseFloat(b.utilisation));
      default:
        return options;
    }
  };

  const sortedOptions = getSortOptions();
  const maxCost = Math.max(...options.map(opt => opt.cost));

  if (!options || options.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-[#6b7280] dark:text-[#9ca3af] mb-4">No valid options found. Try adjusting your parameters.</p>
        <button 
          onClick={onBackToInput}
          className="px-4 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] cursor-pointer"
        >
          Back to Input
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#02090d] dark:text-white">
            Optimisation Results
          </h2>
          <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mt-1">
            {options.length} options generated based on your inputs
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Sort by:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none px-4 py-2 pr-8 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-sm text-[#02090d] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2F44] cursor-pointer"
            >
              <option value="rank">Rank</option>
              <option value="cost">Cost (Low to High)</option>
              <option value="carbon">Carbon (Low to High)</option>
              <option value="thickness">Thickness</option>
              <option value="utilisation">Utilisation</option>
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <FiChevronDown className="text-[#6b7280] dark:text-[#9ca3af]" />
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#e5e7eb] dark:border-[#374151]">
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase w-12"></th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">Rank</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">Thickness</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">Reinforcement</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">As req</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">As prov</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">Utilisation</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">Cost (£)</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">Carbon</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">Status</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase"></th>
             </tr>
          </thead>
          <tbody>
            {sortedOptions.map((opt) => (
              <tr 
                key={opt.id}
                onClick={() => onViewReport(opt.id)}
                className={`border-b border-[#f3f4f6] dark:border-[#374151] hover:bg-[#f9fafb] dark:hover:bg-[#374151] transition-colors cursor-pointer ${
                  opt.recommended ? 'bg-[#e6f0f5] dark:bg-[#1e3a4a]' : ''
                } ${opt.status === 'fail' ? 'opacity-60 hover:opacity-100' : ''}`}
              >
                <td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(opt.id)}
                    onChange={() => toggleOption(opt.id)}
                    className="w-4 h-4 text-[#0A2F44] rounded focus:ring-[#0A2F44] cursor-pointer"
                    disabled={opt.status === 'fail'}
                  />
                 </td>
                <td className="py-4 px-2">
                  <span className={`font-bold ${
                    opt.rank === 1 && opt.status !== 'fail' ? 'text-yellow-600' : 'text-[#6b7280] dark:text-[#9ca3af]'
                  }`}>
                    #{opt.rank}
                  </span>
                 </td>
                <td className="py-4 px-2">
                  <span className="font-medium text-[#02090d] dark:text-white">{opt.thickness} mm</span>
                 </td>
                <td className="py-4 px-2">
                  <span className="font-mono text-[#02090d] dark:text-white">φ{opt.barDiameter} @ {opt.spacing}</span>
                 </td>
                <td className="py-4 px-2">
                  <span className="font-medium text-[#02090d] dark:text-white">{opt.asReq} mm²/m</span>
                 </td>
                <td className="py-4 px-2">
                  <span className="font-medium text-[#02090d] dark:text-white">{opt.asProv} mm²/m</span>
                 </td>
                <td className="py-4 px-2">
                  <span className={`font-mono ${
                    parseFloat(opt.utilisation) > 1.0 ? 'text-red-600' : 
                    parseFloat(opt.utilisation) > 0.9 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {opt.utilisation}
                  </span>
                 </td>
                <td className="py-4 px-2">
                  <span className="font-bold text-[#0A2F44] dark:text-[#66a4c2]">£{opt.cost.toLocaleString()}</span>
                 </td>
                <td className="py-4 px-2">
                  <span className="text-[#02090d] dark:text-white">{opt.carbon} kg</span>
                 </td>
                <td className="py-4 px-2">
                  {getStatusBadge(opt.status, opt.warningMessage)}
                 </td>
                <td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onViewReport(opt.id)}
                    className="text-[#0A2F44] dark:text-[#66a4c2] hover:underline text-sm font-medium cursor-pointer"
                  >
                    View Details
                  </button>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost Comparison Chart */}
      {options.filter(opt => opt.status !== 'fail').length > 0 && (
        <div className="mb-8 p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
          <h3 className="text-sm font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
            <FiBarChart2 className="mr-2" /> Cost Comparison (Valid Options Only)
          </h3>
          <div className="space-y-3">
            {sortedOptions.filter(opt => opt.status !== 'fail').map((opt) => (
              <div key={`chart-${opt.id}`} className="flex items-center space-x-3">
                <span className="text-xs font-medium w-16 text-[#02090d] dark:text-white">Opt {opt.rank}</span>
                <div className="flex-1 h-6 bg-[#e5e7eb] dark:bg-[#4b5563] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#0A2F44] to-[#2E7D32] flex items-center justify-end px-2 text-xs text-white"
                    style={{ width: `${(opt.cost / maxCost) * 100}%` }}
                  >
                    £{opt.cost}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={() => onExport?.('pdf')}
          className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors flex items-center cursor-pointer"
        >
          <FiDownload className="mr-2" /> Export PDF
        </button>
        {selectedOptions.length > 0 && (
          <button
            onClick={() => onCompare(selectedOptions)}
            className="px-4 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors cursor-pointer"
          >
            Compare Selected ({selectedOptions.length})
          </button>
        )}
      </div>

      {/* AI Recommendation Note */}
      {sortedOptions.find(opt => opt.recommended) && (
        <div className="mt-4 p-3 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg flex items-start">
          <FiCheckCircle className="text-[#0A2F44] text-xl mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#02090d] dark:text-white">
              AI Recommendation: Option {sortedOptions.find(opt => opt.recommended).rank}
            </p>
          </div>
        </div>
      )}

      {/* Legend for Status */}
      <div className="mt-4 pt-4 border-t border-[#e5e7eb] dark:border-[#374151]">
        <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] flex flex-wrap gap-3">
          <span className="inline-flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span> Optimal (≤70% capacity)</span>
          <span className="inline-flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span> PASS (≤100% capacity)</span>
          <span className="inline-flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span> Warning (100-150% capacity)</span>
          <span className="inline-flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span> FAIL (>150% capacity)</span>
        </p>
      </div>
    </div>
  );
};

export default SlabResultsComparison;