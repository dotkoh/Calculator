import { jsPDF } from "jspdf";

const BLUE = "#256BF6";
const NAVY = "#1E2A3A";
const CYAN = "#00D6C6";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";

interface ChannelInputs {
  patientEnquiries: number;
  coordResponsesPerPatient: number;
  faqResponsesPerPatient: number;
  schedulingRequests: number;
  appointmentsPerMonth: number;
  surveyBlasts: number;
  marketingBlasts: number;
}

interface ChannelCosts {
  coordCredits: number;
  faqCredits: number;
  schedCredits: number;
  totalCredits: number;
  totalServiceMessages: number;
  utilityOrTransactionalMessages: number;
  totalMarketingMessages: number;
  totalMessages: number;
  channelFees: number;
  channelFeeDetails: { label: string; amount: number; count: number }[];
  botmdMessaging: number;
}

interface PDFData {
  market: string;
  whatsappMarket: string;
  planName: string;
  includedCredits: number;
  overageCredits: number;
  enabledChannels: string[];
  channelInputs: Record<string, ChannelInputs>;
  costs: {
    perChannel: Record<string, ChannelCosts>;
    planLabel: string;
    includedCredits: number;
    totalCredits: number;
    overageCredits: number;
    aiCreditsCost: number;
    totalBotmdMessaging: number;
    totalChannelFees: number;
    totalMessages: number;
    totalPatients: number;
    grandTotal: number;
  };
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  viber: "Viber",
};

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function num(v: number) { return v.toLocaleString(); }

