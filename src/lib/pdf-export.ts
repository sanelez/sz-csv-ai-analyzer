import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CSVData } from "./csv-parser";
import type {
  DataSummaryResult,
  AnomalyResult,
  ChartConfig,
} from "csv-charts-ai";

interface ChatMessage {
  prompt: string;
  response: string;
}

export interface ChartImage {
  title: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface PDFExportOptions {
  fileName?: string;
  data: CSVData;
  summary?: DataSummaryResult | null;
  anomalies?: AnomalyResult[] | null;
  chatHistory?: ChatMessage[];
  charts?: ChartConfig[];
  chartImages?: ChartImage[];
  maxDataRows?: number;
}

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Convert LaTeX math notation to readable plain text.
 * jsPDF cannot render LaTeX natively, so we produce clean ASCII math.
 */
function latexToPlainText(tex: string): string {
  let result = tex.trim();

  // \text{...} → content
  result = result.replace(/\\text\{([^}]*)\}/g, "$1");
  // \textbf{...} → content
  result = result.replace(/\\textbf\{([^}]*)\}/g, "$1");
  // \mathrm{...} → content
  result = result.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  // \operatorname{...} → content
  result = result.replace(/\\operatorname\{([^}]*)\}/g, "$1");
  // \frac{a}{b} → (a / b)
  result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1 / $2)");
  // \sqrt{x} → sqrt(x)
  result = result.replace(/\\sqrt\{([^}]*)\}/g, "sqrt($1)");
  // \bar{x} → x_mean
  result = result.replace(/\\bar\{([^}]*)\}/g, "$1_mean");
  // \hat{x} → x_hat
  result = result.replace(/\\hat\{([^}]*)\}/g, "$1_hat");
  // \vec{x} → x_vec
  result = result.replace(/\\vec\{([^}]*)\}/g, "$1");
  // Named functions
  result = result.replace(/\\sum/g, "Sum");
  result = result.replace(/\\prod/g, "Prod");
  result = result.replace(/\\int/g, "Integral");
  result = result.replace(/\\log/g, "log");
  result = result.replace(/\\ln/g, "ln");
  result = result.replace(/\\exp/g, "exp");
  result = result.replace(/\\sin/g, "sin");
  result = result.replace(/\\cos/g, "cos");
  result = result.replace(/\\tan/g, "tan");
  result = result.replace(/\\min/g, "min");
  result = result.replace(/\\max/g, "max");
  result = result.replace(/\\lim/g, "lim");
  // Symbols
  const symbols: Record<string, string> = {
    "\\left": "",
    "\\right": "",
    "\\cdot": " * ",
    "\\times": " x ",
    "\\div": " / ",
    "\\pm": " +/- ",
    "\\mp": " -/+ ",
    "\\leq": " <= ",
    "\\geq": " >= ",
    "\\neq": " != ",
    "\\approx": " ~ ",
    "\\infty": "Inf",
    "\\alpha": "alpha",
    "\\beta": "beta",
    "\\gamma": "gamma",
    "\\delta": "delta",
    "\\sigma": "sigma",
    "\\mu": "mu",
    "\\pi": "pi",
    "\\theta": "theta",
    "\\lambda": "lambda",
    "\\in": " in ",
    "\\forall": "for all ",
    "\\exists": "exists ",
    "\\partial": "d",
    "\\nabla": "nabla",
    "\\ldots": "...",
    "\\cdots": "...",
    "\\quad": "  ",
    "\\qquad": "    ",
  };
  for (const [cmd, replacement] of Object.entries(symbols)) {
    result = result.split(cmd).join(replacement);
  }
  // Subscript: x_{sub} → x_sub  or  x_i → x_i
  result = result.replace(/\_\{([^}]*)\}/g, "_$1");
  // Superscript: x^{sup} → x^sup  or  x^2 → x^2
  result = result.replace(/\^\{([^}]*)\}/g, "^$1");
  // Remove remaining \commands
  result = result.replace(/\\_/g, "_");
  result = result.replace(/\\[a-zA-Z]+/g, "");
  // Remove leftover braces
  result = result.replace(/[{}]/g, "");
  // Clean up whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/** Strip markdown + LaTeX for plain-text PDF rendering */
