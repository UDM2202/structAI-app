// Public, prerendered pages (one page per calculator, methodology, 404; the
// home page is kept unpublished). Rendered to static HTML at build time
// (scripts/prerender.mjs) and hydrated in the browser by src/public/PublicApp.jsx.
// Same look as the About page (SiteChrome + src/public/about/about.css).
// Rules for this file:
//   - render must be pure (no window / localStorage / dates), so the HTML from
//     the build and the browser render are identical;
//   - links are plain <a href> so crawlers and visitors get real URLs.
import React from "react";
import { PRODUCT, DEFINITION, LOGIN_URL, SIGNUP_URL, DISCLAIMER } from "./site";
import { MODULES, moduleBySlug, moduleLabel } from "./modules";
import { ELEMENTS } from "../content/elements";
import SiteChrome, { SectionHead, Crumbs } from "./SiteChrome";

const elementByKey = Object.fromEntries(ELEMENTS.map((e) => [e.key, e]));
const nn = (i) => String(i + 1).padStart(2, "0");

// Ruled, numbered list (drawing-register style).
function RuledList({ items, prefix = "" }) {
  return (
    <ol className="ab-list">
      {items.map((t, i) => (
        <li key={t}><span className="ab-list__n">{prefix}{nn(i)}</span><span>{t}</span></li>
      ))}
    </ol>
  );
}

function Hero({ eyebrow, title, lead, children, aside }) {
  return (
    <section className={`ab-wrap ab-hero ab-hero--page${aside ? "" : " ab-hero--single"}`}>
      <div className="ab-hero__text">
        <p className="ab-eyebrow">{eyebrow}</p>
        <h1 className="ab-h1 ab-h1--page">{title}</h1>
        {lead && <p className="ab-lead">{lead}</p>}
        {children}
      </div>
      {aside}
    </section>
  );
}

