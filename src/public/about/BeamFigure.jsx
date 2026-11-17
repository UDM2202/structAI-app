import { useEffect, useId, useRef, useState } from 'react';
import { buildFigure, clamp, fmt, SPAN, TOTAL, toMetres, VIEW, X0 } from './beamModel';
import './BeamFigure.css';

/**
 * Live two span beam figure.
 *
 * The load drifts slowly back and forth while the figure is on screen, which
 * shows the diagrams are computed, not drawn. The moment a visitor drags the
 * slider or moves the pointer over the drawing, the drift stops for good and
 * they are in control. Visitors who prefer reduced motion get a still figure.
 */
export default function BeamFigure({
  initial = 2.6,
  label = 'Two span continuous beam, moving point load',
  figureNumber = 'FIG. 01',
  caption = 'Solved in your browser from the three moment equation, spans of 6 m. The same mechanics, at full depth, run inside Sphere Design-Hub.',
  className = '',
}) {
  const [x, setX] = useState(initial);
  const svgRef = useRef(null);
  const autoRef = useRef(true);
  const ids = useId();
  const sliderId = `${ids}-pos`;
  const captionId = `${ids}-cap`;

  // Slow sweep while visible. Stops permanently once the visitor takes over.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      autoRef.current = false;
      return undefined;
    }

    let frame = 0;
    let visible = false;
    const started = performance.now();

    const tick = (now) => {
      if (!autoRef.current || !visible) {
        frame = 0;
        return;
      }
      const t = (now - started) / 1000;
      setX(SPAN + (SPAN - 0.9) * Math.sin(t * 0.32 - 0.6));
      frame = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && autoRef.current && !frame) frame = requestAnimationFrame(tick);
    });
    io.observe(svg);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const takeOver = () => {
    autoRef.current = false;
  };

  const fromPointer = (event) => {
    const box = svgRef.current.getBoundingClientRect();
    const userX = ((event.clientX - box.left) / box.width) * VIEW.width;
    takeOver();
    setX(clamp(toMetres(userX)));
  };

  const fig = buildFigure(x);
  const r = fig.results;

  return (
    <figure className={`beam-figure ${className}`} aria-labelledby={captionId}>
      <div className="beam-figure__head">
        <span>{figureNumber}</span>
        <span>{label}</span>
      </div>

      <svg
        ref={svgRef}
        className="beam-figure__svg"
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        role="img"
        aria-label="Bending moment and shear force diagrams for a two span continuous beam. Use the slider below to move the load."
        onPointerDown={fromPointer}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' || e.buttons) fromPointer(e);
        }}
      >
        <g className="bf-grid" aria-hidden="true">
          <path d="M40 24V352M160 24V352M280 24V352M400 24V352M520 24V352" />
        </g>

        <g className="bf-load">
          <path d="M0 30V86M-6 76L0 88L6 76" transform={`translate(${fig.arrowX.toFixed(1)} 0)`} />
          <text x={fig.loadLabelX.toFixed(1)} y="24" textAnchor="middle">
            P = 100 kN
          </text>
        </g>

        <path className="bf-member" d="M40 96H520" />
        <g className="bf-supports">
          <path d="M40 99l-9 15h18z" />
          <path d="M280 99l-9 15h18z" />
          <path d="M520 99l-9 15h18z" />
          <path d="M26 118h28M266 118h28M506 118h28" />
          <text x="40" y="134" textAnchor="middle">A</text>
          <text x="280" y="134" textAnchor="middle">B</text>
          <text x="520" y="134" textAnchor="middle">C</text>
        </g>

        <text className="bf-title" x={X0} y="160">BENDING MOMENT, kNm</text>
        <path className="bf-base" d="M40 204H520" />
        <path className="bf-area" d={fig.bmd} />
        {fig.spanLabel && (
          <text className="bf-val" x={fig.spanLabel.x.toFixed(1)} y={fig.spanLabel.y.toFixed(1)} textAnchor="middle">
            {fig.spanLabel.text}
          </text>
        )}
        {fig.supportLabel && (
          <text className="bf-val" x={fig.supportLabel.x} y={fig.supportLabel.y.toFixed(1)} textAnchor="middle">
            {fig.supportLabel.text}
          </text>
        )}

        <text className="bf-title" x={X0} y="276">SHEAR FORCE, kN</text>
        <path className="bf-base" d="M40 320H520" />
        <path className="bf-area bf-area--alt" d={fig.sfd} />
      </svg>

      <div className="beam-figure__control">
        <label htmlFor={sliderId}>Load position</label>
        <input
          id={sliderId}
          type="range"
          min="0"
          max={TOTAL}
          step="0.05"
          value={x}
          onChange={(e) => {
            takeOver();
            setX(Number(e.target.value));
          }}
        />
        <output htmlFor={sliderId}>{x.toFixed(2)} m</output>
      </div>

      <dl className="beam-figure__readout">
        <div><dt>R<sub>A</sub></dt><dd>{fmt(r.rA)} kN</dd></div>
        <div><dt>R<sub>B</sub></dt><dd>{fmt(r.rB)} kN</dd></div>
        <div><dt>R<sub>C</sub></dt><dd>{fmt(r.rC)} kN</dd></div>
        <div><dt>M<sub>span</sub></dt><dd>{fmt(r.mSpan)} kNm</dd></div>
        <div><dt>M<sub>B</sub></dt><dd>{fmt(r.mB)} kNm</dd></div>
      </dl>

      {caption && <figcaption id={captionId}>{caption}</figcaption>}
    </figure>
  );
}
