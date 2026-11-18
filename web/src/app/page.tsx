"use client";

import { formatEther } from "viem";
import { useAccount, useBalance, useBytecode } from "wagmi";
import { CheckIcon, CrossIcon, WarnIcon } from "@/components/Icons";
import { AGENT_ID_GATE_COPY, useAgentId } from "@/components/useAgentId";
import { hackathonAnnouncementUrl, hasExplorer } from "@/lib/env";
import { useNetwork } from "@/lib/network";
import { short } from "@/lib/order";

type Status = "ok" | "warn" | "bad" | "idle";
interface Check {
  title: string;
  status: Status;
  value: string;
  detail: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

// Shown on a fork, where balances surprise people: they are the real testnet balances.
const FORK_COPY = "Copied from BSC testnet when the fork started. Spending it here doesn't touch the real testnet.";

export default function SetupPage() {
  const { net, select } = useNetwork();
  const appChain = net.chain;
  const chainMode = net.key;
  const invoiceAddress = net.invoice;
  const { address, isConnected, chainId, connector } = useAccount();
  const onChain = isConnected && chainId === appChain.id;
  const agentId = useAgentId(address);

  const gas = useBalance({ address, chainId: appChain.id, query: { enabled: onChain } });
  const code = useBytecode({ address: invoiceAddress, chainId: appChain.id, query: { enabled: Boolean(invoiceAddress) } });

  const gasValue = gas.data?.value;

  const checks: Check[] = [
    isConnected
      ? { title: "Wallet connected", status: "ok", value: short(address ?? ""), detail: `${connector?.name ?? "Wallet"} is connected.` }
      : { title: "Wallet connected", status: "bad", value: "not connected", detail: "Connect MetaMask, Rabby or any browser wallet with the button at the top right." },
    !isConnected
      ? { title: "Network", status: "idle", value: "—", detail: `Needs ${appChain.name} (${appChain.id}).` }
      : onChain
        ? { title: "Network", status: "ok", value: `chain ${appChain.id}`, detail: `Connected to ${appChain.rpcUrls.default.http[0]}.` }
        : {
            title: "Network",
            status: "bad",
            value: `chain ${chainId}`,
            detail: `Switch to ${appChain.name} (${appChain.id}). Your wallet will offer to add it.`,
            action: { label: "Switch network", onClick: () => select(net.key) },
          },
    !isConnected
      ? { title: "Agent ID", status: "idle", value: "—", detail: "Only Agent ID holders can create or pay invoices." }
      : !onChain || !invoiceAddress
        ? { title: "Agent ID", status: "idle", value: "—", detail: "Connect to the right network first." }
        : agentId.isLoading
          ? { title: "Agent ID", status: "idle", value: "…", detail: "Checking whether this wallet holds an Agent ID…" }
          : agentId.isHolder
            ? {
                title: "Agent ID",
                status: "ok",
                value: agentId.balance !== undefined ? `${agentId.balance.toString()} held` : "held",
                detail: `This wallet holds an Agent ID (${agentId.name}). You can create and pay invoices.`,
              }
            : { title: "Agent ID", status: "bad", value: "not held", detail: AGENT_ID_GATE_COPY },
    !onChain || gasValue === undefined
      ? { title: "BNB balance", status: "idle", value: "—", detail: "BNB pays for invoices and for gas." }
      : gasValue > 0n
        ? { title: "BNB balance", status: "ok", value: `${Number(formatEther(gasValue)).toFixed(4)} BNB`, detail: chainMode === "fork" ? FORK_COPY : "Ready to pay invoices and gas." }
        : chainMode === "bsc-testnet"
          ? { title: "BNB balance", status: "warn", value: "0 BNB", detail: "Get testnet BNB from the BSC testnet faucet: https://testnet.bnbchain.org/faucet-smart — Docs › Get test BNB has the steps." }
          : { title: "BNB balance", status: "warn", value: "0", detail: chainMode === "fork" ? "Give yourself BNB with `make deal TO=<address>`." : "Import one of anvil's default accounts into your wallet (local chain only)." },
    !invoiceAddress
      ? { title: "Invoice contract", status: "warn", value: "not set", detail: chainMode === "bsc-testnet" ? "Deploy it with `make deploy-testnet`, then set NEXT_PUBLIC_INVOICE_BSC_TESTNET in web/.env.local." : chainMode === "bsc" ? "Deploy it with `make deploy-mainnet`, then set NEXT_PUBLIC_INVOICE_BSC_MAINNET in web/.env.local." : chainMode === "fork" ? "Deploy it with `make deploy-fork`, then set NEXT_PUBLIC_INVOICE_FORK in web/.env.local." : "Deploy it with `make deploy-local`, then set NEXT_PUBLIC_INVOICE_LOCAL in web/.env.local." }
      : code.isLoading
        ? { title: "Invoice contract", status: "idle", value: short(invoiceAddress), detail: "Looking it up…" }
        : code.data && code.data !== "0x"
          ? { title: "Invoice contract", status: "ok", value: short(invoiceAddress), detail: "Deployed and reachable." }
          : { title: "Invoice contract", status: "bad", value: short(invoiceAddress), detail: `No contract at this address on ${appChain.name}. Check the address in web/.env.local.` },
  ];

  const passed = checks.filter((c) => c.status === "ok").length;
  const left = checks.length - passed;

  return (
    <main className="shell">
      <section className="page-head">
        <div>
          <p className="eyebrow">Step 0 · Before you build</p>
          <h1>Is your setup ready for Agent ID Invoices?</h1>
          <p className="lede">
            We check your wallet, network, Agent ID, BNB balance and contract, and tell you exactly what to fix. Then create an invoice —
            or pay one. Only Agent ID holders can create and pay; invoices settle in native BNB.
          </p>
        </div>
        <div className="score" aria-live="polite">
          <span className="score-num">
            {passed}
            <small> / {checks.length}</small>
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: left ? "var(--warn)" : "var(--good)" }}>
            {left ? `${left} item${left > 1 ? "s" : ""} to fix` : "Ready to build"}
          </span>
        </div>
      </section>

