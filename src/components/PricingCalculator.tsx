"use client";

import { useState, useMemo } from "react";
import { whatsappRates, seAsiaMarketMap, getRateForMarket } from "@/data/whatsappRates";

const BOTMD_MESSAGING_FEE = 0.005;
const AI_CREDIT_PRICE = 0.045;

const AGENT_CREDITS: Record<string, { label: string; credits: number; description: string }> = {
  faq: { label: "FAQ Agent", credits: 1, description: "Simple queries like clinic hours, location" },
  coordinating: { label: "Coordinating Agent", credits: 1, description: "Greetings, consent collection" },
  scheduling: { label: "Scheduling Agent", credits: 3, description: "Appointment booking workflows" },
  dataCollection: { label: "Data Collection / Patient Survey Agent", credits: 2, description: "Patient intake forms, surveys" },
};

function buildMarketOptions() {
  const seAsiaOptions = Object.entries(seAsiaMarketMap).map(([country, market]) => ({
    label: country,
    value: country,
    whatsappMarket: market,
  }));
  const seAsiaWhatsappMarkets = new Set(Object.values(seAsiaMarketMap));
  const otherOptions = whatsappRates
    .filter((r) => !seAsiaWhatsappMarkets.has(r.market) || r.market === "Indonesia" || r.market === "Malaysia")
    .map((r) => ({ label: r.market, value: r.market, whatsappMarket: r.market }));
  return { seAsiaOptions, otherOptions };
}

const { seAsiaOptions, otherOptions } = buildMarketOptions();

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/* ── Bot MD Logo (actual image) ── */
function BotMDLogo({ height = 48 }: { height?: number }) {
  return (
    <img
      src="/botmd-logo.png"
      alt="Bot MD"
      height={height}
      style={{ height: `${height}px`, width: "auto" }}
      className="object-contain"
    />
  );
}

