"use client";

import { useState, useMemo, useCallback } from "react";
import { whatsappRates, seAsiaMarketMap, getRateForMarket } from "@/data/whatsappRates";
import { VIBER_RATES_PHP, PHP_TO_USD, VIBER_RATES_USD } from "@/data/viberRates";

const BOTMD_MSG_FEE = 0.005;
const CREDIT_PRICE = 0.045;
const SCHED_CREDITS_PER_RESPONSE = 3;
const SCHED_RESPONSES_PER_REQUEST = 3;

const PLANS = [
  { id: "starter", label: "Starter", credits: 1_000, maxChannels: 2 },
  { id: "pro", label: "Pro", credits: 3_000, maxChannels: 5 },
  { id: "enterprise", label: "Enterprise", credits: 10_000, maxChannels: Infinity },
] as const;

type ChannelId = "whatsapp" | "messenger" | "viber";

const CHANNELS: { id: ChannelId; label: string; icon: string; color: string }[] = [
  { id: "whatsapp", label: "WhatsApp", icon: "💬", color: "border-green-400 bg-green-50/60" },
  { id: "messenger", label: "Messenger", icon: "💙", color: "border-blue-400 bg-blue-50/60" },
  { id: "viber", label: "Viber", icon: "💜", color: "border-purple-400 bg-purple-50/60" },
];

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

const DEFAULT_INPUTS: Record<ChannelId, ChannelInputs> = {
  whatsapp: { patientEnquiries: 3000, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 500, appointmentsPerMonth: 800, surveyBlasts: 500, marketingBlasts: 0 },
  messenger: { patientEnquiries: 1000, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 200, appointmentsPerMonth: 300, surveyBlasts: 0, marketingBlasts: 0 },
  viber: { patientEnquiries: 500, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 100, appointmentsPerMonth: 200, surveyBlasts: 200, marketingBlasts: 0 },
};

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
function fmtPhp(v: number) {
  return `₱${v.toFixed(2)}`;
}
function num(v: number) { return v.toLocaleString(); }

function BotMDLogo({ height = 48 }: { height?: number }) {
  return <img src="/botmd-logo.png" alt="Bot MD" height={height} style={{ height: `${height}px`, width: "auto" }} className="object-contain" />;
}