      <section className="grid-2" aria-label="Checks">
        <div className="card flush">
          {checks.map((c) => (
            <div className="check" key={c.title}>
              <div className={`chip ${c.status}`}>
                {c.status === "ok" ? <CheckIcon /> : c.status === "bad" ? <CrossIcon /> : c.status === "warn" ? <WarnIcon /> : null}
              </div>
              <div className="check-body">
                <div className="check-top">
                  <span className="check-title">{c.title}</span>
                  <span className={`check-value ${c.status === "warn" ? "warn" : c.status === "bad" ? "bad" : ""}`}>{c.value}</span>
                </div>
                <p className="check-detail">{c.detail}</p>
                {c.action && (
                  <div className="check-action">
                    {c.action.href ? (
                      <a className="btn small" href={c.action.href} target="_blank" rel="noreferrer">
                        {c.action.label}
                      </a>
                    ) : (
                      <button type="button" className="btn small" onClick={c.action.onClick}>
                        {c.action.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="card">
            <h2>Network details</h2>
            <p className="sub">
              Already set in <code>web/src/lib/env.ts</code>.
              {chainMode === "fork" && " Balances start as a copy of BSC testnet; what you spend here stays on your machine."}
            </p>
            <dl className="kv">
              <dt>Name</dt>
              <dd>{appChain.name}</dd>
              <dt>Chain ID</dt>
              <dd>{appChain.id}</dd>
              <dt>RPC</dt>
              <dd>{appChain.rpcUrls.default.http[0]}</dd>
              <dt>Explorer</dt>
              <dd>{hasExplorer(net) ? net.explorer!.replace("https://", "") : "none (local chain)"}</dd>
              <dt>Agent ID</dt>
              <dd>{agentId.agentId ? short(agentId.agentId) : "—"}</dd>
              <dt>Currency</dt>
              <dd>BNB · 18 dec</dd>
            </dl>
            {isConnected && !onChain && (
              <button type="button" className="btn secondary block" style={{ marginTop: 16 }} onClick={() => select(net.key)}>
                Add {appChain.name} to wallet
              </button>
            )}
          </div>

          <div className="card info">
            <h2>Known gotchas</h2>
            <ul>
              <li>
                Only Agent ID holders can create or pay. The contract enforces it — a wallet without an Agent ID reverts with{" "}
                <code>NotAgentIdHolder</code>.
              </li>
              <li>
                <code>eth_getLogs</code> accepts a limited range per call on BSC. The Activity page reads in 2,000-block chunks.
              </li>
              <li>No WebSocket RPC. Poll over HTTPS.</li>
              <li>
                On BSC testnet and local chains there is no real Agent ID, so the deploy script deploys a mock and mints one to the
                deployer. Never point mainnet at the mock.
              </li>
              <li>
                Judging counts on-chain Agent ID activity. Payments that settle only on another chain don&apos;t count. See the{" "}
                <a href={hackathonAnnouncementUrl} target="_blank" rel="noreferrer">
                  hackathon announcement
                </a>
                .
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="row" style={{ gap: 12, marginTop: 16 }}>
        <a className="btn" href="/invoices/new">
          Create an invoice
        </a>
        <a className="btn secondary" href="/checkout">
          Pay an invoice
        </a>
        <a className="btn secondary" href="/activity">
          Activity
        </a>
      </section>
    </main>
  );
}
