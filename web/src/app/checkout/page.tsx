"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { formatEther, isHex, type Hash, type Hex } from "viem";
import { useAccount, useBalance, useConfig, useReadContract } from "wagmi";
import { readContract, simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { CheckIcon } from "@/components/Icons";
import { AGENT_ID_GATE_COPY, useAgentId } from "@/components/useAgentId";
import { invoiceAbi } from "@/lib/abi";
import { addressUrl, hasExplorer, txUrl } from "@/lib/env";
import { useNetwork } from "@/lib/network";
import { explain } from "@/lib/errors";
import { dueLabel, formatBnb, invoiceLabel, short } from "@/lib/order";

type Phase = "idle" | "working" | "done" | "error";

const ZERO = "0x0000000000000000000000000000000000000000";

const STEPS = [
  { title: "Pay invoice", who: "pay(invoiceId) with the exact amount as BNB · you pay gas" },
  { title: "Confirmed on BNB Smart Chain", who: "The InvoicePaid event is your receipt" },
];

function PayPageInner() {
  const { net } = useNetwork();
  const appChain = net.chain;
  const invoiceAddress = net.invoice;
  const explorer = hasExplorer(net);
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const onChain = isConnected && chainId === appChain.id;
  const agentId = useAgentId(address);
  const search = useSearchParams();
  const paramId = search.get("id") ?? "";

  const [typedId, setTypedId] = useState(paramId);
  useEffect(() => setTypedId(paramId), [paramId]);
  const invoiceId = (isHex(typedId) && typedId.length === 66 ? typedId : null) as Hex | null;

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [block, setBlock] = useState<bigint | null>(null);

  const invoice = useReadContract({
    address: invoiceAddress,
    abi: invoiceAbi,
    functionName: "invoiceOf",
    args: invoiceId ? [invoiceId] : undefined,
    chainId: appChain.id,
    query: { enabled: Boolean(invoiceId && invoiceAddress) },
  });
  const inv = invoice.data;
  const exists = Boolean(inv && inv.amount > 0n);
  const nowSec = Math.floor(Date.now() / 1000);
  const expired = exists && inv!.dueAt !== 0n && Number(inv!.dueAt) < nowSec;
  const status = !exists ? "not-found" : inv!.paid ? "paid" : inv!.cancelled ? "cancelled" : expired ? "expired" : "open";
  const isOpen = status === "open";
  const designated = exists && inv!.payer !== ZERO;
  const wrongPayer = designated && address !== undefined && inv!.payer.toLowerCase() !== address.toLowerCase();
  const amount = exists ? inv!.amount : 0n;

  const balance = useBalance({ address, chainId: appChain.id, query: { enabled: onChain } });
  const enoughBalance = balance.data === undefined || balance.data.value >= amount;
  const gateBlocked = onChain && Boolean(invoiceAddress) && isOpen && !agentId.isLoading && !agentId.isHolder;
  const busy = phase === "working";

  function reset() {
    setStep(0);
    setPhase("idle");
    setError(null);
    setTxHash(null);
    setBlock(null);
  }

  /** Stop before any gas is spent if this invoice can't be paid. */
  async function assertPayable() {
    if (!invoiceId || !invoiceAddress) throw new Error("Pick an invoice first.");
    const open = await readContract(config, { address: invoiceAddress, abi: invoiceAbi, functionName: "isOpen", args: [invoiceId], chainId: appChain.id });
    if (!open) throw new Error("This invoice is no longer open (paid, cancelled, or expired).");
  }

  async function onPay() {
    if (phase === "done") {
      reset();
      return;
    }
    if (!address || !invoiceAddress || !invoiceId) return;
    setError(null);
    setPhase("working");
    setStep(0);
    try {
      await assertPayable();
      // One transaction: pay(invoiceId) with the exact invoiced amount as msg.value.
      // Simulate first: a revert shows up here with its reason, before the wallet asks for gas.
      const { request } = await simulateContract(config, {
        account: address,
        address: invoiceAddress,
        abi: invoiceAbi,
        functionName: "pay",
        args: [invoiceId],
        value: amount,
        chainId: appChain.id,
      });
      const hash = await writeContract(config, request);
      setTxHash(hash);
      setStep(1);
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: appChain.id });
      if (receipt.status !== "success") throw new Error("The transaction reverted on chain. Nothing was charged.");
      setBlock(receipt.blockNumber);
      setStep(2);
      setPhase("done");
      invoice.refetch();
    } catch (e) {
      setError(explain(e));
      setPhase("error");
    }
  }

  const blockers = useMemo(() => {
    const list: string[] = [];
    if (!invoiceId) list.push("Paste an invoice id to load it.");
    else if (!exists) list.push("No invoice with this id exists on this network.");
    else if (status === "paid") list.push("This invoice is already paid.");
    else if (status === "cancelled") list.push("This invoice was cancelled by the merchant.");
    else if (status === "expired") list.push("This invoice is past its due date.");
    else if (wrongPayer) list.push("This invoice is for a different payer address.");
    return list;
  }, [invoiceId, exists, status, wrongPayer]);

  const cta = (() => {
    if (!isConnected) return "Connect a wallet to pay";
    if (!onChain) return "Switch network to pay";
    if (!invoiceAddress) return "Deploy Invoice first";
    if (phase === "done") return "Pay another invoice";
    if (phase === "error") return "Try again";
    if (busy) return ["Check your wallet…", "Confirming…"][step] ?? "Working…";
    if (gateBlocked) return "Agent ID required";
    return `Pay ${formatBnb(amount)} BNB`;
  })();
  const ctaDisabled = !onChain || !invoiceAddress || busy || blockers.length > 0 || gateBlocked || (!enoughBalance && phase !== "done");

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="eyebrow">Invoice · {net.label}</p>
          <h1>Pay an invoice</h1>
          <p className="lede">Paste an invoice id — or open a pay link from the merchant — and pay the exact amount in BNB.</p>
        </div>
      </div>

      <section className="card stack" aria-label="Find invoice" style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Invoice id</span>
          <input
            className="field"
            type="text"
            value={typedId}
            disabled={busy}
            placeholder="0x… (32-byte hex)"
            onChange={(e) => {
              setTypedId(e.target.value.trim());
              reset();
            }}
          />
        </label>
        <p className="fine">
          Don&apos;t have one? The merchant creates invoices on the <Link href="/invoices/new">Create invoice</Link> page.
        </p>
      </section>

      {invoiceId && (
        <div className="row">
          <section className="card stack" aria-label="Invoice" style={{ flex: "1 1 340px" }}>
            <div className="check-top" style={{ alignItems: "baseline" }}>
              <h2>Invoice</h2>
              <span className="mono" style={{ color: "var(--text-muted)" }}>{invoiceLabel(invoiceId)}</span>
            </div>
            {!invoiceAddress ? (
              <p style={{ color: "var(--text-muted)" }}>No Invoice is configured for {appChain.name} in this app.</p>
            ) : invoice.isLoading ? (
              <p className="empty">Reading Invoice.invoiceOf…</p>
            ) : invoice.isError ? (
              <p className="empty">
                Couldn&apos;t read the invoice from {appChain.name}. The RPC may be busy.{" "}
                <button type="button" className="btn small" onClick={() => invoice.refetch()}>
                  Try again
                </button>
              </p>
            ) : !exists ? (
              <p className="empty">No invoice with this id exists on {appChain.name}.</p>
            ) : (
              <>
                <div className="check-top" style={{ alignItems: "center" }}>
                  <span className={`status-pill ${status === "open" ? "good" : status === "paid" ? "good" : "warn"}`}>
                    {status === "open" ? "Open" : status === "paid" ? "Paid" : status === "cancelled" ? "Cancelled" : "Expired"}
                  </span>
                  <span className="fine">{dueLabel(inv!.dueAt)}</span>
                </div>
                {inv!.memo && <p style={{ fontSize: 17, fontWeight: 600 }}>{inv!.memo}</p>}
                <div className="receipt-amount">
                  {formatEther(inv!.amount)} <small style={{ fontSize: "0.4em", color: "var(--text-muted)" }}>BNB</small>
                </div>
                <dl className="kv" style={{ fontSize: 13 }}>
                  <dt>Invoice id</dt>
                  <dd>{invoiceId}</dd>
                  <dt>Payer</dt>
                  <dd>
                    {designated ? (
                      explorer ? (
                        <a href={addressUrl(net, inv!.payer)} target="_blank" rel="noreferrer">
                          {inv!.payer}
                        </a>
                      ) : (
                        inv!.payer
                      )
                    ) : (
                      "Any Agent ID holder may pay"
                    )}
                  </dd>
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
                  <dt>Your BNB balance</dt>
                  <dd>{balance.data !== undefined ? `${formatEther(balance.data.value)} BNB` : "—"}</dd>
                  {inv!.paid && (
                    <>
                      <dt>Paid by</dt>
                      <dd>{inv!.paidBy}</dd>
                      <dt>Paid at</dt>
                      <dd>{new Date(Number(inv!.paidAt) * 1000).toLocaleString()}</dd>
                    </>
                  )}
                </dl>
              </>
            )}
          </section>

          <section className="card stack" aria-label="Payment" style={{ flex: "1.3 1 420px" }}>
            <ol className="steps">
              {STEPS.map((s, i) => {
                const done = step > i;
                const active = busy && step === i;
                return (
                  <li key={s.title} className={`step ${done ? "done" : active ? "active" : ""}`}>
                    <div className="step-dot">{done ? <CheckIcon /> : i + 1}</div>
                    <div className="step-body">
                      <div className="step-top">
                        <span className="step-title">{s.title}</span>
                        <span className="step-state">{done ? "Done" : active ? "In progress…" : "Waiting"}</span>
                      </div>
                      <p className="step-who">{s.who}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {gateBlocked && (
              <div className="notice warn" role="alert">
                <strong>You need an Agent ID to pay invoices</strong>
                <span>{AGENT_ID_GATE_COPY}</span>
              </div>
            )}

            {blockers.length > 0 && phase !== "done" && (
              <div className="notice warn" role="status">
                <strong>Can&apos;t pay this invoice</strong>
                {blockers.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
            )}

            {!enoughBalance && phase !== "done" && isOpen && (
              <div className="notice warn" role="status">
                <strong>Not enough BNB</strong>
                <span>
                  This invoice needs {formatBnb(amount)} BNB plus gas. See the <Link href="/">Setup</Link> page for how to get test BNB.
                </span>
              </div>
            )}

            {error && (
              <div className="notice bad" role="alert">
                <strong>Payment didn&apos;t go through</strong>
                <span>{error}</span>
              </div>
            )}

            {phase === "done" && txHash && (
              <div className="notice good" role="status">
                <div className="row-between">
                  <strong>
                    Paid {formatBnb(amount)} BNB
                    {block !== null ? ` · confirmed in block ${block.toLocaleString("en-US")}` : ""}
                  </strong>
                  <span style={{ display: "flex", gap: 16 }}>
                    {explorer && (
                      <a href={txUrl(net, txHash)} target="_blank" rel="noreferrer">
                        Explorer
                      </a>
                    )}
                    <Link href={`/receipts/${invoiceId}?tx=${txHash}&chain=${appChain.id}`}>View receipt</Link>
                  </span>
                </div>
              </div>
            )}

            <button type="button" className="btn big block" disabled={ctaDisabled} onClick={onPay}>
              {cta}
            </button>
            <p className="fine">
              One transaction, exact amount in BNB, straight to the merchant — no token approval, no relayer. The contract takes the amount
              from the invoice, not from you.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<main className="shell"><p className="empty">Loading…</p></main>}>
      <PayPageInner />
    </Suspense>
  );
}