export default function PricingCalculator() {
  // ── Global Inputs ──
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [selectedMarket, setSelectedMarket] = useState("Singapore");
  const [enabledChannels, setEnabledChannels] = useState<Set<ChannelId>>(new Set(["whatsapp"]));
  const [activeTab, setActiveTab] = useState<ChannelId>("whatsapp");
  const [channelInputs, setChannelInputs] = useState<Record<ChannelId, ChannelInputs>>(DEFAULT_INPUTS);

  const whatsappMarket = useMemo(() => seAsiaMarketMap[selectedMarket] || selectedMarket, [selectedMarket]);
  const waRate = useMemo(() => getRateForMarket(whatsappMarket), [whatsappMarket]);
  const plan = useMemo(() => PLANS.find((p) => p.id === selectedPlan) || PLANS[0], [selectedPlan]);

  // Helper to update a single channel's inputs
  const updateChannelInput = useCallback((channel: ChannelId, field: keyof ChannelInputs, value: number) => {
    setChannelInputs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: value },
    }));
  }, []);

  // Toggle channel on/off
  const toggleChannel = useCallback((channelId: ChannelId) => {
    setEnabledChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
        // Switch active tab if we just disabled it
        if (activeTab === channelId) {
          const remaining = Array.from(next);
          if (remaining.length > 0) setActiveTab(remaining[0]);
        }
      } else {
        if (next.size < plan.maxChannels) {
          next.add(channelId);
          setActiveTab(channelId);
        }
      }
      return next;
    });
  }, [activeTab, plan.maxChannels]);

  // ── Per-Channel Cost Calculation ──
  const costs = useMemo(() => {
    if (enabledChannels.size === 0) return null;

    const perChannel: Record<string, ChannelCosts> = {};
    let totalCreditsAcrossChannels = 0;
    let totalBotmdMessaging = 0;
    let totalChannelFees = 0;
    let totalMessages = 0;
    let totalPatients = 0;

    for (const chId of enabledChannels) {
      const inp = channelInputs[chId];

      // AI Credits (same logic per channel)
      const coordCredits = inp.patientEnquiries * inp.coordResponsesPerPatient;
      const faqCredits = inp.patientEnquiries * inp.faqResponsesPerPatient;
      const schedCredits = inp.schedulingRequests * SCHED_RESPONSES_PER_REQUEST * SCHED_CREDITS_PER_RESPONSE;
      const chTotalCredits = coordCredits + faqCredits + schedCredits;

      // Messages
      const serviceMessages = inp.patientEnquiries * (inp.coordResponsesPerPatient + inp.faqResponsesPerPatient);
      const schedServiceMessages = inp.schedulingRequests * SCHED_RESPONSES_PER_REQUEST;
      const totalServiceMessages = serviceMessages + schedServiceMessages;
      const utilityOrTransactionalMessages = inp.appointmentsPerMonth * 2;
      const totalMarketingMessages = inp.surveyBlasts + inp.marketingBlasts;
      const chTotalMessages = totalServiceMessages + utilityOrTransactionalMessages + totalMarketingMessages;

      // Channel-specific fees
      let channelFees = 0;
      const channelFeeDetails: { label: string; amount: number; count: number }[] = [];

      if (chId === "whatsapp" && waRate) {
        const utilityCost = waRate.utility * utilityOrTransactionalMessages;
        const marketingCost = waRate.marketing * totalMarketingMessages;
        channelFees = utilityCost + marketingCost;
        channelFeeDetails.push({ label: "Service messages", amount: 0, count: totalServiceMessages });
        channelFeeDetails.push({ label: "Utility templates", amount: utilityCost, count: utilityOrTransactionalMessages });
        if (totalMarketingMessages > 0) {
          channelFeeDetails.push({ label: "Marketing templates", amount: marketingCost, count: totalMarketingMessages });
        }
      } else if (chId === "messenger") {
        // No channel fees for Messenger
        channelFeeDetails.push({ label: "No channel fees", amount: 0, count: chTotalMessages });
      } else if (chId === "viber") {
        // Session cost per enquiry + per scheduling request
        const sessionCount = inp.patientEnquiries + inp.schedulingRequests;
        const sessionCost = sessionCount * VIBER_RATES_USD.session;
        const transactionalCost = utilityOrTransactionalMessages * VIBER_RATES_USD.transactional;
        const promotionalCost = totalMarketingMessages * VIBER_RATES_USD.promotional;
        channelFees = sessionCost + transactionalCost + promotionalCost;
        channelFeeDetails.push({ label: "Sessions (2-way)", amount: sessionCost, count: sessionCount });
        channelFeeDetails.push({ label: "Transactional", amount: transactionalCost, count: utilityOrTransactionalMessages });
        if (totalMarketingMessages > 0) {
          channelFeeDetails.push({ label: "Promotional", amount: promotionalCost, count: totalMarketingMessages });
        }
      }

      const botmdMessaging = chTotalMessages * BOTMD_MSG_FEE;

      perChannel[chId] = {
        coordCredits, faqCredits, schedCredits,
        totalCredits: chTotalCredits,
        totalServiceMessages, utilityOrTransactionalMessages, totalMarketingMessages,
        totalMessages: chTotalMessages,
        channelFees, channelFeeDetails,
        botmdMessaging,
      };

      totalCreditsAcrossChannels += chTotalCredits;
      totalBotmdMessaging += botmdMessaging;
      totalChannelFees += channelFees;
      totalMessages += chTotalMessages;
      totalPatients += inp.patientEnquiries;
    }

    // Pooled AI credits
    const includedCredits = plan.credits;
    const overageCredits = Math.max(0, totalCreditsAcrossChannels - includedCredits);
    const aiCreditsCost = overageCredits * CREDIT_PRICE;

    const grandTotal = totalChannelFees + totalBotmdMessaging + aiCreditsCost;

    return {
      perChannel,
      planLabel: plan.label,
      includedCredits,
      totalCredits: totalCreditsAcrossChannels,
      overageCredits,
      aiCreditsCost,
      totalBotmdMessaging,
      totalChannelFees,
      totalMessages,
      totalPatients,
      grandTotal,
    };
  }, [enabledChannels, channelInputs, waRate, plan]);

  // ── PDF Download ──
  const handleDownloadPDF = useCallback(async () => {
    if (!costs) return;
    const { generatePricingPDF } = await import("./generatePDF");
    await generatePricingPDF({
      market: selectedMarket,
      whatsappMarket,
      planName: costs.planLabel,
      includedCredits: costs.includedCredits,
      overageCredits: costs.overageCredits,
      enabledChannels: Array.from(enabledChannels),
      channelInputs,
      costs,
    });
  }, [costs, selectedMarket, whatsappMarket, enabledChannels, channelInputs]);

  const activeInputs = channelInputs[activeTab];
  const activeChannelMeta = CHANNELS.find((c) => c.id === activeTab)!;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <header className="text-center mb-10">
        <div className="flex items-center justify-center mb-4">
          <BotMDLogo height={56} />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-[var(--botmd-navy)]">Pricing Calculator</h2>
        <p className="text-gray-400 mt-2 max-w-lg mx-auto">
          Estimate your monthly messaging &amp; AI agent costs across channels
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Inputs ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Subscription Plan */}
          <Card>
            <SectionHeader icon="⭐" title="Subscription Plan" />
            <p className="text-sm text-gray-400 mb-3">Each plan includes a monthly AI credit allowance shared across all channels.</p>
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map((p) => {
                const active = selectedPlan === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`relative rounded-xl border-2 px-4 py-4 text-left transition-all cursor-pointer ${
                      active ? "border-[var(--botmd-blue)] bg-blue-50/60 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--botmd-blue)] flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                    <span className={`block text-sm font-semibold ${active ? "text-[var(--botmd-blue)]" : "text-[var(--botmd-navy)]"}`}>
                      {p.label}
                    </span>
                    <span className="block text-xs text-gray-400 mt-1">
                      {num(p.credits)} credits/mo
                    </span>
                    <span className="block text-xs text-gray-400">
                      {p.maxChannels === Infinity ? "Unlimited channels" : `Up to ${p.maxChannels} channels`}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Channel Selector */}
          <Card>
            <SectionHeader icon="📡" title="Channels" />
            <p className="text-sm text-gray-400 mb-3">Select the messaging channels you use. {plan.maxChannels < Infinity ? `${plan.label} plan supports up to ${plan.maxChannels} channels.` : "Enterprise plan supports unlimited channels."}</p>
            <div className="grid grid-cols-3 gap-3">
              {CHANNELS.map((ch) => {
                const enabled = enabledChannels.has(ch.id);
                const atLimit = !enabled && enabledChannels.size >= plan.maxChannels;
                return (
                  <button
                    key={ch.id}
                    onClick={() => !atLimit && toggleChannel(ch.id)}
                    disabled={atLimit}
                    className={`relative rounded-xl border-2 px-4 py-4 text-center transition-all ${
                      atLimit ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed" :
                      enabled ? ch.color + " shadow-sm cursor-pointer" : "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
                    }`}
                  >
                    {enabled && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--botmd-blue)] flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                    <span className="text-2xl block mb-1">{ch.icon}</span>
                    <span className={`block text-sm font-semibold ${enabled ? "text-[var(--botmd-navy)]" : "text-gray-400"}`}>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Market (shown when WhatsApp enabled) */}
          {enabledChannels.has("whatsapp") && (
            <Card>
              <SectionHeader icon="🌏" title="WhatsApp Market / Country" />
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
              {waRate && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Pill color="blue">Marketing: {fmt(waRate.marketing)}/msg</Pill>
                  <Pill color="cyan">Utility: {fmt(waRate.utility)}/msg</Pill>
                  <Pill color="gray">Service: Free</Pill>
                </div>
              )}
            </Card>
          )}

          {/* Viber rates info */}
          {enabledChannels.has("viber") && (
            <Card>
              <SectionHeader icon="💜" title="Viber Business Rates (Philippines)" />
              <p className="text-sm text-gray-400 mb-3">Viber rates in PHP, converted to USD at ₱56 = $1.</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Pill color="cyan">Session: {fmtPhp(VIBER_RATES_PHP.session)}/session</Pill>
                <Pill color="gray">Transactional: {fmtPhp(VIBER_RATES_PHP.transactional)}/msg</Pill>
                <Pill color="blue">Promotional: {fmtPhp(VIBER_RATES_PHP.promotional)}/msg</Pill>
              </div>
            </Card>
          )}

          {/* ── Channel Tabs ── */}
          {enabledChannels.size > 0 && (
            <>
              {/* Tab bar */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {CHANNELS.filter((c) => enabledChannels.has(c.id)).map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveTab(ch.id)}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      activeTab === ch.id
                        ? "bg-white text-[var(--botmd-navy)] shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {ch.icon} {ch.label}
                  </button>
                ))}
              </div>

              {/* Active channel inputs */}
              <Card>
                <SectionHeader icon="🏥" title={`${activeChannelMeta.label} — Patient Enquiry Volume`} />
                <p className="text-sm text-gray-400 mb-4">How many patients message via {activeChannelMeta.label} each month?</p>
                <BigNumberInput label="Monthly patient enquiries" value={activeInputs.patientEnquiries} onChange={(v) => updateChannelInput(activeTab, "patientEnquiries", v)} />
              </Card>

              <Card>
                <SectionHeader icon="🤖" title={`${activeChannelMeta.label} — AI Agent Responses`} />
                <p className="text-sm text-gray-400 mb-4">Average AI agent responses per patient on {activeChannelMeta.label}.</p>
                <div className="space-y-3">
                  <AgentPerPatientRow agent="Coordinating Agent" description="Greets the patient, takes consent" creditsPerResponse={1} responsesPerPatient={activeInputs.coordResponsesPerPatient} onChangeResponses={(v) => updateChannelInput(activeTab, "coordResponsesPerPatient", v)} patients={activeInputs.patientEnquiries} />
                  <AgentPerPatientRow agent="FAQ Agent" description="Answers questions about clinic hours, location, services" creditsPerResponse={1} responsesPerPatient={activeInputs.faqResponsesPerPatient} onChangeResponses={(v) => updateChannelInput(activeTab, "faqResponsesPerPatient", v)} patients={activeInputs.patientEnquiries} />
                </div>
              </Card>

              <Card>
                <SectionHeader icon="📅" title={`${activeChannelMeta.label} — Scheduling Requests`} />
                <p className="text-sm text-gray-400 mb-4">
                  How many patients request appointments via {activeChannelMeta.label}?
                </p>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <BigNumberInput label="Scheduling requests / month" value={activeInputs.schedulingRequests} onChange={(v) => updateChannelInput(activeTab, "schedulingRequests", v)} />
                  </div>
                  <div className="pt-7 text-xs text-gray-400 flex-shrink-0 text-right">
                    <span className="block font-medium text-[var(--botmd-navy)]">{num(activeInputs.schedulingRequests * SCHED_RESPONSES_PER_REQUEST * SCHED_CREDITS_PER_RESPONSE)} credits</span>
                    <span>{SCHED_RESPONSES_PER_REQUEST} responses × {SCHED_CREDITS_PER_RESPONSE} cr each</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-400">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <span className="block font-medium text-[var(--botmd-navy)]">1. Data collection</span>
                    <span>3 credits</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <span className="block font-medium text-[var(--botmd-navy)]">2. Dates &amp; times</span>
                    <span>3 credits</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <span className="block font-medium text-[var(--botmd-navy)]">3. Confirmation</span>
                    <span>3 credits</span>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHeader icon="✅" title={`${activeChannelMeta.label} — Confirmations & Reminders`} />
                <p className="text-sm text-gray-400 mb-4">
                  Each appointment triggers 1 confirmation + 1 reminder
                  {activeTab === "whatsapp" ? " (utility templates)." : activeTab === "viber" ? " (transactional messages)." : "."}
                </p>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <BigNumberInput label="Appointments / month" value={activeInputs.appointmentsPerMonth} onChange={(v) => updateChannelInput(activeTab, "appointmentsPerMonth", v)} />
                  </div>
                  <div className="pt-7 text-xs text-gray-400 flex-shrink-0 text-right">
                    <span className="block font-medium text-[var(--botmd-navy)]">{num(activeInputs.appointmentsPerMonth * 2)} messages</span>
                    {activeTab === "whatsapp" && waRate && <span>{fmt(waRate.utility * activeInputs.appointmentsPerMonth * 2)} WhatsApp fees</span>}
                    {activeTab === "viber" && <span>{fmtPhp(VIBER_RATES_PHP.transactional * activeInputs.appointmentsPerMonth * 2)} Viber fees</span>}
                    {activeTab === "messenger" && <span className="text-[var(--botmd-cyan)]">No channel fees</span>}
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHeader icon="📋" title={`${activeChannelMeta.label} — Surveys & Reminders`} />
                <p className="text-sm text-gray-400 mb-4">
                  Outbound patient surveys and health reminders
                  {activeTab === "whatsapp" ? " (marketing templates)." : activeTab === "viber" ? " (promotional messages)." : "."}
                </p>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <BigNumberInput label="Survey / reminder messages per month" value={activeInputs.surveyBlasts} onChange={(v) => updateChannelInput(activeTab, "surveyBlasts", v)} />
                  </div>
                  <div className="pt-7 text-xs text-gray-400 flex-shrink-0 text-right">
                    {activeTab === "whatsapp" && waRate && (
                      <>
                        <span className="block font-medium text-[var(--botmd-navy)]">{fmt(waRate.marketing * activeInputs.surveyBlasts)}</span>
                        <span>WhatsApp marketing rate</span>
                      </>
                    )}
                    {activeTab === "viber" && (
                      <>
                        <span className="block font-medium text-[var(--botmd-navy)]">{fmtPhp(VIBER_RATES_PHP.promotional * activeInputs.surveyBlasts)}</span>
                        <span>Viber promotional rate</span>
                      </>
                    )}
                    {activeTab === "messenger" && <span className="text-[var(--botmd-cyan)]">No channel fees</span>}
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHeader icon="📢" title={`${activeChannelMeta.label} — Marketing Blasts (optional)`} />
                <p className="text-sm text-gray-400 mb-4">
                  Proactive marketing campaigns sent via {activeChannelMeta.label}.
                </p>
                <BigNumberInput label="Marketing messages / month" value={activeInputs.marketingBlasts} onChange={(v) => updateChannelInput(activeTab, "marketingBlasts", v)} />
              </Card>
            </>
          )}
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
                <p className="text-xs text-blue-200 mt-2">
                  {costs?.planLabel ?? ""} plan · {enabledChannels.size} channel{enabledChannels.size !== 1 ? "s" : ""} · {num(costs?.totalPatients ?? 0)} patients
                </p>
              </div>
            </div>

            {/* Per-channel breakdown */}
            {costs && (
              <SummaryCard>
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3">Channel Fees</h3>

                {CHANNELS.filter((c) => enabledChannels.has(c.id)).map((ch) => {
                  const cc = costs.perChannel[ch.id];
                  if (!cc) return null;
                  return (
                    <div key={ch.id} className="mb-4 last:mb-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{ch.icon} {ch.label}</p>
                      <div className="space-y-1.5 text-sm">
                        {cc.channelFeeDetails.map((d, i) => (
                          <CostRow key={i} label={d.label} detail={`${num(d.count)} msgs`} amount={d.amount} free={d.amount === 0 && d.label !== "No channel fees"} />
                        ))}
                        {ch.id === "messenger" && (
                          <div className="text-xs text-[var(--botmd-cyan)] font-medium">No channel fees for Messenger</div>
                        )}
                        <CostRow label={`${ch.label} channel fees`} amount={cc.channelFees} bold />
                      </div>
                    </div>
                  );
                })}
              </SummaryCard>
            )}

            {/* Bot MD Messaging */}
            {costs && (
              <SummaryCard>
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3">Bot MD Messaging</h3>
                <div className="space-y-1.5 text-sm">
                  {CHANNELS.filter((c) => enabledChannels.has(c.id)).map((ch) => {
                    const cc = costs.perChannel[ch.id];
                    if (!cc) return null;
                    return <CostRow key={ch.id} label={ch.label} detail={`${num(cc.totalMessages)} × $0.005`} amount={cc.botmdMessaging} />;
                  })}
                  <Divider />
                  <CostRow label="Messaging subtotal" amount={costs.totalBotmdMessaging} bold />
                </div>
              </SummaryCard>
            )}

            {/* Pooled AI Credits */}
            {costs && (
              <SummaryCard>
                <h3 className="font-semibold text-[var(--botmd-navy)] text-sm mb-3">AI Credits (pooled)</h3>
                <div className="space-y-1.5 text-sm">
                  {CHANNELS.filter((c) => enabledChannels.has(c.id)).map((ch) => {
                    const cc = costs.perChannel[ch.id];
                    if (!cc) return null;
                    return (
                      <div key={ch.id}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{ch.icon} {ch.label}</p>
                        <CostRow label="Coordinating" detail={`${num(cc.coordCredits)} cr`} amount={cc.coordCredits * CREDIT_PRICE} />
                        <CostRow label="FAQ" detail={`${num(cc.faqCredits)} cr`} amount={cc.faqCredits * CREDIT_PRICE} />
                        <CostRow label="Scheduling" detail={`${num(cc.schedCredits)} cr`} amount={cc.schedCredits * CREDIT_PRICE} />
                      </div>
                    );
                  })}
                  <Divider />
                  <div className="text-xs text-gray-400 pt-1">Total used: {num(costs.totalCredits)} credits across all channels</div>
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
                  {costs.totalChannelFees > 0 && (
                    <CostBar label="Channel Fees" amount={costs.totalChannelFees} total={costs.grandTotal} color="bg-emerald-400" />
                  )}
                  <CostBar label="Bot MD Messaging" amount={costs.totalBotmdMessaging} total={costs.grandTotal} color="bg-[var(--botmd-cyan)]" />
                  <CostBar label="Bot MD AI Credits" amount={costs.aiCreditsCost} total={costs.grandTotal} color="bg-[var(--botmd-blue)]" />
                </div>
              </SummaryCard>
            )}

            {/* Per patient */}
            {costs && costs.grandTotal > 0 && costs.totalPatients > 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Cost per patient enquiry</p>
                <p className="text-2xl font-bold text-[var(--botmd-navy)] mt-1">
                  {fmt(costs.grandTotal / costs.totalPatients)}
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
        <p>Viber rates for Philippines in PHP. USD conversion at ₱56 = $1.</p>
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
