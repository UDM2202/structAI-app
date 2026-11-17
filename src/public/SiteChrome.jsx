// Shared frame for every public page (about, calculators, methodology, 404):
// header with logo / nav / theme switch, footer with every calculator, and the
// numbered section heading. Styles: src/public/about/about.css (scoped .ab).
// Render must stay pure (see PublicPages.jsx); the theme is applied in an effect.
import { useEffect } from "react";
import { MODULES, moduleLabel } from "./modules";
import { DISCLAIMER, LAST_UPDATED, LOGIN_URL, SIGNUP_URL } from "./site";

// Same rule as the app's ThemeContext: saved choice, else the system setting.
// The CSS (and the inline script in index.html) already follow it before this
// runs, so there is no flash; the button's label swaps by CSS, no React state.
function applyTheme(dark) {
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.classList.toggle("light", !dark);
}
function useSiteTheme() {
  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem("theme"); } catch { /* storage blocked */ }
    applyTheme(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  return () => {
    const dark = !document.documentElement.classList.contains("dark");
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch { /* storage blocked */ }
    applyTheme(dark);
  };
}

export function SectionHead({ n, eyebrow, title, id }) {
  return (
    <header className="ab-sechead" id={id}>
      <p className="ab-eyebrow"><span className="ab-num">{n}</span><span aria-hidden="true"> / </span>{eyebrow}</p>
      <h2 className="ab-h2">{title}</h2>
    </header>
  );
}

// Breadcrumb in the drawing-register style: [label, href | null][]
export function Crumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="ab-crumbs">
      <ol>
        {items.map(([label, href], i) => (
          <li key={label}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {href ? <a href={href}>{label}</a> : <span aria-current="page">{label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function SiteChrome({ children, nav = "calculators" }) {
  const toggleTheme = useSiteTheme();
  return (
    <div className="ab">
      <a href="#main" className="ab-skip">Skip to content</a>
      <header className="ab-top">
        <div className="ab-wrap ab-top__in">
          <a href="/about" className="ab-logo" aria-label="Sphere Design Hub, about">
            <img src="/brand/sdh-logo.png" alt="Sphere Design Hub" width="840" height="266" className="ab-logo--light" />
            <img src="/brand/sdh-logo-dark.png" alt="" aria-hidden="true" width="840" height="266" className="ab-logo--dark" />
          </a>
          <nav className="ab-nav" aria-label="Main">
            <a href={nav === "modules" ? "#modules" : "#calculators"}>Calculators</a>
            {nav !== "modules" && <a href="/about">About</a>}
            <a href="/methodology">Methodology</a>
            <a href={LOGIN_URL} className="ab-nav__cta">Sign in</a>
            <button type="button" onClick={toggleTheme} className="ab-theme" aria-label="Switch between light and dark mode">
              <span aria-hidden="true" className="ab-logo--light">Dark</span>
              <span aria-hidden="true" className="ab-logo--dark">Light</span>
            </button>
          </nav>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="ab-foot">
        <div className="ab-wrap ab-foot__in">
          <div>
            <img src="/brand/sdh-mark.png" alt="" aria-hidden="true" width="40" height="47" className="ab-logo--light" />
            <img src="/brand/sdh-mark-dark.png" alt="" aria-hidden="true" width="40" height="47" className="ab-logo--dark" />
            <p className="ab-foot__small">{DISCLAIMER}</p>
            <p className="ab-foot__small">Last updated {LAST_UPDATED}.</p>
          </div>
          <nav aria-label="Calculators" className="ab-foot__links" id="calculators">
            <p className="ab-eyebrow">Calculators</p>
            <ul>{MODULES.map((m) => <li key={m.slug}><a href={`/${m.slug}`}>{moduleLabel(m)}</a></li>)}</ul>
          </nav>
          <nav aria-label="More" className="ab-foot__links">
            <p className="ab-eyebrow">More</p>
            <ul>
              <li><a href="/about">About</a></li>
              <li><a href="/methodology">Methodology</a></li>
              <li><a href={LOGIN_URL}>Sign in</a></li>
              <li><a href={SIGNUP_URL}>Create an account</a></li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
