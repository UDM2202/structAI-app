import React from 'react';
import { FiDownload, FiPrinter, FiArrowLeft, FiCheckCircle, FiInfo } from 'react-icons/fi';

const SlabDetailedReport = ({ option, onBack, onExport }) => {
  // Mock data for Option 1
  const data = option || {
    id: 1,
    rank: 1,
    thickness: 175,
    barDiameter: 10,
    spacing: 100,
    asProv: 785,
    span: 4.0,
    concreteGrade: 'C30/37',
    steelGrade: 'B500',
    cover: 25,
    d: 145,
    fck: 30,
    fyk: 500,
    fyd: 434.8,
    fctm: 2.9,
    gkSelf: 4.38,
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
    k: 0.055,
    z: 137.8,
    asReq: 575,
    asMin: 219,
    utilisation: 0.73,
    deflectionActual: 27.6,
    deflectionLimit: 30.5,
    costConcrete: 29.75,
    costSteel: 10.21,
    costFormwork: 50.0,
    costTotal: 89.96,
    carbonConcrete: 42.0,
    carbonSteel: 11.8,
    carbonTotal: 53.8
  };

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e7eb] dark:border-[#374151]">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg transition-colors"
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
            className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors flex items-center"
          >
            <FiDownload className="mr-2" /> PDF
          </button>
          <button
            onClick={() => onExport?.('print')}
            className="px-4 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors flex items-center"
          >
            <FiPrinter className="mr-2" /> Print
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
        <div>
          <p className="text-xs text-[#6b7280]">Project</p>
          <p className="font-medium">New Office Building</p>
        </div>
        <div>
          <p className="text-xs text-[#6b7280]">Location</p>
          <p className="font-medium">London, UK</p>
        </div>
        <div>
          <p className="text-xs text-[#6b7280]">Date</p>
          <p className="font-medium">{new Date().toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-[#6b7280]">Span</p>
          <p className="font-medium">{data.span} m</p>
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
            Ranked #{data.rank} • AI Recommended • Utilisation {data.utilisation}
          </p>
        </div>
      </div>

      {/* Section Properties */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Section Properties</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280]">Overall depth, h</p>
            <p className="text-lg font-bold">{data.thickness} mm</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280]">Cover, c_nom</p>
            <p className="text-lg font-bold">{data.cover} mm</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280]">Bar diameter, φ</p>
            <p className="text-lg font-bold">{data.barDiameter} mm</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280]">Effective depth, d</p>
            <p className="text-lg font-bold">{data.d} mm</p>
          </div>
        </div>
      </div>

      {/* Material Properties */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Material Properties</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280]">Concrete grade</p>
            <p className="font-bold">{data.concreteGrade}</p>
            <p className="text-xs">fck = {data.fck} MPa</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280]">Reinforcement</p>
            <p className="font-bold">{data.steelGrade}</p>
            <p className="text-xs">fyk = {data.fyk} MPa</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280]">fyd</p>
            <p className="font-bold">{data.fyd} MPa</p>
            <p className="text-xs">fyk/γs = {data.fyk}/1.15</p>
          </div>
          <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <p className="text-xs text-[#6b7280]">fctm</p>
            <p className="font-bold">{data.fctm} MPa</p>
            <p className="text-xs">Table 3.1</p>
          </div>
        </div>
      </div>

      {/* Loading Summary */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Loading Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <h3 className="font-medium mb-2">Permanent Actions (Gk)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Self weight (25×{data.thickness/1000})</span>
                <span>{data.gkSelf.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span>Finishes</span>
                <span>{data.gkFinishes.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span>Service allowance</span>
                <span>{data.gkService.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span>Partition load</span>
                <span>{data.gkPartition.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span>Equipment</span>
                <span>{data.gkEquipment.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-1 mt-1">
                <span>TOTAL Gk</span>
                <span>{data.gkTotal.toFixed(2)} kN/m²</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
            <h3 className="font-medium mb-2">Variable Actions (Qk)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Leading: Imposed (qk)</span>
                <span>{data.qkLead.toFixed(2)} kN/m²</span>
              </div>
              <div className="flex justify-between">
                <span>Accompanying: Wind (wk)</span>
                <span>{data.qkAcc.toFixed(2)} kN/m² × ψ₀={data.psi0}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Reduced wind</span>
                <span>{(1.5 * data.psi0 * data.qkAcc).toFixed(2)} kN/m²</span>
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
              <span>Design load: wEd = 1.35Gk + 1.5Qk,lead + 1.5ψ₀Qk,acc</span>
              <span className="font-mono">
                1.35×{data.gkTotal.toFixed(2)} + 1.5×{data.qkLead.toFixed(2)} + {(1.5 * data.psi0 * data.qkAcc).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>wEd</span>
              <span>= {data.wEd.toFixed(2)} kN/m²</span>
            </div>
            <div className="flex justify-between">
              <span>Design moment: MEd = wEd × L²/8</span>
              <span className="font-mono">{data.wEd.toFixed(2)} × {data.span}² / 8</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>MEd</span>
              <span>= {data.mEd.toFixed(2)} kNm/m</span>
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
              <span>k = MEd / (fck × b × d²)</span>
              <span className="font-mono">{data.mEd.toFixed(2)}×10⁶ / (30 × 1000 × {data.d}²) = {data.k.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>z = d × [0.5 + √(0.25 - k/1.134)]</span>
              <span className="font-mono">{data.d} × [0.5 + √(0.25 - {data.k.toFixed(3)}/1.134)] = {data.z.toFixed(1)} mm</span>
            </div>
            <div className="flex justify-between">
              <span>Check: z ≤ 0.95d</span>
              <span className={data.z <= 0.95 * data.d ? 'text-green-600' : 'text-red-600'}>
                {data.z.toFixed(1)} ≤ {(0.95 * data.d).toFixed(1)} ✓
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>As,req = MEd / (fyd × z)</span>
              <span className="font-mono">{data.mEd.toFixed(2)}×10⁶ / (434.8 × {data.z.toFixed(1)}) = {data.asReq} mm²/m</span>
            </div>
            <div className="flex justify-between">
              <span>As,min = max(0.26×fctm/fyk×b×d, 0.0013×b×d)</span>
              <span className="font-mono">max(219, 189) = {data.asMin} mm²/m</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-2 mt-2">
              <span>PROVIDED: φ{data.barDiameter} @ {data.spacing} mm</span>
              <span className="font-mono">{data.asProv} mm²/m</span>
            </div>
            <div className="flex justify-between">
              <span>Utilisation</span>
              <span className={data.utilisation <= 1.0 ? 'text-green-600' : 'text-red-600'}>
                {data.asReq}/{data.asProv} = {data.utilisation.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deflection Check */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Deflection Check (Cl. 7.4.2)</h2>
        <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Actual L/d</span>
              <span className="font-mono">{data.span}×1000 / {data.d} = {data.deflectionActual.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>ρ = As,req / (b×d)</span>
              <span className="font-mono">{data.asReq} / (1000×{data.d}) = {(data.asReq/(1000*data.d)*100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>ρ₀ = √fck × 10⁻³</span>
              <span className="font-mono">√{data.fck} × 10⁻³ = {(Math.sqrt(data.fck)/1000*100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>f₃ = As,prov / As,req ≤ 1.5</span>
              <span className="font-mono">{data.asProv}/{data.asReq} = {(data.asProv/data.asReq).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>(L/d)limit = k × [11 + 1.5√fck × (ρ₀/ρ)] × f₃</span>
              <span className="font-mono">{data.deflectionLimit.toFixed(1)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-2 mt-2">
              <span>Check</span>
              <span className={data.deflectionActual <= data.deflectionLimit ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {data.deflectionActual.toFixed(1)} ≤ {data.deflectionLimit.toFixed(1)} → 
                {data.deflectionActual <= data.deflectionLimit ? ' DEFLECTION OK' : ' DEFLECTION FAIL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost & Carbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
          <h3 className="font-semibold mb-3">Cost Analysis</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Concrete ({data.thickness}mm)</span>
              <span>£{data.costConcrete.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between">
              <span>Reinforcement ({data.asProv/100} kg/m²)</span>
              <span>£{data.costSteel.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between">
              <span>Formwork</span>
              <span>£{data.costFormwork.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-1 mt-1">
              <span>TOTAL</span>
              <span>£{data.costTotal.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between text-xs text-[#6b7280] mt-2">
              <span>Slab area: 100 m²</span>
              <span>Total: £{(data.costTotal * 100).toFixed(0)}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
          <h3 className="font-semibold mb-3">Carbon Estimate</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Concrete</span>
              <span>{data.carbonConcrete.toFixed(1)} kgCO₂/m²</span>
            </div>
            <div className="flex justify-between">
              <span>Reinforcement</span>
              <span>{data.carbonSteel.toFixed(1)} kgCO₂/m²</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#e5e7eb] pt-1 mt-1">
              <span>TOTAL</span>
              <span>{data.carbonTotal.toFixed(1)} kgCO₂/m²</span>
            </div>
            <div className="flex justify-between text-xs text-green-600 mt-2">
              <span>vs. baseline (200mm slab)</span>
              <span>18% reduction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Eurocode References */}
      <div className="p-3 bg-[#f3f4f6] dark:bg-[#374151] rounded-lg text-xs text-[#6b7280]">
        <p>Design carried out in accordance with:</p>
        <ul className="list-disc list-inside mt-1">
          <li>EN 1990: Eurocode - Basis of structural design</li>
          <li>EN 1991-1-1: Actions on structures - Densities, self-weight, imposed loads</li>
          <li>EN 1992-1-1: Eurocode 2 - Design of concrete structures</li>
          <li>UK National Annex to EN 1992-1-1</li>
        </ul>
      </div>
    </div>
  );
};

export default SlabDetailedReport;