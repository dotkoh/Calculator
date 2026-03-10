import { jsPDF } from "jspdf";

const BLUE = "#256BF6";
const NAVY = "#1E2A3A";
const CYAN = "#00D6C6";
const GRAY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";

interface PDFData {
  market: string;
  whatsappMarket: string;
  planName: string;
  includedCredits: number;
  overageCredits: number;
  patientEnquiries: number;
  coordResponsesPerPatient: number;
  faqResponsesPerPatient: number;
  schedulingRequests: number;
  appointmentsPerMonth: number;
  surveyBlasts: number;
  marketingBlasts: number;
  costs: {
    coordCredits: number;
    faqCredits: number;
    schedCredits: number;
    totalCredits: number;
    includedCredits: number;
    overageCredits: number;
    aiCreditsCost: number;
    totalServiceMessages: number;
    utilityTemplates: number;
    totalMarketingTemplates: number;
    totalMessages: number;
    waUtilityCost: number;
    waMarketingCost: number;
    whatsappTotal: number;
    botmdMessaging: number;
    grandTotal: number;
  };
}

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
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 20;

  // Load logo
  const logoDataURL = await loadLogoAsDataURL();

  // ── Header ──
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Logo + title on white background
  if (logoDataURL) {
    // Logo is 1000×367 (2.72:1 ratio); fit to 38mm wide × 14mm tall
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
  doc.text(`${data.planName} Plan · ${data.market} (${data.whatsappMarket})`, pw - margin, 25, { align: "right" });

  // Blue accent line under header
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
  doc.text(`${num(data.patientEnquiries)} patients/month`, pw - margin - 8, y + 18, { align: "right" });

  if (data.patientEnquiries > 0) {
    doc.setFontSize(9);
    doc.text(`${fmt(data.costs.grandTotal / data.patientEnquiries)} per patient`, pw - margin - 8, y + 24, { align: "right" });
  }

  y += 38;

  // ── Assumptions ──
  y = sectionTitle(doc, "Your Inputs", y, margin);

  const assumptions = [
    ["Subscription plan", `${data.planName} (${num(data.includedCredits)} credits/mo)`],
    ["Monthly patient enquiries", num(data.patientEnquiries)],
    ["Coordinating Agent responses / patient", `${data.coordResponsesPerPatient} responses`],
    ["FAQ Agent responses / patient", `${data.faqResponsesPerPatient} responses`],
    ["Scheduling requests / month", `${num(data.schedulingRequests)} (3 responses × 3 cr each)`],
    ["Appointments / month", num(data.appointmentsPerMonth)],
    ...(data.surveyBlasts > 0 ? [["Patient surveys & reminders / month", num(data.surveyBlasts)]] : []),
    ...(data.marketingBlasts > 0 ? [["Marketing blasts / month", num(data.marketingBlasts)]] : []),
  ];

  y = drawTable(doc, assumptions, y, margin, contentW);
  y += 6;

  // ── Messages Summary ──
  y = sectionTitle(doc, "Messages Summary", y, margin);

  // Per-message marketing rate (derived from total)
  const mktRate = data.costs.totalMarketingTemplates > 0
    ? data.costs.waMarketingCost / data.costs.totalMarketingTemplates
    : 0;

  const messages = [
    ["AI replies (service messages)", `${num(data.costs.totalServiceMessages)} msgs`, "Free from WhatsApp"],
    ["Confirmations + reminders (utility)", `${num(data.costs.utilityTemplates)} msgs`, fmt(data.costs.waUtilityCost)],
    ...(data.surveyBlasts > 0 ? [["Patient surveys & reminders (marketing)", `${num(data.surveyBlasts)} msgs`, fmt(mktRate * data.surveyBlasts)]] : []),
    ...(data.marketingBlasts > 0 ? [["Marketing blasts (marketing)", `${num(data.marketingBlasts)} msgs`, fmt(mktRate * data.marketingBlasts)]] : []),
    ["Total messages", `${num(data.costs.totalMessages)} msgs`, ""],
  ];

  y = drawTable(doc, messages, y, margin, contentW, true);
  y += 6;

  // ── Cost Breakdown ──
  y = sectionTitle(doc, "Cost Breakdown", y, margin);

  const breakdown = [
    ["WhatsApp Channel Fees", "", ""],
    ["  Service messages", "Free from WhatsApp", "$0.00"],
    ["  Utility templates", `${num(data.costs.utilityTemplates)} msgs`, fmt(data.costs.waUtilityCost)],
    ...(data.surveyBlasts > 0 ? [["  Surveys & reminders", `${num(data.surveyBlasts)} msgs`, fmt(mktRate * data.surveyBlasts)]] : []),
    ...(data.marketingBlasts > 0 ? [["  Marketing blasts", `${num(data.marketingBlasts)} msgs`, fmt(mktRate * data.marketingBlasts)]] : []),
    ["  Subtotal", "", fmt(data.costs.whatsappTotal)],
    ["", "", ""],
    ["Bot MD Messaging", "", ""],
    ["  Messages delivered", `${num(data.costs.totalMessages)} × $0.005`, fmt(data.costs.botmdMessaging)],
    ["", "", ""],
    ["Bot MD AI Credits", "", ""],
    ["  Coordinating Agent", `${num(data.costs.coordCredits)} credits`, ""],
    ["  FAQ Agent", `${num(data.costs.faqCredits)} credits`, ""],
    ["  Scheduling Agent", `${num(data.costs.schedCredits)} credits`, ""],
    ["  Total credits used", `${num(data.costs.totalCredits)} credits`, ""],
    ["  Plan allowance (" + data.planName + ")", `−${num(data.includedCredits)} credits`, ""],
    ["  Overage", `${num(data.overageCredits)} credits × $0.045`, fmt(data.costs.aiCreditsCost)],
  ];

  y = drawTable(doc, breakdown, y, margin, contentW, true);
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
  doc.setFontSize(7.5);
  doc.setTextColor("#9CA3AF");
  doc.setFont("helvetica", "normal");
  const disclaimers = [
    "WhatsApp rates effective January 1, 2026. Rates subject to change by Meta.",
    "Service messages within the 24hr customer service window are free from WhatsApp.",
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
    // Empty row = spacer
    if (row.every((c) => c === "")) {
      y += 2;
      return;
    }

    // Section headers (no indent)
    const isHeader = !row[0].startsWith("  ") && row[1] === "" && row[2] === "";
    const isSubtotal = row[0].includes("Subtotal") || row[0] === "Total messages";

    // Alternate row bg
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

      if (row[2] === "Free from WhatsApp") {
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
