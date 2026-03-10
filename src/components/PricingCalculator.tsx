"use client";

import { useState, useMemo, useCallback } from "react";
import { whatsappRates, seAsiaMarketMap, getRateForMarket } from "@/data/whatsappRates";

const BOTMD_MSG_FEE = 0.005;
const CREDIT_PRICE = 0.045;

const PLANS = [
  { id: "starter", label: "Starter", credits: 1_000 },
  { id: "pro", label: "Pro", credits: 3_000 },
  { id: "enterprise", label: "Enterprise", credits: 10_000 },
] as const;

function buildMarketOptions() {
  const seAsiaOptions = Object.entries(seAsiaMarketMap).map(([country, market]) => ({
    label: country, value: country, whatsappMarket: market,
  }));
  const seAsiaWhatsappMarkets = new Set(Object.values(seAsiaMarketMap));
  const otherOptions = whatsappRates
    .filter((r) => !seAsiaWhatsappMarkets.has(r.market) || r.market === "Indonesia" || r.market === "Malaysia")
    .map((r) => ({ label: r.market, value: r.market, whatsappMarket: r.market }));
  return { seAsiaOptions, otherOptions };
}
const { seAsiaOptions, otherOptions } = buildMarketOptions();

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function num(v: number) { return v.toLocaleString(); }

function BotMDLogo({ height = 48 }: { height?: number }) {
  return <img src="/botmd-logo.png" alt="Bot MD" height={height} style={{ height: `${height}px`, width: "auto" }} className="object-contain" />;
}

