"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { formatEther, getAbiItem, type Address, type Hash, type Hex, type PublicClient } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { invoiceAbi } from "@/lib/abi";
import { hasExplorer, txUrl } from "@/lib/env";
import { getLogsChunked } from "@/lib/logs";
import { useNetwork } from "@/lib/network";
import { invoiceLabel, short } from "@/lib/order";

const WINDOWS = [
  { blocks: 1_000n, label: "Last 1k blocks" },
  { blocks: 5_000n, label: "Last 5k blocks" },
  { blocks: 20_000n, label: "Last 20k blocks" },
];

type Row = {
  key: string;
  kind: "created" | "paid" | "cancelled";
  invoiceId: Hex;
  payer?: Address;
  amount?: bigint;
  blockNumber: bigint;
  logIndex: number;
  txHash?: Hash;
};

export default function ActivityPage() {
  const { net } = useNetwork();
  const appChain = net.chain;
  const invoiceAddress = net.invoice;
  const deployBlock = net.deployBlock;
  const explorer = hasExplorer(net);
  const client = usePublicClient({ chainId: appChain.id }) as PublicClient | undefined;
  const { address } = useAccount();
  const [windowSize, setWindowSize] = useState(5_000n);
  const [onlyMine, setOnlyMine] = useState(false);
  const [progress, setProgress] = useState(0);

  const logs = useQuery({
    queryKey: ["invoice-logs", appChain.id, invoiceAddress, windowSize.toString(), onlyMine ? address : null],
    enabled: Boolean(client && invoiceAddress),
    queryFn: async () => {
      const head = await client!.getBlockNumber();
      let from = head > windowSize ? head - windowSize + 1n : 0n;
      if (deployBlock !== undefined && deployBlock > from) from = deployBlock;
      setProgress(0);
      const mine = onlyMine && address ? { payer: address } : undefined;
      const rows: Row[] = [];
      type Kind = "InvoiceCreated" | "InvoicePaid" | "InvoiceCancelled";
      async function fetchKind(name: Kind, args: { payer: Address } | undefined, index: number, total: number) {
        const event = getAbiItem({ abi: invoiceAbi, name });
        // The event is one of three, so viem types the logs as `never`; the shape below is what all three carry.
        const result = (await getLogsChunked(client!, {
          address: invoiceAddress!,
          event,
          args: args as Record<string, unknown> | undefined,
          fromBlock: from,
          toBlock: head,
          onProgress: (done, totalBlocks) =>
            setProgress(Math.round(((index + (totalBlocks ? Number((done * 100n) / totalBlocks) / 100 : 1)) / total) * 100)),
        })) as unknown as Array<{
          args: { invoiceId: Hex; payer?: Address; amount?: bigint };
          blockNumber: bigint;
          logIndex: number;
          transactionHash?: Hash;
        }>;
        for (const l of result) {
          rows.push({
            key: `${l.transactionHash}-${l.logIndex}`,
            kind: name === "InvoiceCreated" ? "created" : name === "InvoicePaid" ? "paid" : "cancelled",
            invoiceId: l.args.invoiceId,
            payer: l.args.payer,
            amount: l.args.amount,
            blockNumber: l.blockNumber,
            logIndex: l.logIndex,
            txHash: l.transactionHash,
          });
        }
      }
      await fetchKind("InvoiceCreated", mine, 0, 3);
      await fetchKind("InvoicePaid", mine, 1, 3);
      // InvoiceCancelled carries no payer, so "only mine" can't filter it — skip it there.
      if (mine) setProgress(100);
      else await fetchKind("InvoiceCancelled", undefined, 2, 3);
      rows.sort((a, b) => (a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : Number(b.blockNumber - a.blockNumber)));
      return { from, head, items: rows };
    },
  });

  const paidTotal = logs.data?.items.filter((r) => r.kind === "paid").reduce((sum, r) => sum + (r.amount ?? 0n), 0n) ?? 0n;
  const paidCount = logs.data?.items.filter((r) => r.kind === "paid").length ?? 0;

  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="eyebrow">Invoice · reading events</p>
          <h1>Invoice activity</h1>
          <p className="lede">
            Every <code>InvoiceCreated</code>, <code>InvoicePaid</code> and <code>InvoiceCancelled</code> event from your Invoice. BSC
            serves a limited range per <code>eth_getLogs</code> call, so the app reads in 2,000-block chunks.
          </p>
        </div>
        {logs.data && (
          <div className="score">
            <span className="score-num">{paidCount}</span>
            <span className="fine">
              paid · {formatEther(paidTotal)} BNB
            </span>
          </div>
        )}
      </div>

      {!invoiceAddress ? (
        <div className="card empty">
          No Invoice configured for {net.label}. Set <code>NEXT_PUBLIC_INVOICE_{net.key.toUpperCase().replace("-", "_")}</code> in{" "}
          <code>web/.env.local</code>.
        </div>
      ) : (
        <section className="card flush">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            {WINDOWS.map((w) => (
              <button
                key={w.label}
                type="button"
                className={`btn small ${windowSize === w.blocks ? "" : "secondary"}`}
                aria-pressed={windowSize === w.blocks}
                onClick={() => setWindowSize(w.blocks)}
              >
                {w.label}
              </button>
            ))}
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginLeft: "auto", fontSize: 14, color: "var(--text-muted)" }}>
              <input type="checkbox" checked={onlyMine} disabled={!address} onChange={(e) => setOnlyMine(e.target.checked)} />
              Only my invoices
            </label>
          </div>

          {logs.isFetching && (
            <div style={{ padding: "16px 20px" }} aria-live="polite">
              <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="fine" style={{ marginTop: 8 }}>
                Scanning {windowSize.toLocaleString("en-US")} blocks, 2,000 at a time… {progress}%
              </p>
            </div>
          )}

          {logs.error && <p className="empty">Couldn&apos;t read events: {(logs.error as Error).message}</p>}

          {logs.data && logs.data.items.length === 0 && !logs.isFetching && (
            <p className="empty">
              No invoice events in blocks {logs.data.from.toString()}–{logs.data.head.toString()}.{" "}
              <Link href="/invoices/new">Create one</Link>.
            </p>
          )}

          {logs.data && logs.data.items.length > 0 && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Invoice</th>
                    <th>Payer</th>
                    <th className="right">Amount</th>
                    <th className="right">Block</th>
                    <th>Links</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.items.map((r) => (
                    <tr key={r.key}>
                      <td>
                        <span className={`status-pill ${r.kind === "paid" ? "good" : r.kind === "cancelled" ? "warn" : ""}`}>
                          {r.kind === "created" ? "Created" : r.kind === "paid" ? "Paid" : "Cancelled"}
                        </span>
                      </td>
                      <td className="mono">{invoiceLabel(r.invoiceId)}</td>
                      <td className="mono">{r.payer ? short(r.payer) : "—"}</td>
                      <td className="right num">
                        {r.amount !== undefined ? (
                          <>
                            {formatEther(r.amount)} BNB
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="right num">{r.blockNumber.toString()}</td>
                      <td style={{ display: "flex", gap: 14 }}>
                        <Link href={`/receipts/${r.invoiceId}?tx=${r.txHash ?? ""}&chain=${appChain.id}`}>Receipt</Link>
                        {explorer && r.txHash && (
                          <a href={txUrl(net, r.txHash)} target="_blank" rel="noreferrer">
                            Tx
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
