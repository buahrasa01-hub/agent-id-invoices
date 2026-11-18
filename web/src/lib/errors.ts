import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

/** Turns wallet / RPC / revert errors into one sentence a user can act on. */
export function explain(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";
  // MetaMask won't add a network whose RPC URL another saved network already uses.
  const dup = /same RPC endpoint as existing network for chain \w+ \('([^']*)'\)/.exec(fullMessage(error));
  if (dup) return `Your wallet already has a network ("${dup[1]}") using the same RPC address. Edit or remove that network in your wallet, then try again.`;
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return "You cancelled the request in your wallet. Nothing was sent.";
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name === "NotAgentIdHolder") return "This wallet doesn't hold an Agent ID. Only Agent ID holders can create or pay invoices — claim one in the Binance App (Wallet > Agent ID banner).";
      if (name === "AlreadyPaid") return "This invoice is already paid. Start a new invoice.";
      if (name === "AlreadyCancelled") return "This invoice was already cancelled.";
      if (name === "InvoiceNotFound") return "No invoice with this id exists on this network.";
      if (name === "InvoiceExists") return "An invoice with this id already exists. Try again.";
      if (name === "InvoiceExpired") return "This invoice is past its due date.";
      if (name === "WrongPayer") return "This invoice is for a different payer address.";
      if (name === "WrongAmount") return "The BNB sent doesn't match the invoiced amount. The contract takes the exact amount from the invoice.";
      if (name === "ZeroAmount") return "The amount must be more than zero.";
      if (name === "InvalidDueDate") return "The due date must be in the future.";
      if (name === "NotInvoiceMerchant") return "Only the invoice's merchant can do that.";
      if (name === "TransferFailed") return "The BNB transfer to the merchant failed.";
      const reason = revert.reason ?? "";
      if (/expired/i.test(reason)) return "This invoice is past its due date.";
      if (/exceeds balance|insufficient/i.test(reason)) return "Not enough BNB in your wallet for this invoice plus gas.";
      if (reason) return reason;
    }
    if (/insufficient funds/i.test(error.message)) return "Not enough BNB for this payment plus gas.";
    return error.shortMessage;
  }
  return error.message;
}

/** Wallet errors often hide the real reason in `cause` or `data.cause`. */
function fullMessage(error: unknown, depth = 0): string {
  if (!error || typeof error !== "object" || depth > 5) return "";
  const e = error as { message?: unknown; details?: unknown; cause?: unknown; data?: { cause?: unknown; message?: unknown } };
  return [e.message, e.details, e.data?.message, fullMessage(e.cause, depth + 1), fullMessage(e.data?.cause, depth + 1)]
    .filter((m) => typeof m === "string" && m)
    .join(" | ");
}
