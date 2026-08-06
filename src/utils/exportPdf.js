// src/utils/exportPdf.js
// Browser print-to-PDF. No dependencies (no html2canvas -> no Tailwind-v4 oklch crash).
//
// Why it CLONES instead of printing in place:
//   The detailed-report modal is `position: fixed`. Fixed-position elements are
//   repainted on EVERY printed page, which is what produced 4 identical pages.
//   So we clone the content into a plain <div> appended directly to <body>
//   (no fixed/absolute ancestors), print that, then remove it.
//
// PRINT-PAGINATION FIX (rows silently disappearing, e.g. the Deflection
// section): the previous rule tried to prevent breaking inside <section>,
// <table>, and <tr> -- none of which exist in DetailedReport.jsx (it's all
// <div>s), so that rule was a no-op. The REAL bug is that CSS Grid rows
// (display: grid) that straddle a print page boundary get silently dropped
// by Chrome/WebKit's print engine -- this is a documented browser
// limitation, not just a visual artifact. Longer sections (like Deflection,
// with the most rows) are the most likely to land across a page break, which
// is exactly the symptom reported. Flexbox and table layouts paginate
// correctly, so on print we force every `.dr-row` from grid to flex, and
// mark rows (not whole sections) as break-inside: avoid so a single row's
// three columns can't split apart while the section as a whole still flows
// across pages normally.

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

  /* --- pagination fix ---
     CSS Grid rows that straddle a page break can be dropped entirely in
     print. Force each report row to flexbox (which paginates reliably) and
     recreate the same 3-column layout with fixed widths, matching the
     on-screen grid-cols-[170px_1fr_190px]. */
  #__print_sheet .dr-row {
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: flex-start !important;
    gap: 1rem !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  #__print_sheet .dr-row > div:nth-child(1) { flex: 0 0 170px !important; width: 170px !important; }
  #__print_sheet .dr-row > div:nth-child(2) { flex: 1 1 auto !important; min-width: 0 !important; }
  #__print_sheet .dr-row > div:nth-child(3) { flex: 0 0 190px !important; width: 190px !important; }

  /* let a whole section flow across pages -- only individual rows are
     protected from splitting, not the entire (possibly page-length) block */
  #__print_sheet .dr-section { break-inside: auto !important; page-break-inside: auto !important; }

  /* avoid starting a section title at the very bottom of a page, orphaned
     from its first row */
  #__print_sheet .dr-section > div:first-child {
    break-after: avoid !important; page-break-after: avoid !important;
  }

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