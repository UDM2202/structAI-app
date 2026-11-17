// Main-bar spacing: chosen by the engine (default) or entered by the designer.
// Entered spacings are sent as-is and the engine never changes them: if one
// does not carry the moment, or breaks EC2 9.3.1.1(3) s <= min(2h, 250) or the
// EC2 8.2 clear gap, the design fails and the report says why.
// `fields` = [{ key, label, value, onChange }]; `renderField(field)` draws the
// input in the page's own style.
export default function SpacingChoice({ auto, onAuto, fields, renderField, subClass = "" }) {
  return (
    <div className="col-span-full">
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={auto} onChange={(e) => onAuto(e.target.checked)} className="h-4 w-4 accent-[#0A2F44]" />
        <span>Let the engine choose the spacing</span>
      </label>
      <p className={`mt-1 text-[10px] ${subClass}`}>
        {auto
          ? "The engine uses the widest standard spacing that carries the moment."
          : "Your spacing is used as entered. If it does not carry the moment, or exceeds the EC2 9.3.1.1(3) maximum (main bars min(2h, 250) mm) or leaves too small a gap between bars (EC2 8.2), the design fails and says why. Leave a box blank to let the engine choose that one."}
      </p>
      {!auto && (
        <div className={`mt-2 grid gap-3 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {fields.map((f) => <div key={f.key}>{renderField(f)}</div>)}
        </div>
      )}
    </div>
  );
}
