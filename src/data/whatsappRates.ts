export interface WhatsAppRate {
  market: string;
  currency: string;
  marketing: number;
  utility: number;
  authentication: number;
  authenticationInternational: number | null;
  service: number | null;
}

// WhatsApp Business Platform rates effective January 1, 2026
export const whatsappRates: WhatsAppRate[] = [
  { market: "Argentina", currency: "USD", marketing: 0.0618, utility: 0.026, authentication: 0.026, authenticationInternational: null, service: null },
  { market: "Brazil", currency: "USD", marketing: 0.0625, utility: 0.0068, authentication: 0.0068, authenticationInternational: null, service: null },
  { market: "Chile", currency: "USD", marketing: 0.0889, utility: 0.02, authentication: 0.02, authenticationInternational: null, service: null },
  { market: "Colombia", currency: "USD", marketing: 0.0125, utility: 0.0008, authentication: 0.0008, authenticationInternational: null, service: null },
  { market: "Egypt", currency: "USD", marketing: 0.0644, utility: 0.0036, authentication: 0.0036, authenticationInternational: 0.065, service: null },
  { market: "France", currency: "USD", marketing: 0.0859, utility: 0.03, authentication: 0.03, authenticationInternational: null, service: null },
  { market: "Germany", currency: "USD", marketing: 0.1365, utility: 0.055, authentication: 0.055, authenticationInternational: null, service: null },
  { market: "India", currency: "USD", marketing: 0.0118, utility: 0.0014, authentication: 0.0014, authenticationInternational: 0.028, service: null },
  { market: "Indonesia", currency: "USD", marketing: 0.0411, utility: 0.025, authentication: 0.025, authenticationInternational: 0.136, service: null },
  { market: "Israel", currency: "USD", marketing: 0.0353, utility: 0.0053, authentication: 0.0053, authenticationInternational: null, service: null },
  { market: "Italy", currency: "USD", marketing: 0.0691, utility: 0.03, authentication: 0.03, authenticationInternational: null, service: null },
  { market: "Malaysia", currency: "USD", marketing: 0.086, utility: 0.014, authentication: 0.014, authenticationInternational: 0.0418, service: null },
  { market: "Mexico", currency: "USD", marketing: 0.0305, utility: 0.0085, authentication: 0.0085, authenticationInternational: null, service: null },
  { market: "Netherlands", currency: "USD", marketing: 0.1597, utility: 0.05, authentication: 0.05, authenticationInternational: null, service: null },
  { market: "Nigeria", currency: "USD", marketing: 0.0516, utility: 0.0067, authentication: 0.0067, authenticationInternational: 0.075, service: null },
  { market: "Pakistan", currency: "USD", marketing: 0.0473, utility: 0.0054, authentication: 0.0054, authenticationInternational: 0.075, service: null },
  { market: "Peru", currency: "USD", marketing: 0.0703, utility: 0.02, authentication: 0.02, authenticationInternational: null, service: null },
  { market: "Russia", currency: "USD", marketing: 0.0802, utility: 0.04, authentication: 0.04, authenticationInternational: null, service: null },
  { market: "Saudi Arabia", currency: "USD", marketing: 0.0455, utility: 0.0107, authentication: 0.0107, authenticationInternational: 0.0598, service: null },
  { market: "South Africa", currency: "USD", marketing: 0.0379, utility: 0.0076, authentication: 0.0076, authenticationInternational: 0.02, service: null },
  { market: "Spain", currency: "USD", marketing: 0.0615, utility: 0.02, authentication: 0.02, authenticationInternational: null, service: null },
  { market: "Turkey", currency: "USD", marketing: 0.0109, utility: 0.0053, authentication: 0.0053, authenticationInternational: null, service: null },
  { market: "United Arab Emirates", currency: "USD", marketing: 0.0499, utility: 0.0157, authentication: 0.0157, authenticationInternational: 0.051, service: null },
  { market: "United Kingdom", currency: "USD", marketing: 0.0529, utility: 0.022, authentication: 0.022, authenticationInternational: null, service: null },
  { market: "North America", currency: "USD", marketing: 0.025, utility: 0.0034, authentication: 0.0034, authenticationInternational: null, service: null },
  { market: "Rest of Africa", currency: "USD", marketing: 0.0225, utility: 0.004, authentication: 0.004, authenticationInternational: null, service: null },
  { market: "Rest of Asia Pacific", currency: "USD", marketing: 0.0732, utility: 0.0113, authentication: 0.0113, authenticationInternational: null, service: null },
  { market: "Rest of Central & Eastern Europe", currency: "USD", marketing: 0.086, utility: 0.0212, authentication: 0.0212, authenticationInternational: null, service: null },
  { market: "Rest of Latin America", currency: "USD", marketing: 0.074, utility: 0.0113, authentication: 0.0113, authenticationInternational: null, service: null },
  { market: "Rest of Middle East", currency: "USD", marketing: 0.0341, utility: 0.0091, authentication: 0.0091, authenticationInternational: null, service: null },
  { market: "Rest of Western Europe", currency: "USD", marketing: 0.0592, utility: 0.0171, authentication: 0.0171, authenticationInternational: null, service: null },
  { market: "Other", currency: "USD", marketing: 0.0604, utility: 0.0077, authentication: 0.0077, authenticationInternational: null, service: null },
];

// Southeast Asian countries mapped to their WhatsApp markets
export const seAsiaMarketMap: Record<string, string> = {
  Indonesia: "Indonesia",
  Malaysia: "Malaysia",
  Singapore: "Rest of Asia Pacific",
  Philippines: "Rest of Asia Pacific",
  Thailand: "Rest of Asia Pacific",
  Vietnam: "Rest of Asia Pacific",
  Myanmar: "Rest of Asia Pacific",
  Cambodia: "Rest of Asia Pacific",
  Laos: "Rest of Asia Pacific",
  "Brunei Darussalam": "Rest of Asia Pacific",
  "Timor-Leste": "Rest of Asia Pacific",
};

export function getRateForMarket(marketName: string): WhatsAppRate | undefined {
  return whatsappRates.find((r) => r.market === marketName);
}
