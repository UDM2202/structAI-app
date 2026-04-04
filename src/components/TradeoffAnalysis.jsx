import React, { useState } from 'react';
import { FiArrowLeft, FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const TradeoffAnalysis = ({ options, onBack, onSelectOption }) => {
  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id);

  if (!options || options.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-8 text-center">
        <p className="text-[#6b7280] dark:text-[#9ca3af]">No options selected for comparison</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] cursor-pointer"
        >
          Back
        </button>
      </div>
    );
  }

  const getRiskLevel = (option) => {
    if (option.status === 'warning') return 'High';
    if (option.status === 'optimal') return 'Low';
    return 'Medium';
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'High': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'Low': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
      {/* Header */}
      <div className="flex items-center mb-6 pb-4 border-b border-[#e5e7eb] dark:border-[#374151]">
        <button
          onClick={onBack}
          className="mr-4 p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors cursor-pointer"
        >
          <FiArrowLeft className="text-[#6b7280] dark:text-[#9ca3af]" />
        </button>
        <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">
          Trade-off Analysis
        </h1>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {options.map((opt) => (
          <div 
            key={opt.id}
            className={`p-6 rounded-xl border-2 transition-all ${
              selectedOptionId === opt.id
                ? 'border-[#0A2F44] dark:border-[#66a4c2] shadow-lg'
                : 'border-[#e5e7eb] dark:border-[#374151]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#02090d] dark:text-white">Option {opt.rank}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(getRiskLevel(opt))}`}>
                {getRiskLevel(opt)} Risk
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Thickness</span>
                <span className="font-bold text-[#02090d] dark:text-white">{opt.thickness} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Reinforcement</span>
                <span className="font-bold text-[#02090d] dark:text-white">φ{opt.barDiameter} @ {opt.spacing}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">As prov</span>
                <span className="font-bold text-[#02090d] dark:text-white">{opt.asProv} mm²/m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Cost</span>
                <span className="font-bold text-[#0A2F44] dark:text-[#66a4c2]">£{opt.cost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Carbon</span>
                <span className="font-bold text-[#02090d] dark:text-white">{opt.carbon} kg/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Deflection</span>
                <span className={`font-bold ${
                  opt.deflection === 'L/210' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {opt.deflection}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="font-semibold text-sm text-[#02090d] dark:text-white">Advantages</h3>
              <ul className="text-sm space-y-1">
                {opt.thickness === 175 && (
                  <li className="flex items-start">
                    <FiCheckCircle className="text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-[#02090d] dark:text-white">Better deflection control</span>
                  </li>
                )}
                {opt.thickness === 160 && (
                  <li className="flex items-start">
                    <FiCheckCircle className="text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-[#02090d] dark:text-white">Lower material cost</span>
                  </li>
                )}
                {opt.barDiameter === 12 && (
                  <li className="flex items-start">
                    <FiCheckCircle className="text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-[#02090d] dark:text-white">Larger bars reduce labour</span>
                  </li>
                )}
                {opt.barDiameter === 10 && opt.spacing === 100 && (
                  <li className="flex items-start">
                    <FiCheckCircle className="text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-[#02090d] dark:text-white">Better crack control</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="font-semibold text-sm text-[#02090d] dark:text-white">Disadvantages</h3>
              <ul className="text-sm space-y-1">
                {opt.status === 'warning' && (
                  <li className="flex items-start">
                    <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-[#02090d] dark:text-white">Deflection failure risk (23% probability)</span>
                  </li>
                )}
                {opt.thickness === 175 && opt.rank !== 1 && (
                  <li className="flex items-start">
                    <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-[#02090d] dark:text-white">Higher cost than thinner options</span>
                  </li>
                )}
                {opt.barDiameter === 12 && opt.spacing === 125 && (
                  <li className="flex items-start">
                    <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-[#02090d] dark:text-white">Wider spacing may affect crack control</span>
                  </li>
                )}
              </ul>
            </div>

            <button
              onClick={() => setSelectedOptionId(opt.id)}
              className={`w-full py-2 rounded-lg transition-colors cursor-pointer ${
                selectedOptionId === opt.id
                  ? 'bg-[#0A2F44] dark:bg-[#0A2F44] text-white'
                  : 'border border-[#e5e7eb] dark:border-[#374151] text-[#02090d] dark:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#374151]'
              }`}
            >
              {selectedOptionId === opt.id ? 'Selected' : 'Select to Compare'}
            </button>
          </div>
        ))}

        {/* If only one option, show placeholder for second */}
        {options.length === 1 && (
          <div className="p-6 rounded-xl border-2 border-dashed border-[#e5e7eb] dark:border-[#374151] flex items-center justify-center">
            <p className="text-[#6b7280] dark:text-[#9ca3af] text-center">
              Select another option to compare
            </p>
          </div>
        )}
      </div>

      {/* Recommendation */}
      <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg mb-6">
        <div className="flex items-start">
          <FiInfo className="text-[#0A2F44] dark:text-[#66a4c2] text-xl mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1 text-[#02090d] dark:text-white">Recommendation</h3>
            <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
              {options.find(o => o.id === selectedOptionId)?.thickness === 175 
                ? "Option 1 (175mm) is recommended despite higher cost. The 160mm option fails deflection checks and poses unacceptable serviceability risks."
                : "Consider Option 1 for better long-term performance, though Option 3 may be suitable for non-critical areas."}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
        >
          Back to Results
        </button>
        <button
          onClick={() => onSelectOption(selectedOptionId)}
          className="px-6 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors cursor-pointer"
        >
          View Detailed Report
        </button>
      </div>
    </div>
  );
};

export default TradeoffAnalysis;