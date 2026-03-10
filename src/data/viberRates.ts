// Viber Business Messaging rates for Philippines (in PHP)
// Source: Viber Business rate card

export const VIBER_RATES_PHP = {
  transactional: 0.20,  // Per message delivered (for notifications)
  promotional: 0.30,    // Per message delivered (for marketing)
  carousel: 0.50,       // Per message delivered
  video: 0.50,          // Per message delivered
  session: 1.00,        // Per session (2-way channel for customer care)
};

// Exchange rate: 1 USD = 56 PHP
export const PHP_TO_USD = 1 / 56;

// Viber rates converted to USD for calculator use
export const VIBER_RATES_USD = {
  transactional: VIBER_RATES_PHP.transactional * PHP_TO_USD,
  promotional: VIBER_RATES_PHP.promotional * PHP_TO_USD,
  session: VIBER_RATES_PHP.session * PHP_TO_USD,
};
