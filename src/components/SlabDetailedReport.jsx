import React from 'react';
import { FiDownload, FiPrinter, FiArrowLeft, FiCheckCircle, FiInfo } from 'react-icons/fi';

const SlabDetailedReport = ({ option, onBack, onExport, slabArea }) => {
  // If no option is provided, show error
  if (!option) {
    return (
      <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg p-12 text-center">
        <p className="text-red-500 dark:text-red-400">No option data available.</p>
        <button 
          onClick={onBack} 
          className="mt-4 px-4 py-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] cursor-pointer"
        >
          Back to Results
        </button>
      </div>
    );
  }

  // Set default values with fallbacks
  const data = {
    id: option.id || 1,
    rank: option.rank || 1,
    thickness: option.thickness || 175,
    barDiameter: option.barDiameter || 10,
    spacing: option.spacing || 150,
    asReq: option.asReq || 575,
    asProv: option.asProv || 785,
    span: 4.0,
    concreteGrade: 'C30/37',
    steelGrade: 'B500',
    cover: 25,
    d: (option.thickness || 175) - 25 - (option.barDiameter || 10) / 2,
    fck: 30,
    fyk: 500,
    fyd: 434.8,
    fctm: 2.9,
    gkSelf: ((option.thickness || 175) / 1000) * 25,
    gkFinishes: 1.0,
    gkService: 1.2,
    gkPartition: 1.1,
    gkEquipment: 2.0,
    gkTotal: 9.68,
    qkLead: 2.0,
    qkAcc: 1.3,
    psi0: 0.6,
    wEd: 17.24,
    mEd: 34.48,
    z: 130.5,
    asMin: 219,
    utilisation: option.utilisation || 0.73,
    deflectionActual: 27.6,
    deflectionLimit: 30.5,
    costConcrete: ((option.thickness || 175) / 1000) * 170,
    costSteel: (option.asProv || 785) / 100 * 7.85 * 1.3,
    costFormwork: 50.0,
    costTotal: ((option.cost || 1240) / (slabArea || 100)),
    carbonConcrete: ((option.thickness || 175) / 1000) * 240,
    carbonSteel: (option.asProv || 785) / 100 * 7.85 * 1.5,
    carbonTotal: option.carbon || 53.8,
    costWeight: 15,
    carbonWeight: 30,
    materialWeight: 20
  };

  // Calculate total cost using slab area
  const slabAreaValue = slabArea || 100;
  const totalCost = (data.costTotal || data.cost) * slabAreaValue;

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e7eb] dark:border-[#374151]">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors cursor-pointer"
          >
            <FiArrowLeft className="text-[#6b7280]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#02090d] dark:text-white">
              Structural Design Report
            </h1>
            <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
              EN 1992-1-1 (Eurocode 2) + UK National Annex
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onExport?.('pdf')}
            className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors flex items-center cursor-pointer"
          >
            <FiDownload className="mr-2" /> PDF
          </button>
          <button
            onClick={() => onExport?.('print')}
            className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors flex items-center cursor-pointer"
          >
            <FiPrinter className="mr-2" /> Print
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
        <div>
          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Project</p>
          <p className="font-medium text-[#02090d] dark:text-white">New Office Building</p>
        </div>
        <div>
          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Location</p>
          <p className="font-medium text-[#02090d] dark:text-white">London, UK</p>
        </div>
        <div>
          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Date</p>
          <p className="font-medium text-[#02090d] dark:text-white">{new Date().toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Span</p>
          <p className="font-medium text-[#02090d] dark:text-white">{data.span} m</p>
        </div>
      </div>

      {/* Selected Option Banner */}
      <div className="mb-6 p-4 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg flex items-center">
        <FiCheckCircle className="text-[#0A2F44] text-2xl mr-3" />
        <div>
          <p className="font-semibold text-[#02090d] dark:text-white">
            OPTION {data.rank}: {data.thickness}mm slab • φ{data.barDiameter} @ {data.spacing}mm
          </p>
          <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
            Ranked #{data.rank} • Utilisation {data.utilisation}
          </p>
        </div>
      </div>

      {/* Section Properties */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Section Properties</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Overall depth, h</p>
            <p className="text-lg font-bold text-[#02090d] dark:text-white">{data.thickness} mm</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Cover, c_nom</p>
            <p className="text-lg font-bold text-[#02090d] dark:text-white">{data.cover} mm</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Bar diameter, φ</p>
            <p className="text-lg font-bold text-[#02090d] dark:text-white">{data.barDiameter} mm</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Effective depth, d</p>
            <p className="text-lg font-bold text-[#02090d] dark:text-white">{data.d.toFixed(1)} mm</p>
          </div>
        </div>
      </div>

      {/* Material Properties */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Material Properties</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Concrete grade</p>
            <p className="font-bold text-[#02090d] dark:text-white">{data.concreteGrade}</p>
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fck = {data.fck} MPa</p>
            <p className="text-xs text-[#0A2F44] dark:text-[#66a4c2]">fctm = {data.fctm} MPa</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Reinforcement</p>
            <p className="font-bold text-[#02090d] dark:text-white">{data.steelGrade}</p>
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fyk = {data.fyk} MPa</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fyd</p>
            <p className="font-bold text-[#02090d] dark:text-white">{data.fyd} MPa</p>
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fyk/γs = {data.fyk}/1.15</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fctm</p>
            <p className="font-bold text-[#02090d] dark:text-white">{data.fctm} MPa</p>
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Table 3.1</p>
          </div>
        </div>
      </div>

      {/* Loading Summary */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Loading Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <h3 className="font-medium text-[#02090d] dark:text-white mb-2">Permanent Actions (Gk)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Self weight (25×{data.thickness/1000})</span>
                <span className="text-[#02090d] dark:text-white">{data.gkSelf.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Finishes</span>
                <span className="text-[#02090d] dark:text-white">{data.gkFinishes.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Service allowance</span>
                <span className="text-[#02090d] dark:text-white">{data.gkService.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Partition load</span>
                <span className="text-[#02090d] dark:text-white">{data.gkPartition.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Equipment</span>
                <span className="text-[#02090d] dark:text-white">{data.gkEquipment.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-1 mt-1">
                <span className="text-[#02090d] dark:text-white">TOTAL Gk</span>
                <span className="text-[#02090d] dark:text-white">{data.gkTotal.toFixed(2)} kN/m²</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <h3 className="font-medium text-[#02090d] dark:text-white mb-2">Variable Actions (Qk)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Leading: Imposed (qk)</span>
                <span className="text-[#02090d] dark:text-white">{data.qkLead.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Accompanying: Wind (wk)</span>
                <span className="text-[#02090d] dark:text-white">{data.qkAcc.toFixed(2)} kN/m² × ψ₀={data.psi0}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-[#6b7280] dark:text-[#9ca3af]">Reduced wind</span>
                <span className="text-[#02090d] dark:text-white">{(1.5 * data.psi0 * data.qkAcc).toFixed(2)} kN/m²</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ULS Design */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Ultimate Limit State (ULS)</h2>
        <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Design load: wEd = 1.35Gk + 1.5Qk,lead + 1.5ψ₀Qk,acc</span>
              <span className="font-mono text-[#02090d] dark:text-white">
                1.35×{data.gkTotal.toFixed(2)} + 1.5×{data.qkLead.toFixed(2)} + {(1.5 * data.psi0 * data.qkAcc).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-[#02090d] dark:text-white">wEd</span>
              <span className="text-[#02090d] dark:text-white">= {data.wEd.toFixed(2)} kN/m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Design moment: MEd = wEd × L²/8</span>
              <span className="font-mono text-[#02090d] dark:text-white">{data.wEd.toFixed(2)} × {data.span}² / 8</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-[#02090d] dark:text-white">MEd</span>
              <span className="text-[#02090d] dark:text-white">= {data.mEd.toFixed(2)} kNm/m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flexural Design */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Flexural Design</h2>
        <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">k = MEd / (fck × b × d²)</span>
              <span className="font-mono text-[#02090d] dark:text-white">{data.mEd.toFixed(2)}×10⁶ / (30 × 1000 × {data.d.toFixed(1)}²) = {((data.mEd * 1000000) / (30 * 1000 * Math.pow(data.d, 2))).toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">z = 0.9d (UK National Annex)</span>
              <span className="font-mono text-[#02090d] dark:text-white">{data.z.toFixed(1)} mm</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-[#02090d] dark:text-white">As,req = MEd / (fyd × z)</span>
              <span className="font-mono text-[#02090d] dark:text-white">{data.mEd.toFixed(2)}×10⁶ / (434.8 × {data.z.toFixed(1)}) = {data.asReq} mm²/m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">As,min = max(0.26×fctm/fyk×b×d, 0.0013×b×d)</span>
              <span className="font-mono text-[#02090d] dark:text-white">max({(0.26 * data.fctm / data.fyk * 1000 * data.d).toFixed(0)}, {(0.0013 * 1000 * data.d).toFixed(0)}) = {data.asMin} mm²/m</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-2 mt-2">
              <span className="text-[#02090d] dark:text-white">PROVIDED: φ{data.barDiameter} @ {data.spacing} mm</span>
              <span className="font-mono text-[#02090d] dark:text-white">{data.asProv} mm²/m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Utilisation</span>
              <span className={`font-mono ${data.utilisation <= 1.0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.asReq}/{data.asProv} = {data.utilisation}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost & Carbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
          <h3 className="font-semibold text-[#02090d] dark:text-white mb-3">Cost Analysis</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Concrete ({data.thickness}mm)</span>
              <span className="text-[#02090d] dark:text-white">£{data.costConcrete.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Reinforcement ({Math.round(data.asProv/100)} kg/m²)</span>
              <span className="text-[#02090d] dark:text-white">£{data.costSteel.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Formwork</span>
              <span className="text-[#02090d] dark:text-white">£{data.costFormwork.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-1 mt-1">
              <span className="text-[#02090d] dark:text-white">TOTAL</span>
              <span className="text-[#02090d] dark:text-white">£{data.costTotal.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#0A2F44] border-t border-[#e5e7eb] pt-2 mt-2">
              <span className="text-[#02090d] dark:text-white">Slab area: {slabAreaValue} m²</span>
              <span className="text-[#02090d] dark:text-white">Total: £{totalCost.toFixed(0)}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
          <h3 className="font-semibold text-[#02090d] dark:text-white mb-3">Carbon Estimate</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Concrete</span>
              <span className="text-[#02090d] dark:text-white">{data.carbonConcrete.toFixed(1)} kgCO₂/m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Reinforcement</span>
              <span className="text-[#02090d] dark:text-white">{data.carbonSteel.toFixed(1)} kgCO₂/m²</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-1 mt-1">
              <span className="text-[#02090d] dark:text-white">TOTAL</span>
              <span className="text-[#02090d] dark:text-white">{data.carbonTotal.toFixed(1)} kgCO₂/m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Eurocode References */}
      <div className="p-3 bg-[#f3f4f6] dark:bg-[#374151] rounded-lg text-xs text-[#6b7280] dark:text-[#9ca3af]">
        <p>Design carried out in accordance with:</p>
        <ul className="list-disc list-inside mt-1">
          <li>EN 1990: Eurocode - Basis of structural design</li>
          <li>EN 1991-1-1: Actions on structures - Densities, self-weight, imposed loads</li>
          <li>EN 1992-1-1: Eurocode 2 - Design of concrete structures</li>
          <li>UK National Annex to EN 1992-1-1 (z = 0.9d)</li>
        </ul>
      </div>
    </div>
  );
};

export default SlabDetailedReport;