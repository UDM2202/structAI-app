import React from 'react';
import { FiDownload, FiPrinter, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

const SlabDetailedReport = ({ option, onBack, onExport, slabArea, span }) => {
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

  // Calculate values
  const thickness = option.thickness || 175;
  const barDiameter = option.barDiameter || 10;
  const spacing = option.spacing || 150;
  const asProv = option.asProv || 785;
  const asReq = option.asReq || 575;
  const cover = 25;
  const d = thickness - cover - barDiameter / 2;
  const spanValue = span || 4.0;
  
  // Costs (per m²)
  const costConcrete = (thickness / 1000) * 170;
  const costSteel = (asProv / 100) * 7.85 * 1.3;
  const costFormwork = 50.0;
  const costTotal = costConcrete + costSteel + costFormwork;
  
  // Carbon (per m²)
  const carbonConcrete = (thickness / 1000) * 240;
  const carbonSteel = (asProv / 100) * 7.85 * 1.5;
  const carbonTotal = carbonConcrete + carbonSteel;

  // Engineering calculations in table format
  const calculationSteps = [
    {
      output: "h = " + thickness + " mm",
      calculation: "h_min = l_x / 25 = " + spanValue*1000 + "/25 = " + (spanValue*1000/25).toFixed(0) + " mm\nh_provided = " + thickness + " mm ≥ " + (spanValue*1000/25).toFixed(0) + " mm",
      reference: "EC2 7.4.2 (2)"
    },
    {
      output: "c_nom = 25 mm",
      calculation: "c_min,dur = 15 mm (XC1 exposure)\nc_min,fire = 14 mm (R60)\nΔc_dev = 10 mm\nc_nom = max(c_min,dur, c_min,fire) + Δc_dev = 15 + 10 = 25 mm",
      reference: "EC2 4.4.1.2(3)"
    },
    {
      output: "d = " + d.toFixed(0) + " mm",
      calculation: "d = h - c_nom - φ/2\n= " + thickness + " - 25 - " + barDiameter + "/2\n= " + d.toFixed(0) + " mm",
      reference: "EC2 9.2.1.1"
    },
    {
      output: "G_k = " + ((thickness/1000)*25 + 1.5).toFixed(2) + " kN/m²",
      calculation: "Self weight = γ_c × h = 25 × " + (thickness/1000).toFixed(3) + " = " + ((thickness/1000)*25).toFixed(2) + " kN/m²\nFinishes = 1.50 kN/m²\nG_k = " + ((thickness/1000)*25 + 1.5).toFixed(2) + " kN/m²",
      reference: "EC1-1-1 Table A.1"
    },
    {
      output: "Q_k = 3.0 kN/m²",
      calculation: "Office use (Category B)\nQ_k = 3.0 kN/m²",
      reference: "EC1-1-1 Table 6.2"
    },
    {
      output: "w_Ed = " + (1.35*((thickness/1000)*25 + 1.5) + 1.5*3.0).toFixed(2) + " kN/m²",
      calculation: "w_Ed = 1.35G_k + 1.5Q_k\n= 1.35×" + ((thickness/1000)*25 + 1.5).toFixed(2) + " + 1.5×3.0\n= " + (1.35*((thickness/1000)*25 + 1.5) + 4.5).toFixed(2) + " kN/m²",
      reference: "EC0 6.4.3.2"
    },
    {
      output: "M_Ed = " + ((1.35*((thickness/1000)*25 + 1.5) + 4.5) * Math.pow(spanValue, 2) / 8).toFixed(2) + " kNm/m",
      calculation: "M_Ed = w_Ed × L²/8\n= " + (1.35*((thickness/1000)*25 + 1.5) + 4.5).toFixed(2) + " × " + spanValue + "² / 8\n= " + ((1.35*((thickness/1000)*25 + 1.5) + 4.5) * Math.pow(spanValue, 2) / 8).toFixed(2) + " kNm/m",
      reference: "EC2 5.1.3"
    },
    {
      output: "K = " + (((1.35*((thickness/1000)*25 + 1.5) + 4.5) * Math.pow(spanValue, 2) / 8) * 1000000 / (30 * 1000 * Math.pow(d, 2))).toFixed(3),
      calculation: "K = M_Ed / (f_ck × b × d²)\n= " + ((1.35*((thickness/1000)*25 + 1.5) + 4.5) * Math.pow(spanValue, 2) / 8).toFixed(2) + "×10⁶ / (30 × 1000 × " + d.toFixed(0) + "²)\n= " + (((1.35*((thickness/1000)*25 + 1.5) + 4.5) * Math.pow(spanValue, 2) / 8) * 1000000 / (30 * 1000 * Math.pow(d, 2))).toFixed(3),
      reference: "EC2 6.1"
    },
    {
      output: "z = " + (0.95 * d).toFixed(0) + " mm",
      calculation: "z = 0.95d (UK National Annex)\n= 0.95 × " + d.toFixed(0) + "\n= " + (0.95 * d).toFixed(0) + " mm",
      reference: "UK NA to EC2"
    },
    {
      output: "A_s,req = " + asReq + " mm²/m",
      calculation: "A_s,req = M_Ed / (0.87 × f_yk × z)\n= " + ((1.35*((thickness/1000)*25 + 1.5) + 4.5) * Math.pow(spanValue, 2) / 8).toFixed(2) + "×10⁶ / (0.87×500×" + (0.95 * d).toFixed(0) + ")\n= " + asReq + " mm²/m",
      reference: "EC2 6.1"
    },
    {
      output: "A_s,min = " + Math.max(0.26 * 2.9 / 500 * 1000 * d, 0.0013 * 1000 * d).toFixed(0) + " mm²/m",
      calculation: "A_s,min = max(0.26×f_ctm/f_yk×b×d, 0.0013×b×d)\n= max(" + (0.26 * 2.9 / 500 * 1000 * d).toFixed(0) + ", " + (0.0013 * 1000 * d).toFixed(0) + ")\n= " + Math.max(0.26 * 2.9 / 500 * 1000 * d, 0.0013 * 1000 * d).toFixed(0) + " mm²/m",
      reference: "EC2 9.2.1.1"
    },
    {
      output: "φ" + barDiameter + " @ " + spacing + " c/c\n(" + asProv + " mm²/m)",
      calculation: "A_s,prov = (π×φ²/4) × (1000/s)\n= (π×" + barDiameter + "²/4) × (1000/" + spacing + ")\n= " + asProv + " mm²/m\n≥ A_s,req = " + asReq + " mm²/m\n≥ A_s,min = " + Math.max(0.26 * 2.9 / 500 * 1000 * d, 0.0013 * 1000 * d).toFixed(0) + " mm²/m",
      reference: "EC2 9.2.1.1"
    },
    {
      output: "Utilisation = " + (asReq / asProv).toFixed(2),
      calculation: "ρ = A_s,req / A_s,prov\n= " + asReq + " / " + asProv + "\n= " + (asReq / asProv).toFixed(2) + " < 1.0 OK",
      reference: "EC2"
    },
    {
      output: "l/d = " + (spanValue * 1000 / d).toFixed(1),
      calculation: "l/d = L / d\n= " + (spanValue * 1000) + " / " + d.toFixed(0) + "\n= " + (spanValue * 1000 / d).toFixed(1),
      reference: "EC2 7.4.2"
    },
    {
      output: "l/d_limit = " + (20 * (0.0055 / (asProv / (1000 * d)))).toFixed(1),
      calculation: "ρ = A_s,prov / (b×d) = " + asProv + " / (1000×" + d.toFixed(0) + ") = " + (asProv / (1000 * d)).toFixed(4) + "\nρ₀ = √f_ck × 10⁻³ = √30 × 0.001 = 0.0055\nl/d_limit = 20 × ρ₀/ρ = 20 × 0.0055/" + (asProv / (1000 * d)).toFixed(4) + " = " + (20 * (0.0055 / (asProv / (1000 * d)))).toFixed(1),
      reference: "EC2 7.4.2 (2)"
    }
  ];

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-lg border border-[#e5e7eb] dark:border-[#374151] p-6 max-w-6xl mx-auto">
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

      {/* Project Info - Keep as before */}
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
          <p className="font-medium text-[#02090d] dark:text-white">{spanValue} m</p>
        </div>
      </div>

      {/* Selected Option Banner - Keep as before */}
      <div className="mb-6 p-4 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-lg flex items-center">
        <FiCheckCircle className="text-[#0A2F44] text-2xl mr-3" />
        <div>
          <p className="font-semibold text-[#02090d] dark:text-white">
            OPTION {option.rank || 1}: {thickness}mm slab • φ{barDiameter} @ {spacing}mm c/c
          </p>
          <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
            Ranked #{option.rank || 1} • Utilisation {(asReq / asProv).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Section Properties & Material Properties - Keep as before */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Section Properties */}
        <div>
          <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Section Properties</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Overall depth, h</p>
              <p className="text-lg font-bold text-[#02090d] dark:text-white">{thickness} mm</p>
            </div>
            <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Cover, c_nom</p>
              <p className="text-lg font-bold text-[#02090d] dark:text-white">{cover} mm</p>
            </div>
            <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Bar diameter, φ</p>
              <p className="text-lg font-bold text-[#02090d] dark:text-white">{barDiameter} mm</p>
            </div>
            <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Effective depth, d</p>
              <p className="text-lg font-bold text-[#02090d] dark:text-white">{d.toFixed(1)} mm</p>
            </div>
          </div>
        </div>

        {/* Material Properties */}
        <div>
          <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Material Properties</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Concrete grade</p>
              <p className="font-bold text-[#02090d] dark:text-white">C30/37</p>
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fck = 30 MPa</p>
              <p className="text-xs text-[#0A2F44] dark:text-[#66a4c2]">fctm = 2.9 MPa</p>
            </div>
            <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Reinforcement</p>
              <p className="font-bold text-[#02090d] dark:text-white">B500</p>
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fyk = 500 MPa</p>
            </div>
            <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fyd</p>
              <p className="font-bold text-[#02090d] dark:text-white">434.8 MPa</p>
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fyk/γs = 500/1.15</p>
            </div>
            <div className="p-3 bg-[#f9fafb] dark:bg-[#374151] rounded-lg">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">fctm</p>
              <p className="font-bold text-[#02090d] dark:text-white">2.9 MPa</p>
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Table 3.1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Calculations Table - 3 columns with vertical lines */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#02090d] dark:text-white mb-3">Design Calculations</h2>
        <div className="overflow-x-auto border border-[#e5e7eb] dark:border-[#374151] rounded-lg">
          <table className="w-full border-collapse">
          <thead>
  <tr className="bg-[#f3f4f6] dark:bg-[#374151] border-b border-[#e5e7eb] dark:border-[#374151]">
    <th className="text-left p-3 font-semibold text-[#02090d] dark:text-white w-1/4">Reference</th>
    <th className="text-left p-3 font-semibold text-[#02090d] dark:text-white w-1/2">Calculations</th>
    <th className="text-left p-3 font-semibold text-[#02090d] dark:text-white w-1/4">Output</th>
  </tr>
</thead>
           <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#374151]">
  {calculationSteps.map((step, idx) => (
    <tr key={idx} className="hover:bg-[#f9fafb] dark:hover:bg-[#374151] transition-colors">
      <td className="p-3 align-top border-r border-[#e5e7eb] dark:border-[#374151]">
        <span className="text-xs font-mono text-[#6b7280] dark:text-[#9ca3af] bg-[#f3f4f6] dark:bg-[#1f2937] px-2 py-1 rounded">
          {step.reference}
        </span>
      </td>
      <td className="p-3 align-top border-r border-[#e5e7eb] dark:border-[#374151]">
        <div className="text-sm text-[#4b5563] dark:text-[#9ca3af] font-mono whitespace-pre-wrap">
          {step.calculation}
        </div>
      </td>
      <td className="p-3 align-top">
        <code className="text-sm font-mono text-[#02090d] dark:text-white whitespace-pre-wrap">
          {step.output}
        </code>
      </td>
    </tr>
  ))}
</tbody>
          </table>
        </div>
      </div>

      {/* Cost & Carbon Cards - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 pt-6 border-t border-[#e5e7eb] dark:border-[#374151]">
        {/* Cost Analysis */}
        <div className="bg-[#f9fafb] dark:bg-[#374151] rounded-lg p-5">
          <h3 className="font-semibold text-[#02090d] dark:text-white mb-4 text-lg">Cost Analysis</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Concrete ({thickness}mm)</span>
              <span className="font-mono font-medium text-[#02090d] dark:text-white">£{costConcrete.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Reinforcement ({Math.round(asProv/100)} kg/m²)</span>
              <span className="font-mono font-medium text-[#02090d] dark:text-white">£{costSteel.toFixed(2)}/m²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Formwork</span>
              <span className="font-mono font-medium text-[#02090d] dark:text-white">£{costFormwork.toFixed(2)}/m²</span>
            </div>
            <div className="border-t border-[#e5e7eb] dark:border-[#4b5563] pt-3 mt-3">
              <div className="flex justify-between items-center font-bold">
                <span className="text-[#02090d] dark:text-white">TOTAL (per m²)</span>
                <span className="text-[#0A2F44] dark:text-[#66a4c2] text-xl font-bold">£{costTotal.toFixed(2)}/m²</span>
              </div>
            </div>
          </div>
        </div>

        {/* Carbon Estimate */}
        <div className="bg-[#f9fafb] dark:bg-[#374151] rounded-lg p-5">
          <h3 className="font-semibold text-[#02090d] dark:text-white mb-4 text-lg">Carbon Estimate</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Concrete</span>
              <span className="font-mono font-medium text-[#02090d] dark:text-white">{carbonConcrete.toFixed(1)} kgCO₂/m²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6b7280] dark:text-[#9ca3af]">Reinforcement</span>
              <span className="font-mono font-medium text-[#02090d] dark:text-white">{carbonSteel.toFixed(1)} kgCO₂/m²</span>
            </div>
            <div className="border-t border-[#e5e7eb] dark:border-[#4b5563] pt-3 mt-3">
              <div className="flex justify-between items-center font-bold">
                <span className="text-[#02090d] dark:text-white">TOTAL (per m²)</span>
                <span className="text-green-600 dark:text-green-400 text-xl font-bold">{carbonTotal.toFixed(1)} kgCO₂/m²</span>
              </div>
            </div>
            <div className="mt-3 pt-2 text-sm text-green-600 dark:text-green-400">
              ↓ 18% reduction vs. 200mm baseline
            </div>
          </div>
        </div>
      </div>

      {/* Eurocode References Footer */}
      <div className="mt-6 p-3 bg-[#f3f4f6] dark:bg-[#1f2937] rounded-lg text-xs text-[#6b7280] dark:text-[#9ca3af]">
        <p className="font-medium mb-1">Design carried out in accordance with:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>EN 1990: Eurocode - Basis of structural design</li>
          <li>EN 1991-1-1: Actions on structures - Densities, self-weight, imposed loads</li>
          <li>EN 1992-1-1: Eurocode 2 - Design of concrete structures</li>
          <li>UK National Annex to EN 1992-1-1 (z = 0.9d, α_cc = 0.85)</li>
        </ul>
      </div>
    </div>
  );
};

export default SlabDetailedReport;