function stripMarkdown(text: string): string {
  let result = text;

  // Extract and convert display math: $$...$$ or \[...\]
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner: string) =>
    latexToPlainText(inner),
  );
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) =>
    latexToPlainText(inner),
  );
  // Bare [ ... ] with LaTeX commands
  result = result.replace(
    /^\[\s*(\\(?:text|frac|sqrt|sum|prod|int|left|right|bar|hat)\b[\s\S]*?)\s*\]$/gm,
    (_m, inner: string) => latexToPlainText(inner),
  );
  // Inline math: $...$ or \(...\)
  result = result.replace(/\$(.*?)\$/g, (_m, inner: string) =>
    latexToPlainText(inner),
  );
  result = result.replace(/\\\((.*?)\\\)/g, (_m, inner: string) =>
    latexToPlainText(inner),
  );

  // Strip markdown formatting
  result = result
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s/gm, "- ")
    .trim();

  return result;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > 260) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229); // violet-600
  doc.text(title, MARGIN, y);
  // Underline
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 1.5, MARGIN + doc.getTextWidth(title), y + 1.5);
  return y + 10;
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  y: number,
  fontSize = 10,
): number {
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(line, MARGIN, y);
    y += fontSize * 0.45;
  }
  return y + 3;
}

// Truncate cell values for readability
const truncate = (v: string, max = 30) =>
  v.length > max ? v.slice(0, max - 1) + "\u2026" : v;

