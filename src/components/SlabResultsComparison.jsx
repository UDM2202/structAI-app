import React, { useState } from 'react';
import { FiBarChart2, FiDownload, FiEye, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

const SlabResultsComparison = ({ options, onViewReport, onExport }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [sortBy, setSortBy] = useState('rank');

  // Mock data based on the calculations from your images
  const mockOptions = options || [
    {
      id: 1,
      rank: 1,
      thickness: 175,
      barDiameter: 10,
      spacing: 100,
      asProv: 785,
      cost: 1240,
      carbon: 53.8,
      utilisation: 0.73,
      deflection: 'L/384',
      status: 'optimal',
      recommended: true
    },
    {
      id: 2,
      rank: 2,
      thickness: 175,
      barDiameter: 10,
      spacing: 125,
      asProv: 628,
      cost: 1180,
      carbon: 51.2,
      utilisation: 0.86,
      deflection: 'L/320',
      status: 'pass',
      recommended: false
    },
    {
      id: 3,
      rank: 3,
      thickness: 160,
      barDiameter: 10,
      spacing: 100,
      asProv: 785,
      cost: 1150,
      carbon: 49.2,
      utilisation: 0.84,
      deflection: 'L/210',
      status: 'warning',
      recommended: false
    },
    {
      id: 4,
      rank: 4,
      thickness: 160,
      barDiameter: 12,
      spacing: 125,
      asProv: 905,
      cost: 1320,
      carbon: 58.5,
      utilisation: 0.62,
      deflection: 'L/450',
      status: 'overdesigned',
      recommended: false
    }
  ];

  const toggleOption = (id) => {
    setSelectedOptions(prev =>
      prev.includes(id)
        ? prev.filter(optId => optId !== id)
        : [...prev, id]
    );
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'optimal':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FiCheckCircle className="mr-1" /> Best Choice
          </span>
        );
      case 'pass':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            PASS
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FiAlertTriangle className="mr-1" /> Deflection Warning
          </span>
        );
      case 'overdesigned':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Over-designed
          </span>
        );
      default:
        return null;
    }
  };

  const sortedOptions = [...mockOptions].sort((a, b) => {
    if (sortBy === 'rank') return a.rank - b.rank;
    if (sortBy === 'cost') return a.cost - b.cost;
    if (sortBy === 'carbon') return a.carbon - b.carbon;
    if (sortBy === 'thickness') return a.thickness - b.thickness;
    return 0;
  });

  // Calculate max cost for chart scaling
  const maxCost = Math.max(...mockOptions.map(opt => opt.cost));

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#02090d] dark:text-white">
            Optimisation Results
          </h2>
          <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mt-1">
            {mockOptions.length} options generated based on your inputs
          </p>
        </div>
        
        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-[#6b7280]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#374151] text-sm"
          >
            <option value="rank">Rank</option>
            <option value="cost">Cost</option>
            <option value="carbon">Carbon</option>
            <option value="thickness">Thickness</option>
          </select>
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
              <th className="text-left py-3 px-2 text-xs font-semibold text-[#6b7280] uppercase">As prov</th>
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
                className={`border-b border-[#f3f4f6] dark:border-[#374151] hover:bg-[#f9fafb] dark:hover:bg-[#374151] transition-colors ${
                  opt.recommended ? 'bg-[#e6f0f5] dark:bg-[#1e3a4a]' : ''
                }`}
              >
                <td className="py-4 px-2">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(opt.id)}
                    onChange={() => toggleOption(opt.id)}
                    className="w-4 h-4 text-[#0A2F44] rounded"
                  />
                </td>
                <td className="py-4 px-2">
                  <span className={`font-bold ${
                    opt.rank === 1 ? 'text-yellow-600' : 'text-[#6b7280]'
                  }`}>
                    #{opt.rank}
                  </span>
                </td>
                <td className="py-4 px-2">
                  <span className="font-medium">{opt.thickness} mm</span>
                </td>
                <td className="py-4 px-2">
                  <span className="font-mono">φ{opt.barDiameter} @ {opt.spacing}</span>
                </td>
                <td className="py-4 px-2">
                  <span className="font-medium">{opt.asProv} mm²/m</span>
                </td>
                <td className="py-4 px-2">
                  <span className="font-bold text-[#0A2F44]">£{opt.cost.toLocaleString()}</span>
                </td>
                <td className="py-4 px-2">
                  <span>{opt.carbon} kg/m²</span>
                </td>
                <td className="py-4 px-2">
                  {getStatusBadge(opt.status)}
                </td>
                <td className="py-4 px-2">
                  <button
                    onClick={() => onViewReport?.(opt.id)}
                    className="text-[#0A2F44] hover:underline text-sm"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost Comparison Chart */}
      <div className="mb-8 p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
        <h3 className="text-sm font-semibold text-[#02090d] dark:text-white mb-4 flex items-center">
          <FiBarChart2 className="mr-2" /> Cost Comparison
        </h3>
        <div className="space-y-3">
          {sortedOptions.map((opt) => (
            <div key={`chart-${opt.id}`} className="flex items-center space-x-3">
              <span className="text-xs font-medium w-16">Opt {opt.rank}</span>
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

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={() => onExport?.('pdf')}
          className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors flex items-center"
        >
          <FiDownload className="mr-2" /> Export PDF
        </button>
        <button
          onClick={() => onExport?.('excel')}
          className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
        >
          Export Excel
        </button>
        {selectedOptions.length > 0 && (
          <button
            onClick={() => onViewReport?.(selectedOptions)}
            className="px-4 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors"
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
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] mt-1">
              This option provides the best balance of cost, safety, and serviceability based on your inputs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlabResultsComparison;