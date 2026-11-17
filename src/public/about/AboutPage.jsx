// About page (public, prerendered at /about). Built from sdh-about-kit: copy
// from content/about-copy.md, corrected where the product has changed since
// (no cost/rates, combined footings are two-column, no pattern loading on
// continuous beams, chat and the desktop agent are not released). Keep every
// claim in step with the engines, like src/content/elements.js.
import BeamFigure from "./BeamFigure";
import SiteChrome, { SectionHead } from "../SiteChrome";
import { MODULES, moduleLabel as label } from "../modules";

function Shot({ name, title, alt, lazy = true }) {
  return (
    <figure className="ab-shot">
      <figcaption className="ab-shot__bar"><span>{title}</span><span aria-hidden="true">SDH</span></figcaption>
      <img
        src={`/about/sdh-${name}-1600.webp`}
        srcSet={`/about/sdh-${name}-800.webp 800w, /about/sdh-${name}-1600.webp 1600w`}
        sizes="(min-width: 1024px) 50vw, 100vw"
        width="1600" height="1000" alt={alt}
        loading={lazy ? "lazy" : "eager"} decoding="async"
      />
    </figure>
  );
}

const FACTS = [
  ["Design basis", "EN 1992-1-1 (Eurocode 2) with the UK National Annex"],
  ["Design modules", "Nine reinforced concrete elements"],
  ["Output", "Calculation reports, drawings and bar schedules in PDF"],
  ["Runs in", "Any modern browser. Nothing to install."],
];

const ENGINE = [
  ["Analysis", "Continuous slabs are solved with a linear elastic stiffness model and a banded symmetric solver, with pattern loading applied automatically. Continuous beams are analysed with pinned or fixed ends. The report sets out the moments and shears at every support and span, so a checker can follow them back."],
  ["Columns", "Braced and unbraced members, slenderness and second order effects, biaxial bending, sub-frame moments, and load take-down from tributary areas and floor loads when the axial force is not known in advance."],
  ["Foundations", "Pad footings and two-column combined footings, including pedestals, offset columns, water table effects, bearing pressure and punching shear, with automatic sizing when you want it."],
  ["Serviceability and detailing", "Deflection, crack control on continuous members, cover for exposure, anchorage, reinforcement drawings and bar schedules, and bar sizes and spacings that follow the ones the engineer prefers to use on site."],
];

const PRINCIPLES = [
  ["The engineer's input is law.", "If you fix the cover, the effective depth, the bar diameter or the spacing, the engine designs around that choice and says so in the report. It never substitutes a value quietly."],
  ["Checked against independent methods.", "Each engine is compared with hand calculations, published worked examples and independent solvers while it is built. Column moment capacity, for example, was cross-checked against the parabola rectangle law integrated in layers over 72 cases. The methodology page records what each check found, including where the software simplifies."],
  ["The report is the product.", "Every design exports a calculation document with a cover page, clause references, shear force and bending moment diagrams, reinforcement drawings and a bar schedule. It is written to be submitted, not just read on screen."],
];

export default function AboutPage() {
  return (
    <SiteChrome nav="modules">
        {/* Hero */}
        <section className="ab-wrap ab-hero">
          <div className="ab-hero__text">
            <p className="ab-eyebrow">About Sphere Design Hub</p>
            <h1 className="ab-h1">Structural design you can check.</h1>
            <p className="ab-lead">
              Sphere Design Hub is a browser based design environment for reinforced concrete.
              Describe the member, its loads and its supports, and receive a complete design
              with the working shown, clause by clause, ready to submit.
            </p>
            <div className="ab-actions">
              <a href="/signup" className="ab-btn ab-btn--solid">Start a design</a>
              <a href="#engine" className="ab-btn">See how it works</a>
            </div>
          </div>
          <div className="ab-hero__fig">
            <BeamFigure caption="Solved in your browser from the three moment equation, spans of 6 m. The same mechanics, at full depth, run inside Sphere Design Hub." />
          </div>
        </section>

        {/* Fact strip */}
        <section className="ab-wrap" aria-label="At a glance">
          <dl className="ab-facts">
            {FACTS.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </section>

        {/* 01 */}
        <section className="ab-wrap ab-sec">
          <SectionHead n="01" eyebrow="The problem" title="Why we built it" />
          <div className="ab-prose">
            <p>
              Concrete design in practice is still spread across spreadsheets, hand calculations and
              desktop packages that return an answer without showing how it was reached. That is a real
              difficulty for the engineer who has to sign the drawing, and a larger one for the engineer
              who has to check it.
            </p>
            <p>
              A result is only useful if the working behind it can be read, challenged and defended.
              Sphere Design Hub was built around that idea.
            </p>
          </div>
        </section>

        {/* 02 */}
        <section className="ab-wrap ab-sec">
          <SectionHead n="02" eyebrow="Nine modules" title="What it designs" id="modules" />
          <div className="ab-split">
            <div className="ab-prose">
              <p>
                An engineer describes the member, its loads and its support conditions, and receives
                analysis, section sizing, reinforcement, serviceability checks and a calculation report
                that cites the governing Eurocode clause for every step.
              </p>
              <ol className="ab-modules">
                {MODULES.map((m, i) => (
                  <li key={m.slug}>
                    <span className="ab-modules__n">{String(i + 1).padStart(2, "0")}</span>
                    <a href={`/${m.slug}`}>{label(m)}</a>
                    {m.slug === "two-way-slab-design-calculator" && <span className="ab-modules__note">all nine edge cases</span>}
                  </li>
                ))}
              </ol>
            </div>
            <Shot name="two-way-slab" title="Two way slab input" alt="Two way slab input page with the nine edge continuity cases and plan preview" />
          </div>
          <div className="ab-pair">
            <Shot name="pad-footing" title="Pad footing input" alt="Pad footing input page with column details, footing geometry and live footing plan" />
            <Shot name="column" title="Column input" alt="Column input page with classification, bracing, end conditions and load take-down" />
          </div>
        </section>

        {/* 03 */}
        <section className="ab-wrap ab-sec">
          <SectionHead n="03" eyebrow="How it works" title="Inside the engine" id="engine" />
          <div className="ab-prose">
            <p>
              The analysis and design engine is our own work, written in Python and exposed through a
              typed API. It runs to more than eight thousand lines of solver and code checking logic,
              developed against worked examples and the corrections of practising engineers.
            </p>
          </div>
          <dl className="ab-grid">
            {ENGINE.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <Shot name="continuous-beam" title="Continuous beam input" alt="Continuous beam input page with span arrangement, end supports, elevation preview and cross section" />
        </section>

        {/* 04 */}
        <section className="ab-wrap ab-sec">
          <SectionHead n="04" eyebrow="Principles" title="What we believe" />
          <div className="ab-principles">
            {PRINCIPLES.map(([k, v], i) => (
              <article key={k}>
                <p className="ab-num">P{i + 1}</p>
                <h3 className="ab-h3">{k}</h3>
                <p>{v}</p>
              </article>
            ))}
          </div>
          <p className="ab-more"><a href="/methodology">How the calculations are verified</a></p>
        </section>

        {/* 05 */}
        <section className="ab-wrap ab-sec">
          <SectionHead n="05" eyebrow="Around the calculation" title="Built for teams" />
          <div className="ab-split">
            <div className="ab-prose">
              <p>
                Engineering is done by teams, so Sphere Design Hub includes organisations, projects and
                role based permissions, a report register where each design is marked checked and then
                issued, and calculation packages that collect a project's designs into one document.
              </p>
              <p>
                Quick design mode serves the engineer who needs one element checked in five minutes,
                with nothing to set up.
              </p>
            </div>
            <Shot name="project-hub" title="Project design hub" alt="Project design hub with the nine element modules and the project's saved designs" />
          </div>
        </section>

        {/* 06 */}
        <section className="ab-wrap ab-sec">
          <SectionHead n="06" eyebrow="The company" title="Who builds it" />
          <div className="ab-prose">
            <p>
              Sphere Design Hub is designed, built and operated by Advanced Systems Global Technology Ltd.
              We write the hard parts ourselves, we verify what we ship, and we stand behind the result.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="ab-cta">
          <div className="ab-wrap ab-cta__in">
            <h2 className="ab-h1 ab-cta__h">Put your next element through it.</h2>
            <p className="ab-lead">
              Start with a single beam or slab in quick design mode. No installation, no setup,
              and the full calculation is yours to read.
            </p>
            <div className="ab-actions"><a href="/signup" className="ab-btn ab-btn--solid">Start a design</a></div>
          </div>
        </section>
    </SiteChrome>
  );
}