function AccountCta({ title }) {
  return (
    <section className="ab-cta">
      <div className="ab-wrap ab-cta__in">
        <h2 className="ab-h1 ab-h1--page ab-cta__h">{title}</h2>
        <p className="ab-lead">The calculators need an account. Your designs, reports and projects are kept in your account.</p>
        <div className="ab-actions">
          <a href={LOGIN_URL} className="ab-btn ab-btn--solid">Sign in to use it</a>
          <a href={SIGNUP_URL} className="ab-btn">Create an account</a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ home */
// Not published ("/" is the app); kept for a later landing page.
export function HomePage() {
  return (
    <SiteChrome>
      <Hero eyebrow="Eurocode 2 design" title={`${PRODUCT}: Eurocode 2 structural design tool`} lead={DEFINITION}>
        <div className="ab-actions">
          <a href={LOGIN_URL} className="ab-btn ab-btn--solid">Sign in</a>
          <a href={SIGNUP_URL} className="ab-btn">Create an account</a>
        </div>
      </Hero>
      <section className="ab-wrap ab-sec">
        <SectionHead n="01" eyebrow="Calculators" title="What it designs" />
        <ol className="ab-modules">
          {MODULES.map((m, i) => (
            <li key={m.slug}><span className="ab-modules__n">{nn(i)}</span><a href={`/${m.slug}`}>{m.h1}</a></li>
          ))}
        </ol>
      </section>
      <div className="ab-spacer" />
    </SiteChrome>
  );
}

/* ---------------------------------------------------------- calculators */
export function ModulePage({ slug }) {
  const m = moduleBySlug[slug];
  const el = elementByKey[m.element];
  const index = MODULES.findIndex((x) => x.slug === slug);
  const sheet = (
    <aside className="ab-sheet" aria-label="What you get">
      <p className="ab-sheet__bar"><span>Sheet {nn(index)}</span><span>What you get</span></p>
      <RuledList items={m.outputs} />
      <p className="ab-sheet__foot">
        <span>{el.checks.length} checks</span><span>{el.limits.length} stated limits</span><span>EN 1992-1-1</span>
      </p>
    </aside>
  );
  return (
    <SiteChrome>
      <div className="ab-wrap"><Crumbs items={[["Calculators", "#calculators"], [m.name, null]]} /></div>
      <Hero eyebrow={`Calculator ${nn(index)} / ${moduleLabel(m)}`} title={m.h1} lead={m.intro} aside={sheet}>
        <p className="ab-def">{DEFINITION}</p>
        <div className="ab-actions">
          <a href={LOGIN_URL} className="ab-btn ab-btn--solid">Use this calculator</a>
          <a href="#checks" className="ab-btn">What it checks</a>
        </div>
      </Hero>

      <section className="ab-wrap ab-sec">
        <SectionHead n="01" eyebrow="Design checks" title="What it checks" id="checks" />
        <RuledList items={el.checks} />
      </section>

      <section className="ab-wrap ab-sec">
        <SectionHead n="02" eyebrow="Inputs" title="What you enter" />
        <RuledList items={m.inputs} />
      </section>

      <section className="ab-wrap ab-sec">
        <SectionHead n="03" eyebrow="Limits and assumptions" title="What it leaves to you" />
        <p className="ab-note">What this calculator does not check, or simplifies. Check these by hand where they matter.</p>
        <RuledList items={el.limits} prefix="L" />
      </section>

      <section className="ab-wrap ab-sec">
        <SectionHead n="04" eyebrow="Related" title="Related calculators" />
        <ol className="ab-modules">
          {m.related.map((s, i) => (
            <li key={s}><span className="ab-modules__n">{nn(i)}</span><a href={`/${s}`}>{moduleBySlug[s].h1}</a></li>
          ))}
          <li><span className="ab-modules__n">{nn(m.related.length)}</span><a href="/methodology">How the calculations are verified</a></li>
        </ol>
      </section>

      <AccountCta title={`Use the ${m.name.toLowerCase()} calculator.`} />
    </SiteChrome>
  );
}

/* ---------------------------------------------------------- methodology */
export function MethodologyPage() {
  const elements = MODULES.filter((m, i, a) => a.findIndex((x) => x.element === m.element) === i);
  return (
    <SiteChrome>
      <div className="ab-wrap"><Crumbs items={[["Methodology", null]]} /></div>
      <Hero
        eyebrow="Methodology"
        title="How Sphere Design Hub calculations are verified"
        lead={`Every calculator in ${PRODUCT} follows EN 1992-1-1 (Eurocode 2) and writes out each step of the design with its clause reference, so the engineer can check the working, not only the answer.`}
      />

      <section className="ab-wrap ab-sec">
        <SectionHead n="01" eyebrow="Testing" title="How the engines are checked" />
        <RuledList items={[
          "Changes to a calculator are tested by sending real design requests to the running engine and comparing the results with independent hand calculations.",
          "Where a result can be worked out in closed form (for example wL²/8 for a simply supported span, or the three-moment equation for continuous spans) the engine's numbers are compared with it directly.",
          "Frame and continuous analyses are cross-checked with an independent solver.",
          "Results are also compared with published worked examples. Where the software deliberately differs from an example, the difference is recorded rather than hidden.",
        ]} />
      </section>

      <section className="ab-wrap ab-sec">
        <SectionHead n="02" eyebrow="Reports" title="What the reports tell you" />
        <RuledList items={[
          "The slab, beam, column and staircase reports list the nationally determined parameters the engine uses at the start of the report.",
          "Every check shows its demand, its resistance, the utilisation and the clause it comes from.",
          "Simplifications made by the engine are stated in the report and on the calculator pages, under limits and assumptions.",
        ]} />
      </section>

      <section className="ab-wrap ab-sec">
        <SectionHead n="03" eyebrow="Known simplifications" title="Where each calculator simplifies" />
        <p className="ab-note">Each calculator page lists its own limits. In summary:</p>
        <dl className="ab-simpl">
          {elements.map((m) => (
            <div key={m.slug}>
              <dt><a href={`/${m.slug}`}>{elementByKey[m.element].name}</a></dt>
              <dd><RuledList items={elementByKey[m.element].limits} prefix="L" /></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ab-wrap ab-sec">
        <SectionHead n="04" eyebrow="Responsibility" title="Who is responsible for the design" />
        <div className="ab-prose"><p>{DISCLAIMER}</p></div>
      </section>
      <div className="ab-spacer" />
    </SiteChrome>
  );
}

/* ------------------------------------------------------------------- 404 */
export function NotFoundPage() {
  return (
    <SiteChrome>
      <Hero eyebrow="Error 404" title="Page not found" lead="There is no page at this address.">
        <div className="ab-actions">
          <a href="#calculators" className="ab-btn ab-btn--solid">All calculators</a>
          <a href={LOGIN_URL} className="ab-btn">Sign in</a>
        </div>
      </Hero>
      <div className="ab-spacer" />
    </SiteChrome>
  );
}