export default function PricingCalculator() {
  const [selectedMarket, setSelectedMarket] = useState("Singapore");
  const [marketingMessages, setMarketingMessages] = useState(500);
  const [utilityMessages, setUtilityMessages] = useState(2000);
  const [authMessages, setAuthMessages] = useState(0);
  const [serviceMessages, setServiceMessages] = useState(3000);
  const [utilityFreePercent, setUtilityFreePercent] = useState(80);
  const [faqReplies, setFaqReplies] = useState(2000);
  const [coordinatingReplies, setCoordinatingReplies] = useState(500);
  const [schedulingReplies, setSchedulingReplies] = useState(300);
  const [dataCollectionReplies, setDataCollectionReplies] = useState(200);

  const whatsappMarket = useMemo(() => seAsiaMarketMap[selectedMarket] || selectedMarket, [selectedMarket]);
  const rate = useMemo(() => getRateForMarket(whatsappMarket), [whatsappMarket]);

  const costs = useMemo(() => {
    if (!rate) return null;
    const waMarketing = rate.marketing * marketingMessages;
    const chargedUtility = utilityMessages * (1 - utilityFreePercent / 100);
    const waUtility = rate.utility * chargedUtility;
    const waAuth = rate.authentication * authMessages;
    const whatsappTotal = waMarketing + waUtility + waAuth;
    const totalMessagesSent = marketingMessages + utilityMessages + serviceMessages + authMessages;
    const botmdMessaging = BOTMD_MESSAGING_FEE * totalMessagesSent;
    const faqCredits = faqReplies * 1;
    const coordCredits = coordinatingReplies * 1;
    const schedCredits = schedulingReplies * 3;
    const dataCredits = dataCollectionReplies * 2;
    const totalCredits = faqCredits + coordCredits + schedCredits + dataCredits;
    const botmdAICredits = AI_CREDIT_PRICE * totalCredits;
    const grandTotal = whatsappTotal + botmdMessaging + botmdAICredits;
    return { waMarketing, waUtility, waAuth, whatsappTotal, chargedUtility, totalMessagesSent, botmdMessaging, faqCredits, coordCredits, schedCredits, dataCredits, totalCredits, botmdAICredits, grandTotal };
  }, [rate, marketingMessages, utilityMessages, utilityFreePercent, authMessages, serviceMessages, faqReplies, coordinatingReplies, schedulingReplies, dataCollectionReplies]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* ── Header ── */}
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
                <Pill color="blue">Marketing: {formatUSD(rate.marketing)}/msg</Pill>
                <Pill color="cyan">Utility: {formatUSD(rate.utility)}/msg</Pill>
                <Pill color="violet">Auth: {formatUSD(rate.authentication)}/msg</Pill>
                <Pill color="gray">Service: Free</Pill>
              </div>
            )}
          </Card>

          {/* Message Volumes */}
          <Card>
            <SectionHeader icon="💬" title="Monthly WhatsApp Messages" />
            <p className="text-sm text-gray-400 mb-4">Template and service message volumes.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="Marketing Templates" sublabel="Promos, campaigns" value={marketingMessages} onChange={setMarketingMessages} accent="border-l-[var(--botmd-blue)]" />
              <NumberInput label="Utility Templates" sublabel="Reminders, confirmations" value={utilityMessages} onChange={setUtilityMessages} accent="border-l-[var(--botmd-cyan)]" />
              <NumberInput label="Authentication Templates" sublabel="OTPs, verification" value={authMessages} onChange={setAuthMessages} accent="border-l-violet-400" />
              <NumberInput label="Service (Free-form)" sublabel="AI replies in 24hr window" value={serviceMessages} onChange={setServiceMessages} accent="border-l-gray-300" />
            </div>
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#e8fffe] to-[#eef6ff] border border-[#d0f0ee]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--botmd-navy)]">Utility msgs within 24hr window (free)</span>
                <span className="text-sm font-bold text-[var(--botmd-cyan)]">{utilityFreePercent}%</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={utilityFreePercent} onChange={(e) => setUtilityFreePercent(Number(e.target.value))} className="w-full" />
              <p className="text-xs text-gray-400 mt-1">Utility &amp; service replies within 24hrs are free from WhatsApp.</p>
            </div>
          </Card>

          {/* AI Agents */}
          <Card>
            <SectionHeader icon="🤖" title="Monthly AI Agent Replies" />
            <p className="text-sm text-gray-400 mb-4">Estimated AI-powered replies per agent type.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AgentInput label={AGENT_CREDITS.faq.label} credits={1} description={AGENT_CREDITS.faq.description} value={faqReplies} onChange={setFaqReplies} />
              <AgentInput label={AGENT_CREDITS.coordinating.label} credits={1} description={AGENT_CREDITS.coordinating.description} value={coordinatingReplies} onChange={setCoordinatingReplies} />
              <AgentInput label={AGENT_CREDITS.scheduling.label} credits={3} description={AGENT_CREDITS.scheduling.description} value={schedulingReplies} onChange={setSchedulingReplies} />
              <AgentInput label={AGENT_CREDITS.dataCollection.label} credits={2} description={AGENT_CREDITS.dataCollection.description} value={dataCollectionReplies} onChange={setDataCollectionReplies} />
            </div>
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
                  {costs ? formatUSD(costs.grandTotal) : "—"}
                </p>
                <p className="text-xs text-blue-200 mt-2">Based on your selected market &amp; volumes</p>
              </div>
            </div>

            {/* WhatsApp Fees */}
            {costs && (
              <SummaryCard>
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                  WhatsApp Channel Fees
                </h3>
                <div className="space-y-2 text-sm">
                  <CostRow label="Marketing" detail={`${marketingMessages.toLocaleString()} msgs`} amount={costs.waMarketing} />
                  <CostRow label="Utility" detail={`${Math.round(costs.chargedUtility).toLocaleString()} charged`} amount={costs.waUtility} />
                  <CostRow label="Authentication" detail={`${authMessages.toLocaleString()} msgs`} amount={costs.waAuth} />
                  <CostRow label="Service" detail="Always free" amount={0} free />
                  <Divider />
                  <CostRow label="Subtotal" amount={costs.whatsappTotal} bold />
                </div>
              </SummaryCard>
            )}

            {/* Bot MD Fees */}
            {costs && (
              <SummaryCard>
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3 flex items-center gap-2">
                  <BotMDLogo height={22} />
                  Bot MD Fees
                </h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Messaging</p>
                <div className="space-y-2 text-sm">
                  <CostRow label="Delivered" detail={`${costs.totalMessagesSent.toLocaleString()} × $0.005`} amount={costs.botmdMessaging} />
                </div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 mt-4">AI Credits</p>
                <div className="space-y-2 text-sm">
                  <CostRow label="FAQ" detail={`${costs.faqCredits.toLocaleString()} cr`} amount={costs.faqCredits * AI_CREDIT_PRICE} />
                  <CostRow label="Coordinating" detail={`${costs.coordCredits.toLocaleString()} cr`} amount={costs.coordCredits * AI_CREDIT_PRICE} />
                  <CostRow label="Scheduling" detail={`${costs.schedCredits.toLocaleString()} cr`} amount={costs.schedCredits * AI_CREDIT_PRICE} />
                  <CostRow label="Survey" detail={`${costs.dataCredits.toLocaleString()} cr`} amount={costs.dataCredits * AI_CREDIT_PRICE} />
                  <Divider />
                  <CostRow label={`${costs.totalCredits.toLocaleString()} credits × $0.045`} amount={costs.botmdAICredits} bold />
                </div>
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <CostRow label="Bot MD Subtotal" amount={costs.botmdMessaging + costs.botmdAICredits} bold />
                </div>
              </SummaryCard>
            )}

            {/* Cost Split */}
            {costs && costs.grandTotal > 0 && (
              <SummaryCard>
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3">Cost Breakdown</h3>
                <div className="space-y-3">
                  <CostBar label="WhatsApp Fees" amount={costs.whatsappTotal} total={costs.grandTotal} color="bg-emerald-400" />
                  <CostBar label="Bot MD Messaging" amount={costs.botmdMessaging} total={costs.grandTotal} color="bg-[var(--botmd-cyan)]" />
                  <CostBar label="Bot MD AI Credits" amount={costs.botmdAICredits} total={costs.grandTotal} color="bg-[var(--botmd-blue)]" />
                </div>
              </SummaryCard>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-gray-400 space-y-1">
        <p>WhatsApp rates effective January 1, 2026. Rates subject to change by Meta.</p>
        <p>Service and utility messages within the 24hr customer service window are free from WhatsApp.</p>
        <p>Volume tier discounts are not included in this estimate.</p>
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
  return (
    <h2 className="text-base font-semibold text-[var(--botmd-navy)] mb-1 flex items-center gap-2">
      <span className="text-lg">{icon}</span> {title}
    </h2>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  const styles: Record<string, string> = {
    blue: "bg-blue-50 text-[var(--botmd-blue)]",
    cyan: "bg-[var(--botmd-cyan-light)] text-[#009e93]",
    violet: "bg-violet-50 text-violet-600",
    gray: "bg-gray-100 text-gray-500",
  };
  return <span className={`px-3 py-1 rounded-full font-medium ${styles[color] || styles.gray}`}>{children}</span>;
}

function Divider() {
  return <div className="border-t border-gray-100 pt-2 mt-2" />;
}

function NumberInput({ label, sublabel, value, onChange, accent }: {
  label: string; sublabel: string; value: number; onChange: (v: number) => void; accent: string;
}) {
  return (
    <div className={`bg-gray-50/80 rounded-xl p-4 border-l-4 ${accent}`}>
      <label className="text-sm font-medium text-[var(--botmd-navy)] block">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{sublabel}</p>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-[var(--botmd-navy)] focus:ring-2 focus:ring-[var(--botmd-blue)] focus:border-transparent outline-none transition"
      />
    </div>
  );
}

function AgentInput({ label, credits, description, value, onChange }: {
  label: string; credits: number; description: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-[var(--botmd-navy)]">{label}</label>
        <span className="text-[10px] font-semibold uppercase tracking-wide bg-[var(--botmd-cyan-light)] text-[#009e93] px-2 py-0.5 rounded-full">
          {credits} {credits === 1 ? "credit" : "credits"}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-2">{description}</p>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-[var(--botmd-navy)] focus:ring-2 focus:ring-[var(--botmd-blue)] focus:border-transparent outline-none transition"
      />
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
      <span className={`whitespace-nowrap ${free ? "text-[var(--botmd-cyan)] font-medium" : ""}`}>{free ? "Free" : formatUSD(amount)}</span>
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
        <span className="font-medium">{formatUSD(amount)} <span className="text-gray-400">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