async function loadLogoAsDataURL(): Promise<string | null> {
  try {
    const res = await fetch("/botmd-logo.png");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generatePricingPDF(data: PDFData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 20;

  const logoDataURL = await loadLogoAsDataURL();
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ── Helper: check page break ──
  function checkPageBreak(needed: number) {
    if (y + needed > ph - 25) {
      doc.addPage();
      y = 20;
    }
  }

  // ── Header ──
  if (logoDataURL) {
    doc.addImage(logoDataURL, "PNG", margin, 12, 38, 14);
  } else {
    doc.setTextColor(BLUE);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("botmd", margin, 22);
  }

  doc.setFontSize(14);
  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.text("Pricing Estimate", margin, 34);

  doc.setFontSize(9);
  doc.setTextColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(today, pw - margin, 18, { align: "right" });

  const channelList = data.enabledChannels.map((c) => CHANNEL_LABELS[c] || c).join(" + ");
  doc.text(`${data.planName} Plan · ${channelList}`, pw - margin, 25, { align: "right" });

  doc.setDrawColor(BLUE);
  doc.setLineWidth(1.2);
  doc.line(margin, 40, margin + contentW, 40);

  y = 48;

  // ── Grand Total Box ──
  doc.setFillColor("#EFF6FF");
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "F");
  doc.setDrawColor(BLUE);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "S");

  doc.setFontSize(11);
  doc.setTextColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.text("ESTIMATED MONTHLY TOTAL", margin + 8, y + 10);

  doc.setFontSize(24);
  doc.setTextColor(BLUE);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(data.costs.grandTotal), margin + 8, y + 23);

  doc.setFontSize(10);
  doc.setTextColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(`${num(data.costs.totalPatients)} patients/month · ${channelList}`, pw - margin - 8, y + 18, { align: "right" });

  if (data.costs.totalPatients > 0) {
    doc.setFontSize(9);
    doc.text(`${fmt(data.costs.grandTotal / data.costs.totalPatients)} per patient`, pw - margin - 8, y + 24, { align: "right" });
  }

  y += 38;

  // ── Per-Channel Inputs ──
  for (const chId of data.enabledChannels) {
    const inp = data.channelInputs[chId];
    if (!inp) continue;
    const label = CHANNEL_LABELS[chId] || chId;

    checkPageBreak(50);
    y = sectionTitle(doc, `${label} — Inputs`, y, margin);

    const rows = [
      ["Monthly patient enquiries", num(inp.patientEnquiries)],
      ["Coordinating Agent responses / patient", `${inp.coordResponsesPerPatient} responses`],
      ["FAQ Agent responses / patient", `${inp.faqResponsesPerPatient} responses`],
      ["Scheduling requests / month", `${num(inp.schedulingRequests)} (3 resp × 3 cr each)`],
      ["Appointments / month", num(inp.appointmentsPerMonth)],
      ...(inp.surveyBlasts > 0 ? [["Patient surveys & reminders", num(inp.surveyBlasts)]] : []),
      ...(inp.marketingBlasts > 0 ? [["Marketing blasts", num(inp.marketingBlasts)]] : []),
    ];

    y = drawTable(doc, rows, y, margin, contentW);
    y += 6;
  }

  // ── Per-Channel Costs ──
  for (const chId of data.enabledChannels) {
    const chCosts = data.costs.perChannel[chId];
    if (!chCosts) continue;
    const label = CHANNEL_LABELS[chId] || chId;

    checkPageBreak(60);
    y = sectionTitle(doc, `${label} — Costs`, y, margin);

    const rows: string[][] = [];

    // Channel fees
    rows.push([`${label} Channel Fees`, "", ""]);
    for (const detail of chCosts.channelFeeDetails) {
      if (detail.label === "No channel fees") {
        rows.push(["  No channel fees", `${num(detail.count)} msgs`, "$0.00"]);
      } else if (detail.label === "Service messages") {
        rows.push(["  Service messages", `${num(detail.count)} msgs`, "Free"]);
      } else {
        rows.push([`  ${detail.label}`, `${num(detail.count)} msgs`, fmt(detail.amount)]);
      }
    }
    rows.push(["  Subtotal", "", fmt(chCosts.channelFees)]);

    // Bot MD Messaging for this channel
    rows.push(["", "", ""]);
    rows.push(["Bot MD Messaging", "", ""]);
    rows.push(["  Messages delivered", `${num(chCosts.totalMessages)} × $0.005`, fmt(chCosts.botmdMessaging)]);

    // AI Credits for this channel
    rows.push(["", "", ""]);
    rows.push(["AI Credits Used", "", ""]);
    rows.push(["  Coordinating Agent", `${num(chCosts.coordCredits)} credits`, ""]);
    rows.push(["  FAQ Agent", `${num(chCosts.faqCredits)} credits`, ""]);
    rows.push(["  Scheduling Agent", `${num(chCosts.schedCredits)} credits`, ""]);
    rows.push(["  Channel subtotal", `${num(chCosts.totalCredits)} credits`, ""]);

    y = drawTable(doc, rows, y, margin, contentW, true);
    y += 6;
  }

  // ── Pooled AI Credits Summary ──
  checkPageBreak(50);
  y = sectionTitle(doc, "Pooled AI Credits", y, margin);

  const creditRows: string[][] = [];
  for (const chId of data.enabledChannels) {
    const chCosts = data.costs.perChannel[chId];
    if (!chCosts) continue;
    creditRows.push([`  ${CHANNEL_LABELS[chId] || chId}`, `${num(chCosts.totalCredits)} credits`, ""]);
  }
  creditRows.push(["  Total credits used", `${num(data.costs.totalCredits)} credits`, ""]);
  creditRows.push([`  Plan allowance (${data.planName})`, `−${num(data.includedCredits)} credits`, ""]);
  creditRows.push(["  Overage", `${num(data.overageCredits)} × $0.045`, fmt(data.costs.aiCreditsCost)]);

  y = drawTable(doc, creditRows, y, margin, contentW, true);
  y += 6;

  // ── Grand Total Summary ──
  checkPageBreak(40);
  y = sectionTitle(doc, "Cost Summary", y, margin);

  const summaryRows: string[][] = [];
  summaryRows.push(["Channel fees total", "", fmt(data.costs.totalChannelFees)]);
  summaryRows.push(["Bot MD Messaging total", `${num(data.costs.totalMessages)} msgs`, fmt(data.costs.totalBotmdMessaging)]);
  summaryRows.push(["AI Credits overage", `${num(data.overageCredits)} credits`, fmt(data.costs.aiCreditsCost)]);

  y = drawTable(doc, summaryRows, y, margin, contentW, true);
  y += 4;

  // ── Total line ──
  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  doc.setFontSize(12);
  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", margin, y);
  doc.text(fmt(data.costs.grandTotal), margin + contentW, y, { align: "right" });
  y += 12;

  // ── Footer / Disclaimers ──
  checkPageBreak(25);
  doc.setFontSize(7.5);
  doc.setTextColor("#9CA3AF");
  doc.setFont("helvetica", "normal");
  const disclaimers = [
    "WhatsApp rates effective January 1, 2026. Rates subject to change by Meta.",
    "Service messages within the 24hr customer service window are free from WhatsApp.",
    "Viber rates based on Philippines (PHP). USD conversion at PHP 56 = $1.",
    "Volume tier discounts not included. Actual costs may vary.",
    `Generated on ${today} by Bot MD Pricing Calculator.`,
  ];
  disclaimers.forEach((d) => {
    doc.text(d, margin, y);
    y += 4;
  });

  // ── Save ──
  doc.save(`BotMD_Pricing_Estimate_${data.market.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Helpers ──

function sectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  doc.setFontSize(11);
  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 2;
  doc.setDrawColor(CYAN);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 30, y);
  return y + 5;
}

function drawTable(doc: jsPDF, rows: string[][], y: number, margin: number, contentW: number, threeCol = false): number {
  doc.setFontSize(9);

  rows.forEach((row, i) => {
    if (row.every((c) => c === "")) {
      y += 2;
      return;
    }

    const isHeader = !row[0].startsWith("  ") && row.length >= 3 && row[1] === "" && row[2] === "";
    const isSubtotal = row[0].includes("Subtotal") || row[0].includes("Total");

    if (i % 2 === 0 && !isHeader) {
      doc.setFillColor(LIGHT_GRAY);
      doc.rect(margin, y - 3.5, contentW, 5.5, "F");
    }

    if (isHeader) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(NAVY);
    } else if (isSubtotal) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(NAVY);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#374151");
    }

    const label = row[0].replace(/^ {2}/, "");
    const indent = row[0].startsWith("  ") ? 4 : 0;
    doc.text(label, margin + indent, y);

    if (threeCol && row.length >= 3) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GRAY);
      doc.text(row[1], margin + contentW * 0.55, y);

      if (row[2] === "Free" || row[2] === "$0.00") {
        doc.setTextColor(CYAN);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(NAVY);
      }
      doc.text(row[2], margin + contentW, y, { align: "right" });
    } else if (row.length >= 2) {
      doc.setTextColor(NAVY);
      doc.text(row[1], margin + contentW, y, { align: "right" });
    }

    y += 5.5;
  });

  return y;
}
