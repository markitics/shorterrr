/**
 * MPP (Machine Payments Protocol) client utilities.
 *
 * Flow:
 * 1. Client sends request to API provider → gets 402 with WWW-Authenticate: Payment header
 * 2. Parse the challenge (amount, currency, method, intent)
 * 3. Fulfill payment using the specified method (e.g. Stripe Payment Token)
 * 4. Resend request with Authorization: Payment <credential>
 * 5. Receive 200 + Payment-Receipt header
 */

export interface MppChallenge {
  id: string;
  realm: string;
  method: string;
  intent: string;
  request: MppRequest;
  expires?: string;
  raw: string;
}

export interface MppRequest {
  amount: string;
  currency: string;
  recipient?: string;
  description?: string;
  externalId?: string;
  methodDetails?: Record<string, unknown>;
}

export interface MppCredential {
  challenge: string;
  payload: Record<string, unknown>;
  source?: string;
}

/**
 * Parse a WWW-Authenticate: Payment header into a structured challenge.
 */
export function parseChallenge(wwwAuthenticate: string): MppChallenge | null {
  if (!wwwAuthenticate.startsWith("Payment ")) return null;

  const paramString = wwwAuthenticate.slice("Payment ".length);
  const params: Record<string, string> = {};

  // Parse key="value" pairs
  const regex = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = regex.exec(paramString)) !== null) {
    params[match[1]] = match[2];
  }

  if (!params.id || !params.method || !params.intent || !params.request) {
    return null;
  }

  // Decode the base64url-encoded request
  const requestJson = atob(
    params.request.replace(/-/g, "+").replace(/_/g, "/")
  );
  const request: MppRequest = JSON.parse(requestJson);

  return {
    id: params.id,
    realm: params.realm || "",
    method: params.method,
    intent: params.intent,
    request,
    expires: params.expires,
    raw: wwwAuthenticate,
  };
}

/**
 * Encode an MPP credential for the Authorization header.
 */
export function encodeCredential(credential: MppCredential): string {
  const json = JSON.stringify(credential);
  // base64url encode
  const base64 = btoa(json)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `Payment ${base64}`;
}

/**
 * Format an amount from base units to display units.
 * e.g. "100" in USD (cents) → "$1.00"
 */
export function formatAmount(amount: string, currency: string): string {
  const num = parseInt(amount, 10);
  const currencyUpper = currency.toUpperCase();

  // Common fiat currencies use 2 decimal places
  if (["USD", "EUR", "GBP"].includes(currencyUpper)) {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
    const symbol = symbols[currencyUpper] || currencyUpper;
    return `${symbol}${(num / 100).toFixed(2)}`;
  }

  return `${num} ${currencyUpper}`;
}
