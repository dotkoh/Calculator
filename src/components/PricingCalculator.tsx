"use client";

import { useState, useMemo } from "react";
import { whatsappRates, seAsiaMarketMap, getRateForMarket } from "@/data/whatsappRates";

const BOTMD_MESSAGING_FEE = 0.005; // per message sent & delivered
const AI_CREDIT_PRICE = 0.045; // per credit

const AGENT_CREDITS: Record<string, { label: string; credits: number; description: string }> = {
  faq: { label: "FAQ Agent", credits: 1, description: "Simple queries like clinic hours, location" },
  coordinating: { label: "Coordinating Agent", credits: 1, description: "Greetings, consent collection" },
  scheduling: { label: "Scheduling Agent", credits: 3, description: "Appointment booking workflows" },
  dataCollection: { label: "Data Collection / Patient Survey Agent", credits: 2, description: "Patient intake forms, surveys" },
};

// Build market options: SE Asia countries first, then all WhatsApp markets
function buildMarketOptions() {
  const seAsiaOptions = Object.entries(seAsiaMarketMap).map(([country, market]) => ({
    label: country,
    value: country,
    whatsappMarket: market,
    group: "Southeast Asia",
  }));

  // Deduplicate: remove markets already covered by SE Asia individual entries
  const seAsiaWhatsappMarkets = new Set(Object.values(seAsiaMarketMap));
  const filteredOther = whatsappRates
    .filter((r) => !seAsiaWhatsappMarkets.has(r.market) || r.market === "Indonesia" || r.market === "Malaysia")
    .map((r) => ({
      label: r.market,
      value: r.market,
      whatsappMarket: r.market,
      group: "All Markets",
    }));

  return { seAsiaOptions, otherOptions: filteredOther };
}

const { seAsiaOptions, otherOptions } = buildMarketOptions();

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Bot MD nurse character SVG (matches logo)
function BotMDLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair */}
      <ellipse cx="50" cy="55" rx="36" ry="40" fill="#2D3148" />
      {/* Face */}
      <ellipse cx="50" cy="58" rx="28" ry="32" fill="#F5D5C0" />
      {/* Blush */}
      <ellipse cx="35" cy="64" rx="5" ry="3" fill="#E8B9A0" opacity="0.6" />
      <ellipse cx="65" cy="64" rx="5" ry="3" fill="#E8B9A0" opacity="0.6" />
      {/* Eyes */}
      <circle cx="40" cy="56" r="3" fill="#2D3148" />
      <circle cx="60" cy="56" r="3" fill="#2D3148" />
      {/* Smile */}
      <path d="M42 66 Q50 74 58 66" stroke="#2D3148" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Ear (left) */}
      <circle cx="20" cy="58" r="7" fill="white" stroke="#e5e7eb" strokeWidth="1" />
      {/* Medical headband circle */}
      <circle cx="35" cy="22" r="12" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* Medical cross */}
      <rect x="31" y="16" width="8" height="12" rx="1.5" fill="#6EC6C8" />
      <rect x="29" y="19" width="12" height="6" rx="1.5" fill="#6EC6C8" />
    </svg>
  );
}

