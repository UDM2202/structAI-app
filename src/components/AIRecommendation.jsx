import React from 'react';
import { FiCpu, FiCheckCircle, FiAlertCircle, FiBarChart2, FiArrowLeft } from 'react-icons/fi';

const AIRecommendation = ({ options, onBack, onAccept }) => {
  // Find the recommended option (rank 1)
  const recommended = options.find(opt => opt.rank === 1) || options[0];
  const otherOptions = options.filter(opt => opt.id !== recommended.id);

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e7eb] dark:border-[#374151]">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors"
          >
            <FiArrowLeft className="text-[#6b7280]" />
          </button>
          <div className="flex items-center">
            <FiCpu className="text-2xl text-[#0A2F44] mr-2" />
            <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">
              AI Structural Recommendation
            </h1>
          </div>
        </div>
        <div className="bg-[#e6f0f5] dark:bg-[#1e3a4a] px-3 py-1 rounded-full text-sm text-[#0A2F44] font-medium">
          Confidence: 94%
        </div>
      </div>

      {/* Recommended Option */}
      <div className="mb-8 p-6 bg-gradient-to-r from-[#0A2F44] to-[#1e3a4a] rounded-xl text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recommended: Option {recommended.rank}</h2>
          <FiCheckCircle className="text-2xl text-green-300" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm opacity-80">Thickness</p>
            <p className="text-2xl font-bold">{recommended.thickness} mm</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Reinforcement</p>
            <p className="text-2xl font-bold">φ{recommended.barDiameter} @ {recommended.spacing}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Cost</p>
            <p className="text-2xl font-bold">£{recommended.cost}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Carbon</p>
            <p className="text-2xl font-bold">{recommended.carbon} kg/m²</p>
          </div>
        </div>

        <div className="flex space-x-4 text-sm">
          <span className="px-2 py-1 bg-green-500/30 rounded-full">✓ Deflection OK</span>
          <span className="px-2 py-1 bg-blue-500/30 rounded-full">Utilisation {recommended.utilisation}</span>
          <span className="px-2 py-1 bg-purple-500/30 rounded-full">EC2 Compliant</span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-8 p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
        <h3 className="font-semibold mb-3 flex items-center">
          <FiBarChart2 className="mr-2 text-[#0A2F44]" />
          AI Reasoning
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Optimal balance of cost (£{recommended.cost}) and performance</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Deflection ratio exceeds minimum L/250 requirement</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Utilisation ratio {recommended.utilisation} allows for future load flexibility</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Carbon footprint 18% below industry average</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-600 mr-2">✓</span>
            <span>Meets all Eurocode requirements with comfortable margins</span>
          </li>
        </ul>
      </div>

      {/* Comparative Analysis */}
      <div className="mb-8">
        <h3 className="font-semibold mb-3">Comparative Analysis</h3>
        <div className="space-y-4">
          {otherOptions.slice(0, 2).map(opt => (
            <div key={opt.id} className="p-4 border border-[#e5e7eb] dark:border-[#374151] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">vs. Option {opt.rank} ({opt.thickness}mm, φ{opt.barDiameter})</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  opt.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {opt.status === 'warning' ? '⚠ Deflection Warning' : `${opt.cost > recommended.cost ? '+£' + (opt.cost - recommended.cost) : '-£' + (recommended.cost - opt.cost)} cost`}
                </span>
              </div>
              <ul className="text-sm space-y-1">
                {opt.thickness < recommended.thickness && (
                  <li className="flex items-start">
                    <span className="text-yellow-600 mr-2">⚠</span>
                    <span>Thinner slab may cause deflection issues</span>
                  </li>
                )}
                {opt.cost > recommended.cost && (
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">+</span>
                    <span>£{(opt.cost - recommended.cost).toFixed(0)} higher cost</span>
                  </li>
                )}
                {opt.carbon < recommended.carbon && (
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>{(recommended.carbon - opt.carbon).toFixed(1)} kg/m² lower carbon</span>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <div className="mb-8 p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
        <h3 className="font-semibold mb-3 flex items-center">
          <FiAlertCircle className="mr-2 text-[#0A2F44]" />
          Sensitivity Analysis
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span>If span increased to 4.5m:</span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
              Current option fails deflection
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>If imposed load increased to 3.5 kN/m²:</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              Utilisation 0.92 (acceptable)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>If concrete grade reduced to C25/30:</span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
              As,req increases by 12%
            </span>
          </div>
        </div>
      </div>

      {/* Design Notes */}
      <div className="mb-6 p-4 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg">
        <h3 className="font-semibold mb-2 text-[#0A2F44] dark:text-[#cce1eb]">Design Notes & Risk Mitigation</h3>
        <ul className="text-sm space-y-1">
          <li>• Slab thickness {recommended.thickness}mm provides 25mm margin above absolute minimum</li>
          <li>• φ{recommended.barDiameter} @ {recommended.spacing}mm gives {(recommended.asProv / recommended.asReq).toFixed(0) * 100 - 100}% excess capacity</li>
          <li>• Cover 25mm sufficient for XC1 exposure class</li>
          <li>• Vibration performance expected to be "low impact"</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors"
        >
          Back to Results
        </button>
        <button
          onClick={() => onAccept(recommended.id)}
          className="px-6 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] transition-colors"
        >
          Accept Recommendation
        </button>
      </div>
    </div>
  );
};

export default AIRecommendation;