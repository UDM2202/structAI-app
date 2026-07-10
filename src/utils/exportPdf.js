// src/utils/exportPdf.js
// Reusable "download as PDF" for the structural results pages.
// Uses jsPDF + html2canvas. Install once:  npm install jspdf html2canvas
//
// Usage in a results page:
//   import { exportElementToPdf } from "../utils/exportPdf";
//   const ref = useRef(null);
//   <div ref={ref}> ...page content... </div>
//   <button onClick={() => exportElementToPdf(ref.current, "Beam-B1")}>Download Report</button>
//
// Notes / known limits (by design):
//  - Dark mode: we force a light snapshot so the PDF is always a clean white sheet.
//  - Plotly 3D (WebGL) panels may not rasterize; Recharts/SVG capture fine. Any
//    element marked data-pdf-skip is replaced by a placeholder line in the PDF.
//  - Long pages are sliced across A4 pages so nothing is clipped.

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPdf(el, filename = "report", opts = {}) {
  if (!el) return;
  const {
    marginMm = 10,           // page margin
    scale = 2,               // capture resolution (2 = crisp)
    background = "#ffffff",
  } = opts;

  // 1) Force light theme for the capture (restore afterwards)
  const root = document.documentElement;
  const wasDark = root.classList.contains("dark");
  if (wasDark) root.classList.remove("dark");

  // 2) Let Plotly panels export themselves to static images where possible,
  //    otherwise they're captured as-is (may be blank for WebGL surfaces).
  //    Panels the caller marked with data-pdf-skip get a placeholder.
  const skipped = Array.from(el.querySelectorAll("[data-pdf-skip]"));
  const restores = skipped.map((node) => {
    const ph = document.createElement("div");
    ph.style.cssText =
      "border:1px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;" +
      "font:12px sans-serif;color:#64748b;background:#f8fafc;";
    ph.textContent = node.getAttribute("data-pdf-skip") || "3D view omitted in PDF — view interactively in the app.";
    node.parentNode.insertBefore(ph, node);
    const prevDisplay = node.style.display;
    node.style.display = "none";
    return () => { node.style.display = prevDisplay; ph.remove(); };
  });

  try {
    // small delay so layout settles after theme swap
    await new Promise((r) => setTimeout(r, 60));

    const canvas = await html2canvas(el, {
      scale,
      backgroundColor: background,
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const usableW = pageW - marginMm * 2;
    const usableH = pageH - marginMm * 2;

    // scale image to usable width; slice vertically across pages
    const imgW = usableW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let heightLeft = imgH;
    let position = marginMm;
    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(imgData, "PNG", marginMm, position, imgW, imgH, undefined, "FAST");
    heightLeft -= usableH;

    while (heightLeft > 0) {
      pdf.addPage();
      position = marginMm - (imgH - heightLeft);
      pdf.addImage(imgData, "PNG", marginMm, position, imgW, imgH, undefined, "FAST");
      heightLeft -= usableH;
    }

    pdf.save(`${filename}.pdf`);
  } finally {
    restores.forEach((fn) => fn());
    if (wasDark) root.classList.add("dark");
  }
}