export default function PricingCalculator() {
  // Market selection
  const [selectedMarket, setSelectedMarket] = useState("Singapore");

  // Message volumes
  const [marketingMessages, setMarketingMessages] = useState(500);
  const [utilityMessages, setUtilityMessages] = useState(2000);
  const [authMessages, setAuthMessages] = useState(0);
  const [serviceMessages, setServiceMessages] = useState(3000);
  const [utilityFreePercent, setUtilityFreePercent] = useState(80);

  // Agent replies
  const [faqReplies, setFaqReplies] = useState(2000);
  const [coordinatingReplies, setCoordinatingReplies] = useState(500);
  const [schedulingReplies, setSchedulingReplies] = useState(300);
  const [dataCollectionReplies, setDataCollectionReplies] = useState(200);

  // Resolve WhatsApp market
  const whatsappMarket = useMemo(() => {
    const seMapping = seAsiaMarketMap[selectedMarket];
    return seMapping || selectedMarket;
  }, [selectedMarket]);

  const rate = useMemo(() => getRateForMarket(whatsappMarket), [whatsappMarket]);

  // Calculate costs
  const costs = useMemo(() => {
    if (!rate) return null;

    // WhatsApp Channel Fees
    const waMarketing = rate.marketing * marketingMessages;
    const chargedUtility = utilityMessages * (1 - utilityFreePercent / 100);
    const waUtility = rate.utility * chargedUtility;
    const waAuth = rate.authentication * authMessages;
    const waService = 0; // Always free
    const whatsappTotal = waMarketing + waUtility + waAuth + waService;

    // Bot MD Messaging Fees (all messages sent)
    const totalMessagesSent = marketingMessages + utilityMessages + serviceMessages + authMessages;
    const botmdMessaging = BOTMD_MESSAGING_FEE * totalMessagesSent;

    // Bot MD AI Credits
    const faqCredits = faqReplies * AGENT_CREDITS.faq.credits;
    const coordCredits = coordinatingReplies * AGENT_CREDITS.coordinating.credits;
    const schedCredits = schedulingReplies * AGENT_CREDITS.scheduling.credits;
    const dataCredits = dataCollectionReplies * AGENT_CREDITS.dataCollection.credits;
    const totalCredits = faqCredits + coordCredits + schedCredits + dataCredits;
    const botmdAICredits = AI_CREDIT_PRICE * totalCredits;

    const grandTotal = whatsappTotal + botmdMessaging + botmdAICredits;

    return {
      waMarketing,
      waUtility,
      waAuth,
      waService,
      whatsappTotal,
      chargedUtility,
      totalMessagesSent,
      botmdMessaging,
      faqCredits,
      coordCredits,
      schedCredits,
      dataCredits,
      totalCredits,
      botmdAICredits,
      grandTotal,
    };
  }, [
    rate,
    marketingMessages,
    utilityMessages,
    utilityFreePercent,
    authMessages,
    serviceMessages,
    faqReplies,
    coordinatingReplies,
    schedulingReplies,
    dataCollectionReplies,
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <BotMDLogo size={52} />
          <h1 className="text-3xl font-bold">
            <span className="text-[var(--botmd-teal)]">bot</span>
            <span className="text-[var(--botmd-navy)]">md</span>
            <span className="text-[var(--botmd-navy)] ml-2">Pricing Calculator</span>
          </h1>
        </div>
        <p className="text-gray-500 text-lg">
          Estimate your monthly costs for WhatsApp messaging and AI agent workflows
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Market Selection */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-[var(--botmd-navy)] mb-1 flex items-center gap-2">
              <span className="text-xl">🌏</span> Market / Country
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              WhatsApp rates vary by recipient&apos;s country. SE Asia countries are highlighted.
            </p>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[var(--botmd-navy)] bg-gray-50 focus:ring-2 focus:ring-[var(--botmd-teal)] focus:border-transparent outline-none text-base"
            >
              <optgroup label="Southeast Asia">
                {seAsiaOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} → {o.whatsappMarket} rates
                  </option>
                ))}
              </optgroup>
              <optgroup label="All Markets">
                {otherOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            </select>
            {rate && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full">
                  Marketing: {formatUSD(rate.marketing)}/msg
                </span>
                <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
                  Utility: {formatUSD(rate.utility)}/msg
                </span>
                <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full">
                  Auth: {formatUSD(rate.authentication)}/msg
                </span>
                <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full">
                  Service: Free
                </span>
              </div>
            )}
          </section>

          {/* WhatsApp Message Volumes */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-[var(--botmd-navy)] mb-1 flex items-center gap-2">
              <span className="text-xl">💬</span> Monthly WhatsApp Message Volume
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter your estimated monthly template and service message counts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberInput
                label="Marketing Templates"
                sublabel="Promos, campaigns, blasts"
                value={marketingMessages}
                onChange={setMarketingMessages}
                color="rose"
              />
              <NumberInput
                label="Utility Templates"
                sublabel="Reminders, confirmations"
                value={utilityMessages}
                onChange={setUtilityMessages}
                color="teal"
              />
              <NumberInput
                label="Authentication Templates"
                sublabel="OTPs, verification codes"
                value={authMessages}
                onChange={setAuthMessages}
                color="violet"
              />
              <NumberInput
                label="Service (Free-form) Messages"
                sublabel="AI replies within 24hr window"
                value={serviceMessages}
                onChange={setServiceMessages}
                color="gray"
              />
            </div>

            <div className="mt-5 p-4 bg-teal-50 rounded-xl border border-teal-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-teal-800">
                  % of Utility messages sent within 24hr customer service window (free)
                </label>
                <span className="text-sm font-bold text-teal-700">{utilityFreePercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={utilityFreePercent}
                onChange={(e) => setUtilityFreePercent(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-teal-600 mt-1">
                Utility and service messages in response to a user within 24hrs are free from WhatsApp.
              </p>
            </div>
          </section>

          {/* AI Agent Usage */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-[var(--botmd-navy)] mb-1 flex items-center gap-2">
              <span className="text-xl">🤖</span> Monthly AI Agent Replies
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              How many AI-powered replies per agent type do you expect each month?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AgentInput
                label={AGENT_CREDITS.faq.label}
                credits={AGENT_CREDITS.faq.credits}
                description={AGENT_CREDITS.faq.description}
                value={faqReplies}
                onChange={setFaqReplies}
              />
              <AgentInput
                label={AGENT_CREDITS.coordinating.label}
                credits={AGENT_CREDITS.coordinating.credits}
                description={AGENT_CREDITS.coordinating.description}
                value={coordinatingReplies}
                onChange={setCoordinatingReplies}
              />
              <AgentInput
                label={AGENT_CREDITS.scheduling.label}
                credits={AGENT_CREDITS.scheduling.credits}
                description={AGENT_CREDITS.scheduling.description}
                value={schedulingReplies}
                onChange={setSchedulingReplies}
              />
              <AgentInput
                label={AGENT_CREDITS.dataCollection.label}
                credits={AGENT_CREDITS.dataCollection.credits}
                description={AGENT_CREDITS.dataCollection.description}
                value={dataCollectionReplies}
                onChange={setDataCollectionReplies}
              />
            </div>
          </section>
        </div>

        {/* Right Column: Cost Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Grand Total */}
            <div className="bg-[var(--botmd-navy)] rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <BotMDLogo size={28} />
                <p className="text-sm text-gray-300 font-medium">Estimated Monthly Total</p>
              </div>
              <p className="text-4xl font-bold mt-1">
                {costs ? formatUSD(costs.grandTotal) : "—"}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Based on your selected market and volumes
              </p>
            </div>

            {/* WhatsApp Fees Breakdown */}
            {costs && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                  </svg>
                  WhatsApp Channel Fees
                </h3>
                <div className="space-y-2 text-sm">
                  <CostRow label="Marketing" detail={`${marketingMessages.toLocaleString()} msgs`} amount={costs.waMarketing} />
                  <CostRow
                    label="Utility"
                    detail={`${Math.round(costs.chargedUtility).toLocaleString()} charged msgs`}
                    amount={costs.waUtility}
                  />
                  <CostRow label="Authentication" detail={`${authMessages.toLocaleString()} msgs`} amount={costs.waAuth} />
                  <CostRow label="Service" detail="Always free" amount={0} free />
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <CostRow label="Subtotal" amount={costs.whatsappTotal} bold />
                  </div>
                </div>
              </div>
            )}

            {/* Bot MD Fees Breakdown */}
            {costs && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3 flex items-center gap-2">
                  <BotMDLogo size={22} />
                  Bot MD Fees
                </h3>

                {/* Messaging */}
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 mt-2">Messaging</p>
                <div className="space-y-2 text-sm">
                  <CostRow
                    label="Messages delivered"
                    detail={`${costs.totalMessagesSent.toLocaleString()} × $0.005`}
                    amount={costs.botmdMessaging}
                  />
                </div>

                {/* AI Credits */}
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 mt-4">AI Credits</p>
                <div className="space-y-2 text-sm">
                  <CostRow label="FAQ Agent" detail={`${costs.faqCredits.toLocaleString()} credits`} amount={costs.faqCredits * AI_CREDIT_PRICE} />
                  <CostRow label="Coordinating Agent" detail={`${costs.coordCredits.toLocaleString()} credits`} amount={costs.coordCredits * AI_CREDIT_PRICE} />
                  <CostRow label="Scheduling Agent" detail={`${costs.schedCredits.toLocaleString()} credits`} amount={costs.schedCredits * AI_CREDIT_PRICE} />
                  <CostRow label="Survey Agent" detail={`${costs.dataCredits.toLocaleString()} credits`} amount={costs.dataCredits * AI_CREDIT_PRICE} />
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <CostRow label={`${costs.totalCredits.toLocaleString()} credits × $0.045`} amount={costs.botmdAICredits} bold />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <CostRow label="Bot MD Subtotal" amount={costs.botmdMessaging + costs.botmdAICredits} bold />
                </div>
              </div>
            )}

            {/* Visual Split */}
            {costs && costs.grandTotal > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3">Cost Split</h3>
                <div className="space-y-3">
                  <CostBar label="WhatsApp Fees" amount={costs.whatsappTotal} total={costs.grandTotal} color="bg-green-500" />
                  <CostBar label="Bot MD Messaging" amount={costs.botmdMessaging} total={costs.grandTotal} color="bg-[var(--botmd-teal)]" />
                  <CostBar label="Bot MD AI Credits" amount={costs.botmdAICredits} total={costs.grandTotal} color="bg-[var(--botmd-navy)]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 text-center text-xs text-gray-400">
        <p>WhatsApp rates effective January 1, 2026. Rates subject to change by Meta.</p>
        <p className="mt-1">Service and utility messages in response to users within 24hrs are free from WhatsApp.</p>
        <p className="mt-1">Volume tier discounts are not included in this estimate.</p>
      </div>
    </div>
  );
}

// --- Sub-components ---

function NumberInput({
  label,
  sublabel,
  value,
  onChange,
  color,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    rose: "border-l-rose-400",
    teal: "border-l-teal-400",
    violet: "border-l-violet-400",
    gray: "border-l-gray-300",
  };
  return (
    <div className={`bg-gray-50 rounded-xl p-4 border-l-4 ${colorMap[color] || "border-l-gray-300"}`}>
      <label className="text-sm font-medium text-[var(--botmd-navy)] block">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{sublabel}</p>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[var(--botmd-navy)] bg-white focus:ring-2 focus:ring-[var(--botmd-teal)] focus:border-transparent outline-none"
      />
    </div>
  );
}

function AgentInput({
  label,
  credits,
  description,
  value,
  onChange,
}: {
  label: string;
  credits: number;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-[var(--botmd-navy)]">{label}</label>
        <span className="text-xs bg-[#e8f6f6] text-[var(--botmd-teal-dark)] px-2 py-0.5 rounded-full font-medium">
          {credits} {credits === 1 ? "credit" : "credits"}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-2">{description}</p>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[var(--botmd-navy)] bg-white focus:ring-2 focus:ring-[var(--botmd-teal)] focus:border-transparent outline-none"
      />
    </div>
  );
}

function CostRow({
  label,
  detail,
  amount,
  bold,
  free,
}: {
  label: string;
  detail?: string;
  amount: number;
  bold?: boolean;
  free?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-[var(--botmd-navy)]" : "text-gray-600"}`}>
      <div>
        <span>{label}</span>
        {detail && <span className="text-xs text-gray-400 ml-1">({detail})</span>}
      </div>
      <span className={free ? "text-[var(--botmd-teal-dark)]" : ""}>{free ? "Free" : formatUSD(amount)}</span>
    </div>
  );
}

function CostBar({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>
          {formatUSD(amount)} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
