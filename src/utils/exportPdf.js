// src/utils/exportPdf.js
// Browser print-to-PDF. No dependencies, no html2canvas — so no oklch/Tailwind-v4
// issue, and nothing gets truncated (the browser paginates the whole sheet).
//
// Usage in a results page:
//   import { exportElementToPdf } from "../utils/exportPdf";
//   <button onClick={() => exportElementToPdf(sheetRef.current, "Beam-B1")}>Download PDF</button>
//
// The element passed in is marked as the print root; a print stylesheet (below,
// injected once) hides everything else and prints only that element at full length.
// The user gets the browser's native "Save as PDF" dialog.

let styleInjected = false;

function injectPrintStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
@media print {
  /* hide everything, then reveal only the print root and its descendants */
  body * { visibility: hidden !important; }
  #__print_root, #__print_root * { visibility: visible !important; }
  #__print_root {
    position: absolute !important; left: 0; top: 0; width: 100% !important;
    margin: 0 !important; padding: 12px !important; background: #fff !important;
  }
  /* force light rendering so the PDF is a clean white sheet even in dark mode */
  #__print_root, #__print_root * {
    color: #0f172a !important;
    background-color: #fff !important;
    border-color: #e2e8f0 !important;
  }
  /* keep status colors legible */
  #__print_root .pdf-pass { color: #16a34a !important; }
  #__print_root .pdf-fail { color: #ef4444 !important; }
  /* elements marked no-print (nav, buttons) are removed */
  .cb-no-print, .pdf-hide { display: none !important; }
  /* avoid breaking cards across pages where possible */
  #__print_root section, #__print_root table { break-inside: avoid; }
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

  // tag the element as the print root
  const prevId = element.id;
  element.id = "__print_root";

  // set the document title so the PDF's default filename is meaningful
  const prevTitle = document.title;
  document.title = filename;

  const cleanup = () => {
    element.id = prevId || "";
    document.title = prevTitle;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  // give the style a tick to apply, then print
  setTimeout(() => {
    window.print();
    // Safari sometimes doesn't fire afterprint reliably; restore as a fallback
    setTimeout(cleanup, 1000);
  }, 50);
}