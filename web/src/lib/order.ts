import { formatEther, keccak256, toHex, type Hex } from "viem";

/**
 * Invoice helpers. The amount always comes from the chain (`Invoice.invoiceOf`);
 * nothing here ever decides what an invoice costs.
 */

export function newInvoiceId(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return keccak256(toHex(bytes));
}

/** Short, human-friendly label for a bytes32 invoice id. */
export function invoiceLabel(invoiceId: Hex): string {
  return `#${invoiceId.slice(2, 6).toUpperCase()}-${invoiceId.slice(-4).toUpperCase()}`;
}

/** Backwards-compatible alias (the old checkout pages called it orderLabel). */
export const orderLabel = invoiceLabel;

/** Amounts are BNB (18 decimals). */
export function formatBnb(amount: bigint): string {
  return formatEther(amount);
}

/** Human-readable due date: "No expiry" for 0, otherwise a local date + time. */
export function dueLabel(dueAt: bigint): string {
  if (dueAt === 0n) return "No expiry";
  return new Date(Number(dueAt) * 1000).toLocaleString();
}

export function short(value: string, head = 6, tail = 4): string {
  return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}
