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
    const MAX_Y = 280;
    const MAX_CHART_H = 120;

    // Start charts section on a new page
    doc.addPage();
    y = MARGIN;
    y = addSectionTitle(doc, `Charts (${chartImages.length})`, y);

    for (const img of chartImages) {
      const aspectRatio = img.height / img.width;
      const imgWidth = CONTENT_WIDTH;
      const imgHeight = imgWidth * aspectRatio;
      const finalHeight = Math.min(imgHeight, MAX_CHART_H);
      const finalWidth =
        finalHeight < imgHeight ? finalHeight / aspectRatio : imgWidth;

      const blockHeight = 10 + finalHeight + 8;

      if (y + blockHeight > MAX_Y) {
        doc.addPage();
        y = MARGIN;
      }

      y = addSectionTitle(doc, img.title, y);

      try {
        doc.addImage(img.dataUrl, "PNG", MARGIN, y, finalWidth, finalHeight);
        y += finalHeight + 8;
      } catch {
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

/**
 * Serialize a live SVG element directly (no cloneNode — that breaks
 * namespaces and produces blank or purple-filled exports).
 * Injects a background rect via string manipulation and fixes percentage-based
 * CSS dimensions that break standalone rendering.
 */
function serializeSvgWithBg(
  svgElement: Element,
  bgColor: string,
): { svg: string; width: number; height: number } | null {
  const rect = svgElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  let svg = new XMLSerializer().serializeToString(svgElement);

  const openTag = svg.match(/<svg[^>]*>/);
  if (!openTag) return null;

  // Recharts sets style="width:100%;height:100%" for responsive layout.
  // Strip percentage dimensions so the SVG renders at its intrinsic pixel size
  // when used standalone (blob → createImageBitmap / <img>).
  let tag = openTag[0];
  tag = tag.replace(/style="([^"]*)"/, (_m: string, styles: string) => {
    const kept = styles
      .split(";")
      .map((p) => p.trim())
      .filter((p) => {
        const name = p.split(":")[0]?.trim().toLowerCase();
        return name && name !== "width" && name !== "height";
      })
      .join("; ");
    return kept ? `style="${kept}"` : "";
  });
  tag = tag.replace(/\bwidth="[^"]*"/, `width="${rect.width}"`);
  tag = tag.replace(/\bheight="[^"]*"/, `height="${rect.height}"`);

  const bgRect = `<rect width="${rect.width}" height="${rect.height}" fill="${bgColor}"/>`;
  svg = tag + bgRect + svg.slice(openTag[0].length);

  return { svg, width: rect.width, height: rect.height };
}

/** Convert an SVG string to a PNG data URL via createImageBitmap + canvas */
async function svgStringToPng(
  svgString: string,
  width: number,
  height: number,
): Promise<string | null> {
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });

  try {
    const bitmap = await createImageBitmap(svgBlob);
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL("image/png");
  } catch {
    return new Promise((resolve) => {
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
}

/**
 * Capture all chart SVGs from the DOM and convert them to PNG data URLs.
 */
export async function captureChartImages(
  charts: ChartConfig[],
): Promise<ChartImage[]> {
  // Iterate per responsive-container so we pick exactly one SVG per chart.
  // Recharts v3 legend icons are also <svg class="recharts-surface"> (14×14),
  // so we select the largest SVG inside each container.
  const containers = document.querySelectorAll(
    ".recharts-responsive-container",
  );
  if (containers.length === 0) return [];

  const results: ChartImage[] = [];

  for (let i = 0; i < containers.length; i++) {
    const container = containers[i]!;
    const chart = charts[i];
    const title = chart?.title ?? `Chart ${i + 1}`;

    const allSvgs = container.querySelectorAll("svg.recharts-surface");
    let svgElement: Element | null = null;
    let maxArea = 0;
    for (const svg of allSvgs) {
      const r = svg.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > maxArea) {
        maxArea = area;
        svgElement = svg;
      }
    }
    if (!svgElement) continue;

    const serialized = serializeSvgWithBg(svgElement, "#ffffff");
    if (!serialized) continue;

    const dataUrl = await svgStringToPng(
      serialized.svg,
      serialized.width,
      serialized.height,
    );
    if (dataUrl) {
      results.push({
        title,
        dataUrl,
        width: serialized.width,
        height: serialized.height,
      });
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

  const MAX_Y = 280; // leave room for footer
  const MAX_CHART_H = 120; // cap so ≥2 charts fit per page
  let y = 45; // after header on first page

  for (const img of chartImages) {
    const aspectRatio = img.height / img.width;
    const imgWidth = CONTENT_WIDTH;
    const imgHeight = imgWidth * aspectRatio;
    const finalHeight = Math.min(imgHeight, MAX_CHART_H);
    const finalWidth =
      finalHeight < imgHeight ? finalHeight / aspectRatio : imgWidth;

    // title (10mm) + image + spacing (8mm)
    const blockHeight = 10 + finalHeight + 8;

    if (y + blockHeight > MAX_Y) {
      doc.addPage();
      y = MARGIN;
    }

    y = addSectionTitle(doc, img.title, y);

    try {
      doc.addImage(img.dataUrl, "PNG", MARGIN, y, finalWidth, finalHeight);
    } catch {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`[Could not embed chart: ${img.title}]`, MARGIN, y);
    }

    y += finalHeight + 8;
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