export default function PricingCalculator() {
  // ── Inputs ──
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [selectedMarket, setSelectedMarket] = useState("Singapore");
  const [patientEnquiries, setPatientEnquiries] = useState(3000);
  const [coordResponsesPerPatient, setCoordResponsesPerPatient] = useState(2);
  const [faqResponsesPerPatient, setFaqResponsesPerPatient] = useState(2);
  const [schedulingRequests, setSchedulingRequests] = useState(500);
  const [appointmentsPerMonth, setAppointmentsPerMonth] = useState(800);
  const [surveyBlasts, setSurveyBlasts] = useState(500);
  const [marketingBlasts, setMarketingBlasts] = useState(0);

  const whatsappMarket = useMemo(() => seAsiaMarketMap[selectedMarket] || selectedMarket, [selectedMarket]);
  const rate = useMemo(() => getRateForMarket(whatsappMarket), [whatsappMarket]);

  // ── Derived calculations ──
  const costs = useMemo(() => {
    if (!rate) return null;

    // AI Credits
    const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];
    const includedCredits = plan.credits;
    const coordCredits = patientEnquiries * coordResponsesPerPatient * 1;
    const faqCredits = patientEnquiries * faqResponsesPerPatient * 1;
    const schedCredits = schedulingRequests * 3;
    const totalCredits = coordCredits + faqCredits + schedCredits;
    const overageCredits = Math.max(0, totalCredits - includedCredits);
    const aiCreditsCost = overageCredits * CREDIT_PRICE;

    // Messages breakdown
    const serviceMessages = patientEnquiries * (coordResponsesPerPatient + faqResponsesPerPatient);
    const schedServiceMessages = schedulingRequests * 3;
    const utilityTemplates = appointmentsPerMonth * 2;
    const totalServiceMessages = serviceMessages + schedServiceMessages;
    const totalMarketingTemplates = surveyBlasts + marketingBlasts;
    const totalMessages = totalServiceMessages + utilityTemplates + totalMarketingTemplates;

    // WhatsApp fees
    const waMarketingCost = rate.marketing * totalMarketingTemplates;
    const whatsappTotal = waMarketingCost;

    // Bot MD messaging fee
    const botmdMessaging = totalMessages * BOTMD_MSG_FEE;

    const grandTotal = whatsappTotal + botmdMessaging + aiCreditsCost;

    return {
      planLabel: plan.label, includedCredits, overageCredits,
      coordCredits, faqCredits, schedCredits, totalCredits, aiCreditsCost,
      serviceMessages, schedServiceMessages, totalServiceMessages,
      utilityTemplates, totalMarketingTemplates,
      totalMessages,
      waMarketingCost, whatsappTotal,
      botmdMessaging, grandTotal,
    };
  }, [rate, selectedPlan, patientEnquiries, coordResponsesPerPatient, faqResponsesPerPatient, schedulingRequests, appointmentsPerMonth, surveyBlasts, marketingBlasts]);

  // ── PDF Download ──
  const handleDownloadPDF = useCallback(async () => {
    if (!costs) return;
    const { generatePricingPDF } = await import("./generatePDF");
    generatePricingPDF({
      market: selectedMarket,
      whatsappMarket,
      planName: costs.planLabel,
      includedCredits: costs.includedCredits,
      overageCredits: costs.overageCredits,
      patientEnquiries,
      coordResponsesPerPatient,
      faqResponsesPerPatient,
      schedulingRequests,
      appointmentsPerMonth,
      surveyBlasts,
      marketingBlasts,
      costs,
    });
  }, [costs, selectedPlan, selectedMarket, whatsappMarket, patientEnquiries, coordResponsesPerPatient, faqResponsesPerPatient, schedulingRequests, appointmentsPerMonth, surveyBlasts, marketingBlasts]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <header className="text-center mb-10">
        <div className="flex items-center justify-center mb-4">
          <BotMDLogo height={56} />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-[var(--botmd-navy)]">Pricing Calculator</h2>
        <p className="text-gray-400 mt-2 max-w-lg mx-auto">
          Estimate your monthly WhatsApp messaging &amp; AI agent costs
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Inputs ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Market */}
          <Card>
            <SectionHeader icon="🌏" title="Market / Country" />
            <p className="text-sm text-gray-400 mb-3">WhatsApp rates vary by recipient country.</p>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-[var(--botmd-navy)] focus:ring-2 focus:ring-[var(--botmd-blue)] focus:border-transparent outline-none transition"
            >
              <optgroup label="Southeast Asia">
                {seAsiaOptions.map((o) => <option key={o.value} value={o.value}>{o.label} → {o.whatsappMarket}</option>)}
              </optgroup>
              <optgroup label="All Markets">
                {otherOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            </select>
            {rate && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Pill color="blue">Marketing: {fmt(rate.marketing)}/msg</Pill>
                <Pill color="cyan">Utility: {fmt(rate.utility)}/msg</Pill>
                <Pill color="gray">Service: Free</Pill>
              </div>
            )}
          </Card>

          {/* Subscription Plan */}
          <Card>
            <SectionHeader icon="⭐" title="Subscription Plan" />
            <p className="text-sm text-gray-400 mb-3">Each plan includes a monthly AI credit allowance. Overage credits are charged at $0.045 each.</p>
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map((plan) => {
                const active = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative rounded-xl border-2 px-4 py-4 text-left transition-all cursor-pointer ${
                      active
                        ? "border-[var(--botmd-blue)] bg-blue-50/60 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--botmd-blue)] flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                    <span className={`block text-sm font-semibold ${active ? "text-[var(--botmd-blue)]" : "text-[var(--botmd-navy)]"}`}>
                      {plan.label}
                    </span>
                    <span className="block text-xs text-gray-400 mt-1">
                      {num(plan.credits)} credits/mo
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 1. Patient Enquiry Volume */}
          <Card>
            <SectionHeader icon="🏥" title="Patient Enquiry Volume" />
            <p className="text-sm text-gray-400 mb-4">How many patients message your WhatsApp each month?</p>
            <BigNumberInput label="Monthly patient enquiries" value={patientEnquiries} onChange={setPatientEnquiries} />
          </Card>

          {/* 2. AI Agent Responses per Patient */}
          <Card>
            <SectionHeader icon="🤖" title="AI Agent Responses per Patient" />
            <p className="text-sm text-gray-400 mb-4">
              Each patient enquiry triggers AI agents. Adjust the average responses per patient.
            </p>
            <div className="space-y-3">
              <AgentPerPatientRow agent="Coordinating Agent" description="Greets the patient, takes consent" creditsPerResponse={1} responsesPerPatient={coordResponsesPerPatient} onChangeResponses={setCoordResponsesPerPatient} patients={patientEnquiries} />
              <AgentPerPatientRow agent="FAQ Agent" description="Answers questions about clinic hours, location, services" creditsPerResponse={1} responsesPerPatient={faqResponsesPerPatient} onChangeResponses={setFaqResponsesPerPatient} patients={patientEnquiries} />
            </div>
          </Card>

          {/* 3. Scheduling Requests */}
          <Card>
            <SectionHeader icon="📅" title="Scheduling Requests" />
            <p className="text-sm text-gray-400 mb-4">
              How many patients request to book, reschedule, or cancel an appointment via WhatsApp?
            </p>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <BigNumberInput label="Scheduling requests / month" value={schedulingRequests} onChange={setSchedulingRequests} />
              </div>
              <div className="pt-7 text-xs text-gray-400 flex-shrink-0 text-right">
                <span className="block font-medium text-[var(--botmd-navy)]">{num(schedulingRequests * 3)} credits</span>
                <span>3 credits per request</span>
              </div>
            </div>
          </Card>

          {/* 4. Appointments → Utility Templates */}
          <Card>
            <SectionHeader icon="✅" title="Appointment Confirmations &amp; Reminders" />
            <p className="text-sm text-gray-400 mb-4">
              Each appointment triggers 1 booking confirmation + 1 reminder (utility templates).
            </p>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <BigNumberInput label="Appointments / month" value={appointmentsPerMonth} onChange={setAppointmentsPerMonth} />
              </div>
              <div className="pt-7 text-xs text-gray-400 flex-shrink-0 text-right">
                <span className="block font-medium text-[var(--botmd-navy)]">{num(appointmentsPerMonth * 2)} utility templates</span>
                <span>1 confirmation + 1 reminder</span>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-[var(--botmd-cyan-light)] border border-[#c0eeec]">
              <p className="text-xs text-[#007a70]">
                Utility templates sent in response to a patient within the 24hr service window are <strong>free</strong> from WhatsApp.
                Proactive reminders outside the window are charged at the utility rate.
              </p>
            </div>
          </Card>

          {/* 5. Patient Surveys & Reminders → Marketing Templates */}
          <Card>
            <SectionHeader icon="📋" title="Patient Surveys &amp; Reminders" />
            <p className="text-sm text-gray-400 mb-4">
              Outbound patient satisfaction surveys and health reminders. These are classified as <strong>marketing templates</strong> by WhatsApp.
            </p>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <BigNumberInput label="Survey / reminder messages per month" value={surveyBlasts} onChange={setSurveyBlasts} />
              </div>
              <div className="pt-7 text-xs text-gray-400 flex-shrink-0 text-right">
                {rate && (
                  <>
                    <span className="block font-medium text-[var(--botmd-navy)]">{fmt(rate.marketing * surveyBlasts)}</span>
                    <span>WhatsApp marketing rate</span>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* 6. Optional: Marketing Blasts */}
          <Card>
            <SectionHeader icon="📢" title="Marketing Blasts (optional)" />
            <p className="text-sm text-gray-400 mb-4">
              Proactive marketing campaigns sent to patients (charged by WhatsApp as marketing templates).
            </p>
            <BigNumberInput label="Marketing template messages / month" value={marketingBlasts} onChange={setMarketingBlasts} />
          </Card>
        </div>

        {/* ── Right: Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">

            {/* Grand Total */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--botmd-blue)] to-[var(--botmd-blue-dark)] p-6 text-white shadow-xl">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative">
                <p className="text-sm text-blue-100 font-medium tracking-wide uppercase">Estimated Monthly Total</p>
                <p className="text-4xl font-extrabold mt-2 tracking-tight">
                  {costs ? fmt(costs.grandTotal) : "—"}
                </p>
                <p className="text-xs text-blue-200 mt-2">{costs?.planLabel ?? ""} plan · {num(patientEnquiries)} patients / month</p>
              </div>
            </div>

            {/* How it adds up */}
            {costs && (
              <SummaryCard>
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3">How it adds up</h3>

                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Messages Sent</p>
                <div className="space-y-1.5 text-sm mb-4">
                  <SummaryRow label="AI replies (service)" detail={`${num(costs.totalServiceMessages)} msgs`} sub="Free from WhatsApp" />
                  <SummaryRow label="Confirmations + reminders" detail={`${num(costs.utilityTemplates)} utility`} sub="Free within 24hr window" />
                  {costs.totalMarketingTemplates > 0 && (
                    <SummaryRow label="Surveys + marketing" detail={`${num(costs.totalMarketingTemplates)} msgs`} />
                  )}
                  <div className="text-xs text-gray-400 pt-1">Total: {num(costs.totalMessages)} messages</div>
                </div>

                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">WhatsApp Channel Fees</p>
                <div className="space-y-1.5 text-sm mb-4">
                  <CostRow label="Service messages" amount={0} free />
                  <CostRow label="Utility templates" detail="within 24hr window" amount={0} free />
                  {costs.totalMarketingTemplates > 0 && (
                    <CostRow label="Marketing templates" detail={`${num(costs.totalMarketingTemplates)} msgs`} amount={costs.waMarketingCost} />
                  )}
                  <Divider />
                  <CostRow label="WhatsApp subtotal" amount={costs.whatsappTotal} bold />
                </div>

                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Bot MD Messaging</p>
                <div className="space-y-1.5 text-sm mb-4">
                  <CostRow label="Messages delivered" detail={`${num(costs.totalMessages)} × $0.005`} amount={costs.botmdMessaging} />
                </div>

                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Bot MD AI Credits</p>
                <div className="space-y-1.5 text-sm">
                  <CostRow label="Coordinating" detail={`${num(costs.coordCredits)} cr`} amount={costs.coordCredits * CREDIT_PRICE} />
                  <CostRow label="FAQ" detail={`${num(costs.faqCredits)} cr`} amount={costs.faqCredits * CREDIT_PRICE} />
                  <CostRow label="Scheduling" detail={`${num(costs.schedCredits)} cr`} amount={costs.schedCredits * CREDIT_PRICE} />
                  <div className="text-xs text-gray-400 pt-1">Total used: {num(costs.totalCredits)} credits</div>
                  <div className="flex items-center justify-between text-[var(--botmd-cyan)] font-medium">
                    <span>{costs.planLabel} plan allowance</span>
                    <span>−{num(costs.includedCredits)} cr</span>
                  </div>
                  <Divider />
                  <CostRow label={`Overage: ${num(costs.overageCredits)} cr × $0.045`} amount={costs.aiCreditsCost} bold />
                </div>
              </SummaryCard>
            )}

            {/* Cost Split */}
            {costs && costs.grandTotal > 0 && (
              <SummaryCard>
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3">Cost Breakdown</h3>
                <div className="space-y-3">
                  {costs.whatsappTotal > 0 && (
                    <CostBar label="WhatsApp Fees" amount={costs.whatsappTotal} total={costs.grandTotal} color="bg-emerald-400" />
                  )}
                  <CostBar label="Bot MD Messaging" amount={costs.botmdMessaging} total={costs.grandTotal} color="bg-[var(--botmd-cyan)]" />
                  <CostBar label="Bot MD AI Credits" amount={costs.aiCreditsCost} total={costs.grandTotal} color="bg-[var(--botmd-blue)]" />
                </div>
              </SummaryCard>
            )}

            {/* Per patient */}
            {costs && costs.grandTotal > 0 && patientEnquiries > 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Cost per patient enquiry</p>
                <p className="text-2xl font-bold text-[var(--botmd-navy)] mt-1">
                  {fmt(costs.grandTotal / patientEnquiries)}
                </p>
              </div>
            )}

            {/* Download PDF */}
            {costs && (
              <button
                onClick={handleDownloadPDF}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-[var(--botmd-navy)] hover:bg-gray-50 hover:border-[var(--botmd-blue)] transition-all cursor-pointer shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-gray-400 space-y-1">
        <p>WhatsApp rates effective January 1, 2026. Rates subject to change by Meta.</p>
        <p>Service and utility messages within the 24hr customer service window are free from WhatsApp.</p>
        <p>Volume tier discounts not included. Actual costs may vary.</p>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function Card({ children }: { children: React.ReactNode }) {
  return <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">{children}</section>;
}
function SummaryCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">{children}</div>;
}
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return <h2 className="text-base font-semibold text-[var(--botmd-navy)] mb-1 flex items-center gap-2"><span className="text-lg">{icon}</span> {title}</h2>;
}
function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  const styles: Record<string, string> = {
    blue: "bg-blue-50 text-[var(--botmd-blue)]",
    cyan: "bg-[var(--botmd-cyan-light)] text-[#009e93]",
    gray: "bg-gray-100 text-gray-500",
  };
  return <span className={`px-3 py-1 rounded-full font-medium text-xs ${styles[color] || styles.gray}`}>{children}</span>;
}
function Divider() {
  return <div className="border-t border-gray-100 pt-2 mt-2" />;
}

function BigNumberInput({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--botmd-navy)] block mb-1">{label}</label>
      <input type="number" min={0} value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-lg font-semibold text-[var(--botmd-navy)] focus:ring-2 focus:ring-[var(--botmd-blue)] focus:border-transparent outline-none transition"
      />
    </div>
  );
}