export function exportToPDF(options: PDFExportOptions) {
  const {
    fileName = "analysis-report",
    data,
    summary,
    anomalies,
    chatHistory,
    charts,
    chartImages,
    maxDataRows = 100,
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ─── Title page header ───
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_WIDTH, 45, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("CSV AI Analyzer", MARGIN, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Analysis Report", MARGIN, 28);

  doc.setFontSize(9);
  doc.text(dateStr, MARGIN, 36);

  let y = 55;

  // ─── File overview ───
  y = addSectionTitle(doc, "File Overview", y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);

  const displayName = fileName.replace(/\.(csv|xlsx?)$/i, "") || "untitled";
  const overviewItems = [
    `Name: ${displayName}`,
    `Rows: ${data.rowCount.toLocaleString("en-US")}`,
    `Columns: ${data.headers.length} (${data.headers.slice(0, 10).join(", ")}${data.headers.length > 10 ? "..." : ""})`,
  ];
  for (const item of overviewItems) {
    doc.text(item, MARGIN + 2, y);
    y += 5;
  }
  y += 5;

  // ─── Data table ───
  y = addSectionTitle(doc, "Data Preview", y);

  const displayRows = data.rows.slice(0, maxDataRows);

  autoTable(doc, {
    startY: y,
    head: [data.headers.map((h) => truncate(h, 20))],
    body: displayRows.map((row) => row.map((cell) => truncate(cell))),
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: "linebreak",
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [245, 243, 255] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_WIDTH,
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 10;
  if (displayRows.length < data.rowCount) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Showing ${displayRows.length} of ${data.rowCount.toLocaleString("en-US")} rows`,
      MARGIN,
      y + 5,
    );
    y += 10;
  }
  y += 5;

  // ─── AI Summary ───
  if (summary) {
    if (y > 230) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, "AI Summary", y);
    y = addWrappedText(doc, stripMarkdown(summary.summary), y);
    y += 3;

    if (summary.keyInsights?.length) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      if (y > 265) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text("Key Insights", MARGIN, y);
      y += 6;

      for (const insight of summary.keyInsights) {
        if (y > 280) {
          doc.addPage();
          y = MARGIN;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const bullet = `\u2022  ${stripMarkdown(insight)}`;
        const lines = doc.splitTextToSize(bullet, CONTENT_WIDTH - 4);
        for (const line of lines) {
          if (y > 280) {
            doc.addPage();
            y = MARGIN;
          }
          doc.text(line, MARGIN + 2, y);
          y += 4.5;
        }
        y += 1;
      }
      y += 3;
    }

    if (summary.dataQuality) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      if (y > 265) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text("Data Quality", MARGIN, y);
      y += 6;
      y = addWrappedText(doc, stripMarkdown(summary.dataQuality), y);
      y += 3;
    }
  }

  // ─── Anomalies ───
  if (anomalies && anomalies.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, `Detected Anomalies (${anomalies.length})`, y);

    autoTable(doc, {
      startY: y,
      head: [["Row", "Column", "Value", "Issue", "Severity"]],
      body: anomalies.map((a) => [
        String(a.row),
        a.column,
        truncate(a.value, 25),
        truncate(a.issue, 40),
        a.severity.charAt(0).toUpperCase() + a.severity.slice(1),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [30, 30, 30],
      },
      headStyles: {
        fillColor: [239, 68, 68],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 15 },
        4: { cellWidth: 20 },
      },
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: CONTENT_WIDTH,
    });

    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 8;
  }

  // ─── Charts ───
  if (chartImages && chartImages.length > 0) {
    // Embed actual chart images
    for (const img of chartImages) {
      doc.addPage();
      y = MARGIN;
      y = addSectionTitle(doc, img.title, y);

      // Fit the chart image within the content width, preserving aspect ratio
      const aspectRatio = img.height / img.width;
      const imgWidth = Math.min(CONTENT_WIDTH, 170);
      const imgHeight = imgWidth * aspectRatio;
      const maxHeight = 200; // leave room for title + footer
      const finalHeight = Math.min(imgHeight, maxHeight);
      const finalWidth =
        finalHeight < imgHeight ? finalHeight / aspectRatio : imgWidth;

      try {
        doc.addImage(img.dataUrl, "PNG", MARGIN, y, finalWidth, finalHeight);
        y += finalHeight + 5;
      } catch {
        // Fallback: just show the title if image embedding fails
        y = addWrappedText(doc, `[Chart: ${img.title}]`, y);
      }
    }
  } else if (charts && charts.length > 0) {
    // Fallback: table of chart descriptions when images aren't available
    if (y > 230) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, `Generated Charts (${charts.length})`, y);

    const chartTypeLabels: Record<string, string> = {
      bar: "Bar",
      line: "Line",
      pie: "Pie",
      scatter: "Scatter",
      area: "Area",
      histogram: "Histogram",
      radar: "Radar",
    };

    autoTable(doc, {
      startY: y,
      head: [["Type", "Title", "Description", "X Axis", "Y Axis"]],
      body: charts.map((c) => [
        chartTypeLabels[c.type] ?? c.type,
        truncate(c.title, 30),
        truncate(c.description, 40),
        c.xAxis,
        c.yAxis,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [30, 30, 30],
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: CONTENT_WIDTH,
    });

    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 8;
  }

  // ─── Chat history ───
  if (chatHistory && chatHistory.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, "Chat History", y);

    for (let i = 0; i < chatHistory.length; i++) {
      const item = chatHistory[i]!;
      if (y > 260) {
        doc.addPage();
        y = MARGIN;
      }

      // Question
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      const qLines = doc.splitTextToSize(
        `Q${i + 1}: ${item.prompt}`,
        CONTENT_WIDTH - 4,
      );
      for (const line of qLines) {
        if (y > 280) {
          doc.addPage();
          y = MARGIN;
        }
        doc.text(line, MARGIN + 2, y);
        y += 4.5;
      }
      y += 2;

      // Response
      y = addWrappedText(doc, stripMarkdown(item.response), y, 9);
      y += 5;
    }
  }

  // ─── Footer on every page ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_WIDTH / 2, 292, {
      align: "center",
    });
    doc.text("CSV AI Analyzer", MARGIN, 292);
    doc.text(dateStr, PAGE_WIDTH - MARGIN, 292, { align: "right" });
  }

  doc.save(`${displayName}-report.pdf`);
}

/** CSS properties to inline into cloned SVG elements */
const SVG_STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "alignment-baseline",
  "visibility",
  "display",
  "clip-path",
  "color",
  "letter-spacing",
];

/**
 * Inline computed styles from live SVG elements into a cloned SVG.
 * CRITICAL: does NOT skip "none" — fill:none means transparent in SVG,
 * dropping it causes elements to render as solid black.
 */
function inlineSvgStyles(source: Element, clone: Element) {
  const srcEls = source.querySelectorAll("*");
  const clnEls = clone.querySelectorAll("*");
  srcEls.forEach((srcEl, i) => {
    const clnEl = clnEls[i];
    if (!clnEl || !(clnEl instanceof SVGElement)) return;
    const cs = window.getComputedStyle(srcEl);
    for (const prop of SVG_STYLE_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val !== "") clnEl.style.setProperty(prop, val);
    }
  });
}

/** Prepare an SVG element for standalone serialization */
function prepareSvgClone(svgElement: Element): SVGSVGElement | null {
  const rect = svgElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svgClone.setAttribute("width", String(rect.width));
  svgClone.setAttribute("height", String(rect.height));
  if (!svgClone.getAttribute("viewBox")) {
    svgClone.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  }

  inlineSvgStyles(svgElement, svgClone);
  return svgClone;
}

/** Convert a prepared SVG clone to a PNG data URL via canvas */
function svgToDataUrl(
  svgClone: SVGSVGElement,
  width: number,
  height: number,
  bgColor: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      ctx.scale(scale, scale);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Capture all chart SVGs from the DOM and convert them to image data URLs.
 */
export async function captureChartImages(
  charts: ChartConfig[],
): Promise<ChartImage[]> {
  // Find all recharts SVGs on the page
  const svgElements = document.querySelectorAll(
    ".recharts-responsive-container svg.recharts-surface",
  );

  if (svgElements.length === 0) return [];

  const results: ChartImage[] = [];

  for (let i = 0; i < svgElements.length; i++) {
    const svgElement = svgElements[i]!;
    const chart = charts[i];
    const title = chart?.title ?? `Chart ${i + 1}`;

    const rect = svgElement.getBoundingClientRect();
    const svgClone = prepareSvgClone(svgElement);
    if (!svgClone) continue;

    const dataUrl = await svgToDataUrl(
      svgClone,
      rect.width,
      rect.height,
      "#ffffff",
    );
    if (dataUrl) {
      results.push({ title, dataUrl, width: rect.width, height: rect.height });
    }
  }

  return results;
}

/**
 * Export only charts as a PDF document.
 */
export async function exportChartsPDF(
  charts: ChartConfig[],
  fileName = "charts",
) {
  const chartImages = await captureChartImages(charts);
  if (chartImages.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_WIDTH, 35, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Charts Report", MARGIN, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, MARGIN, 27);

  let isFirst = true;

  for (const img of chartImages) {
    if (!isFirst) doc.addPage();
    isFirst = false;

    let y = 45;
    y = addSectionTitle(doc, img.title, y);

    const aspectRatio = img.height / img.width;
    const imgWidth = Math.min(CONTENT_WIDTH, 170);
    const imgHeight = imgWidth * aspectRatio;
    const maxHeight = 210;
    const finalHeight = Math.min(imgHeight, maxHeight);
    const finalWidth =
      finalHeight < imgHeight ? finalHeight / aspectRatio : imgWidth;

    try {
      doc.addImage(img.dataUrl, "PNG", MARGIN, y, finalWidth, finalHeight);
    } catch {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`[Could not embed chart: ${img.title}]`, MARGIN, y);
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_WIDTH / 2, 292, {
      align: "center",
    });
    doc.text("CSV AI Analyzer", MARGIN, 292);
  }

  const displayName = fileName.replace(/\.(csv|xlsx?)$/i, "") || "charts";
  doc.save(`${displayName}-charts.pdf`);
}
