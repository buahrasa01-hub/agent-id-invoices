"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { formatEther, isHash, isHex, parseEventLogs, type Hex } from "viem";
import { useReadContract, useTransactionReceipt } from "wagmi";
import { invoiceAbi } from "@/lib/abi";
import { addressUrl, hasExplorer, networkByChainId, txUrl } from "@/lib/env";
import { useNetwork } from "@/lib/network";
import { dueLabel, invoiceLabel } from "@/lib/order";

const ZERO = "0x0000000000000000000000000000000000000000";

function ReceiptInner() {
  const { net: appNet } = useNetwork();
  const params = useParams<{ orderId: string }>();
  const search = useSearchParams();
  // Receipt links carry their chain, so they still work after you switch networks.
  const net = networkByChainId(Number(search.get("chain"))) ?? appNet;
  const appChain = net.chain;
  const invoiceAddress = net.invoice;
  const explorer = hasExplorer(net);
  const invoiceId = params.orderId;
  const rawTx = search.get("tx");
  // Anything else in ?tx= is ignored, never shown: a receipt must not display text from the URL.
  const tx = rawTx && isHash(rawTx) ? rawTx : undefined;
  const validInvoice = isHex(invoiceId) && invoiceId.length === 66;
  const [copied, setCopied] = useState(false);

  const invoice = useReadContract({
    address: invoiceAddress,
    abi: invoiceAbi,
    functionName: "invoiceOf",
    args: validInvoice ? [invoiceId as Hex] : undefined,
    chainId: appChain.id,
    query: { enabled: validInvoice && Boolean(invoiceAddress) },
  });
  const receipt = useTransactionReceipt({ hash: tx, chainId: appChain.id, query: { enabled: Boolean(tx) } });

  if (!validInvoice) {
    return (
      <main className="shell">
        <h1>Receipt not found</h1>
        <p className="lede">That invoice id isn&apos;t valid. Invoice ids are 32-byte hex values (0x + 64 characters).</p>
      </main>
    );
  }

  const inv = invoice.data;
  const exists = Boolean(inv && inv.amount > 0n);
  const nowSec = Math.floor(Date.now() / 1000);
  const expired = exists && !inv!.paid && inv!.dueAt !== 0n && Number(inv!.dueAt) < nowSec;
  const status = !exists ? "not-found" : inv!.paid ? "paid" : inv!.cancelled ? "cancelled" : expired ? "expired" : "open";
  // Only show transaction details if that transaction really emitted InvoicePaid for this invoice.
  const paidLog =
    receipt.data && invoiceAddress
      ? parseEventLogs({ abi: invoiceAbi, logs: receipt.data.logs, eventName: "InvoicePaid" }).find(
          (l) => l.address.toLowerCase() === invoiceAddress.toLowerCase() && l.args.invoiceId.toLowerCase() === invoiceId.toLowerCase(),
        )
      : undefined;
  const txMatches = Boolean(paidLog);

  async function copyLink() {
    const url = `${window.location.origin}/checkout?id=${invoiceId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main className="shell" style={{ maxWidth: 760 }}>
      <div>
        <p className="eyebrow">Receipt · read from {appChain.name}</p>
        <h1>Invoice {invoiceLabel(invoiceId as Hex)}</h1>
      </div>

      <section className="card stack">
        {!invoiceAddress ? (
          <div className="stack">
            <span className="status-pill warn">Can&apos;t check</span>
            <p style={{ color: "var(--text-muted)" }}>No Invoice is configured for {appChain.name} in this app.</p>
          </div>
        ) : invoice.isLoading ? (
          <p className="empty">Reading Invoice.invoiceOf…</p>
        ) : invoice.isError ? (
          <div className="stack">
            <span className="status-pill warn">Can&apos;t check</span>
            <p style={{ color: "var(--text-muted)" }}>
              Couldn&apos;t read the invoice from {appChain.name}. The RPC may be busy.{" "}
              <button type="button" className="btn small" onClick={() => invoice.refetch()}>
                Try again
              </button>
            </p>
          </div>
        ) : !exists ? (
          <div className="stack">
            <span className="status-pill warn">Not found</span>
            <p style={{ color: "var(--text-muted)" }}>No invoice with this id exists on {appChain.name}.</p>
          </div>
        ) : (
          <>
            <div className="check-top" style={{ alignItems: "center" }}>
              <span className={`status-pill ${status === "paid" ? "good" : status === "open" ? "good" : "warn"}`}>
                {status === "paid" ? "Paid" : status === "open" ? "Open" : status === "cancelled" ? "Cancelled" : "Expired"}
              </span>
              <span className="fine">Due: {dueLabel(inv!.dueAt)}</span>
            </div>
            {inv!.memo && <p style={{ fontSize: 17, fontWeight: 600 }}>{inv!.memo}</p>}
            <div className="receipt-amount">
              {formatEther(inv!.amount)} <small style={{ fontSize: "0.4em", color: "var(--text-muted)" }}>BNB</small>
            </div>
            <dl className="kv">
              <dt>Invoice id</dt>
              <dd>{invoiceId}</dd>
              <dt>Merchant</dt>
              <dd>
                {explorer ? (
                  <a href={addressUrl(net, inv!.merchant)} target="_blank" rel="noreferrer">
                    {inv!.merchant}
                  </a>
                ) : (
                  inv!.merchant
                )}
              </dd>
              <dt>Payer</dt>
              <dd>
                {inv!.payer === ZERO ? (
                  "Any Agent ID holder may pay"
                ) : explorer ? (
                  <a href={addressUrl(net, inv!.payer)} target="_blank" rel="noreferrer">
                    {inv!.payer}
                  </a>
                ) : (
                  inv!.payer
                )}
              </dd>
              <dt>Invoice contract</dt>
              <dd>{invoiceAddress}</dd>
              {inv!.paid && (
                <>
                  <dt>Paid by</dt>
                  <dd>{inv!.paidBy}</dd>
                  <dt>Paid at</dt>
                  <dd>{new Date(Number(inv!.paidAt) * 1000).toLocaleString()}</dd>
                </>
              )}
              {txMatches && receipt.data && (
                <>
                  <dt>Block</dt>
                  <dd>{receipt.data.blockNumber.toString()}</dd>
                  <dt>Gas used</dt>
                  <dd>{receipt.data.gasUsed.toString()}</dd>
                  <dt>Submitted by</dt>
                  <dd>{receipt.data.from}</dd>
                  <dt>Transaction</dt>
                  <dd>{explorer ? <a href={txUrl(net, tx!)} target="_blank" rel="noreferrer">{tx}</a> : tx}</dd>
                </>
              )}
            </dl>
            {tx && receipt.data && !txMatches && (
              <p className="fine">The transaction in this link isn&apos;t the payment for this invoice, so it isn&apos;t shown.</p>
            )}
            <div className="row" style={{ gap: 12 }}>
              {status === "open" && (
                <Link className="btn" href={`/checkout?id=${invoiceId}`}>
                  Pay this invoice
                </Link>
              )}
              <button type="button" className="btn secondary" onClick={copyLink}>
                {copied ? "Copied" : "Copy pay link"}
              </button>
              <Link className="btn secondary" href="/activity">
                Activity
              </Link>
            </div>
          </>
        )}
      </section>

      <p className="fine">
        This page trusts nothing but the chain: it calls <code>Invoice.invoiceOf(invoiceId)</code> and checks the InvoicePaid event. The
        amount is set by the merchant in the invoice itself — there is nothing for a payer to over- or underpay.{" "}
        <Link href="/invoices/new">Create an invoice</Link>
      </p>
    </main>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<main className="shell"><p className="empty">Loading…</p></main>}>
      <ReceiptInner />
    </Suspense>
  );
}