function AgentPerPatientRow({ agent, description, creditsPerResponse, responsesPerPatient, onChangeResponses, patients }: {
  agent: string; description: string; creditsPerResponse: number;
  responsesPerPatient: number; onChangeResponses: (v: number) => void; patients: number;
}) {
  const totalCredits = patients * responsesPerPatient * creditsPerResponse;
  return (
    <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-[var(--botmd-navy)]">{agent}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide bg-[var(--botmd-cyan-light)] text-[#009e93] px-2 py-0.5 rounded-full">
          {creditsPerResponse} credit / response
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-3">{description}</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <input type="number" min={0} value={responsesPerPatient}
            onChange={(e) => onChangeResponses(Math.max(0, Number(e.target.value)))}
            className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-center font-semibold text-[var(--botmd-navy)] bg-white focus:ring-2 focus:ring-[var(--botmd-blue)] focus:border-transparent outline-none transition"
          />
          <span className="text-sm text-gray-400">responses / patient</span>
        </div>
        <div className="text-right text-xs text-gray-400 flex-shrink-0">
          <span className="block font-medium text-[var(--botmd-navy)]">{num(totalCredits)} credits</span>
          <span>{num(patients)} × {responsesPerPatient} × {creditsPerResponse}</span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, detail, sub }: { label: string; detail: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between text-gray-500">
      <div>
        <span>{label}</span>
        {sub && <span className="block text-[11px] text-[var(--botmd-cyan)]">{sub}</span>}
      </div>
      <span className="text-[11px] text-gray-400 whitespace-nowrap">{detail}</span>
    </div>
  );
}

function CostRow({ label, detail, amount, bold, free }: {
  label: string; detail?: string; amount: number; bold?: boolean; free?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-[var(--botmd-navy)]" : "text-gray-500"}`}>
      <div className="truncate pr-2">
        <span>{label}</span>
        {detail && <span className="text-[11px] text-gray-400 ml-1">({detail})</span>}
      </div>
      <span className={`whitespace-nowrap ${free ? "text-[var(--botmd-cyan)] font-medium" : ""}`}>{free ? "Free" : fmt(amount)}</span>
    </div>
  );
}

function CostBar({ label, amount, total, color }: {
  label: string; amount: number; total: number; color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium">{fmt(amount)} <span className="text-gray-400">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
