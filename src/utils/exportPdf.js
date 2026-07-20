// src/utils/exportPdf.js
// Browser print-to-PDF. No dependencies (no html2canvas -> no Tailwind-v4 oklch crash).
//
// Why it CLONES instead of printing in place:
//   The detailed-report modal is `position: fixed`. Fixed-position elements are
//   repainted on EVERY printed page, which is what produced 4 identical pages.
//   So we clone the content into a plain <div> appended directly to <body>
//   (no fixed/absolute ancestors), print that, then remove it.

let styleInjected = false;

function injectPrintStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
@media print {
  /* nothing prints except the cloned sheet */
  body > *:not(#__print_sheet) { display: none !important; }

  html, body {
    height: auto !important; overflow: visible !important;
    margin: 0 !important; padding: 0 !important; background: #fff !important;
  }

  #__print_sheet {
    display: block !important;
    position: static !important;          /* never fixed/absolute -> no repeats */
    width: 100% !important; max-width: 100% !important;
    margin: 0 !important; padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
  }

  /* neutralise any fixed/absolute/scroll containers inside the clone */
  #__print_sheet * {
    position: static !important;
    overflow: visible !important;
    max-height: none !important;
    height: auto !important;
    box-shadow: none !important;
  }

  /* force a clean light sheet regardless of dark mode */
  #__print_sheet, #__print_sheet * {
    color: #0f172a !important;
    background-color: transparent !important;
    border-color: #cbd5e1 !important;
  }
  #__print_sheet table { background: #fff !important; }

  /* chrome that should never print */
  #__print_sheet .cb-no-print,
  #__print_sheet .pdf-hide,
  #__print_sheet button { display: none !important; }

  /* keep blocks intact across page breaks */
  #__print_sheet section,
  #__print_sheet table,
  #__print_sheet tr { break-inside: avoid; page-break-inside: avoid; }

  @page { size: A4; margin: 12mm; }
}`;
  const el = document.createElement("style");
  el.setAttribute("data-print-style", "true");
  el.textContent = css;
  document.head.appendChild(el);
}

export function exportElementToPdf(element, filename = "report") {
  if (!element) return;
  injectPrintStyle();

  // remove any stale sheet
  const stale = document.getElementById("__print_sheet");
  if (stale) stale.remove();

  // clone the content into a plain container on <body>
  const sheet = document.createElement("div");
  sheet.id = "__print_sheet";
  sheet.innerHTML = element.innerHTML;
  document.body.appendChild(sheet);

  const prevTitle = document.title;
  document.title = filename;          // becomes the default PDF filename

  const cleanup = () => {
    const s = document.getElementById("__print_sheet");
    if (s) s.remove();
    document.title = prevTitle;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 1500);        // fallback for browsers that skip afterprint
  }, 60);
}