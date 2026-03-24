/**
 * MPP (Machine Payments Protocol) client setup for paying teenytiny.ai per-request.
 *
 * When teenytiny.ai enables MPP, API calls will return 402 Payment Required.
 * The mppx client handles this automatically:
 * 1. Receives 402 with payment challenge
 * 2. Signs a payment transaction with the user's Privy wallet
 * 3. Retries the request with payment credential
 * 4. Returns the response with a payment receipt
 */

import { Mppx, tempo } from "mppx/client";
import type { Account } from "viem";

let mppxInstance: ReturnType<typeof Mppx.create> | null = null;

/**
 * Initialize the MPP client with a viem account (from Privy embedded wallet).
 * This polyfills globalThis.fetch to automatically handle 402 responses.
 */
export function initMppClient(account: Account) {
  // Restore any previous polyfill
  if (mppxInstance) {
    Mppx.restore();
  }

  mppxInstance = Mppx.create({
    methods: [tempo({ account })],
    polyfill: false, // Don't polyfill global fetch — we'll use mppx.fetch explicitly
  });

  return mppxInstance;
}

/**
 * Get the payment-aware fetch function.
 * Falls back to regular fetch if MPP is not initialized.
 */
export function getMppFetch(): typeof globalThis.fetch {
  if (mppxInstance) {
    return mppxInstance.fetch as typeof globalThis.fetch;
  }
  return globalThis.fetch;
}

/**
 * Tear down the MPP client.
 */
export function destroyMppClient() {
  if (mppxInstance) {
    Mppx.restore();
    mppxInstance = null;
  }
}