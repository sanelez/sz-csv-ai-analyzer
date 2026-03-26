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

export interface PDFExportOptions {
  fileName?: string;
  data: CSVData;
  summary?: DataSummaryResult | null;
  anomalies?: AnomalyResult[] | null;
  chatHistory?: ChatMessage[];
  charts?: ChartConfig[];
  maxDataRows?: number;
}

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/** Strip markdown formatting for plain-text PDF rendering */
function stripMarkdown(text: string): string {
  return (
    text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^[-*+]\s/gm, "- ")
      // Strip LaTeX math delimiters but keep content
      .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
      .replace(/\$(.*?)\$/g, "$1")
      .replace(/\\\[[\s\S]*?\\\]/g, (m) => m.slice(2, -2))
      .replace(/\\\(.*?\\\)/g, (m) => m.slice(2, -2))
      // Clean up common LaTeX commands for plain text
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1/$2)")
      .replace(/\\sqrt\{([^}]*)\}/g, "sqrt($1)")
      .replace(/\\sum/g, "Sum")
      .replace(/\\bar\{([^}]*)\}/g, "$1_mean")
      .replace(
        /\\(left|right|cdot|times|div|pm|mp|leq|geq|neq|approx|infty)/g,
        (_, cmd) => {
          const symbols: Record<string, string> = {
            left: "",
            right: "",
            cdot: "*",
            times: "x",
            div: "/",
            pm: "+/-",
            mp: "-/+",
            leq: "<=",
            geq: ">=",
            neq: "!=",
            approx: "~",
            infty: "Inf",
          };
          return symbols[cmd] ?? "";
        },
      )
      .replace(/\\_/g, "_")
      .replace(/\\[a-zA-Z]+/g, "")
      .replace(/[{}]/g, "")
      .trim()
  );
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

export function exportToPDF(options: PDFExportOptions) {
  const {
    fileName = "analysis-report",
    data,
    summary,
    anomalies,
    chatHistory,
    charts,
    maxDataRows = 100,
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", {
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
  doc.text("Rapport d'analyse", MARGIN, 28);

  doc.setFontSize(9);
  doc.text(dateStr, MARGIN, 36);

  let y = 55;

  // ─── File overview ───
  y = addSectionTitle(doc, "Fichier", y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);

  const displayName = fileName.replace(/\.(csv|xlsx?)$/i, "") || "untitled";
  const overviewItems = [
    `Nom: ${displayName}`,
    `Lignes: ${data.rowCount.toLocaleString("fr-FR")}`,
    `Colonnes: ${data.headers.length} (${data.headers.slice(0, 10).join(", ")}${data.headers.length > 10 ? "..." : ""})`,
  ];
  for (const item of overviewItems) {
    doc.text(item, MARGIN + 2, y);
    y += 5;
  }
  y += 5;

  // ─── Data table ───
  y = addSectionTitle(doc, "Apercu des donnees", y);

  const displayRows = data.rows.slice(0, maxDataRows);

  // Truncate cell values for readability
  const truncate = (v: string, max = 30) =>
    v.length > max ? v.slice(0, max - 1) + "\u2026" : v;

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
      `Affichage de ${displayRows.length} lignes sur ${data.rowCount.toLocaleString("fr-FR")}`,
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
    y = addSectionTitle(doc, "Resume IA", y);
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
      doc.text("Points cles", MARGIN, y);
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
      doc.text("Qualite des donnees", MARGIN, y);
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
    y = addSectionTitle(doc, `Anomalies detectees (${anomalies.length})`, y);

    const severityLabel = {
      low: "Faible",
      medium: "Moyen",
      high: "Eleve",
    };

    autoTable(doc, {
      startY: y,
      head: [["Ligne", "Colonne", "Valeur", "Probleme", "Severite"]],
      body: anomalies.map((a) => [
        String(a.row),
        a.column,
        truncate(a.value, 25),
        truncate(a.issue, 40),
        severityLabel[a.severity] ?? a.severity,
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
  if (charts && charts.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = MARGIN;
    }
    y = addSectionTitle(doc, `Graphiques generes (${charts.length})`, y);

    const chartTypeLabels: Record<string, string> = {
      bar: "Barres",
      line: "Ligne",
      pie: "Camembert",
      scatter: "Nuage de points",
      area: "Aire",
      histogram: "Histogramme",
      radar: "Radar",
    };

    autoTable(doc, {
      startY: y,
      head: [["Type", "Titre", "Description", "Axe X", "Axe Y"]],
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
    y = addSectionTitle(doc, "Historique des questions", y);

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
