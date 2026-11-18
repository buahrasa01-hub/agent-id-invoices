"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { AGENT_ID_ADDRESS, agentIdAbi, invoiceAbi } from "@/lib/abi";
import { useNetwork } from "@/lib/network";

/**
 * Agent ID gate for the connected wallet.
 *
 * The Invoice contract is the source of truth: `isAgentIdHolder(address)`
 * checks the Agent ID contract the Invoice was deployed with. On BSC mainnet
 * that is the real Agent ID (0x60B9…022f); on BSC testnet / local chains the
 * deploy script deploys a MockAgentID instead, and the Invoice points at it.
 * `agentId()` is read so the UI can show which Agent ID contract is in use.
 */
export function useAgentId(address: `0x${string}` | undefined) {
  const { net } = useNetwork();
  const appChain = net.chain;
  const invoiceAddress = net.invoice;

  const holder = useReadContract({
    address: invoiceAddress,
    abi: invoiceAbi,
    functionName: "isAgentIdHolder",
    args: address ? [address] : undefined,
    chainId: appChain.id,
    query: { enabled: Boolean(address && invoiceAddress) },
  });

  const agentIdAddress = useReadContract({
    address: invoiceAddress,
    abi: invoiceAbi,
    functionName: "agentId",
    chainId: appChain.id,
    query: { enabled: Boolean(invoiceAddress) },
  });

  // Display balance/name from the Agent ID contract the Invoice points at
  // (the real one on mainnet, the mock on testnet/local).
  const agentId = agentIdAddress.data ?? (appChain.id === 56 ? AGENT_ID_ADDRESS : undefined);
  const meta = useReadContracts({
    contracts: agentId && address
      ? [
          { address: agentId, abi: agentIdAbi, functionName: "balanceOf", args: [address], chainId: appChain.id },
          { address: agentId, abi: agentIdAbi, functionName: "name", chainId: appChain.id },
        ]
      : [],
    query: { enabled: Boolean(agentId && address) },
  });

  const balance = meta.data?.[0]?.result as bigint | undefined;
  const name = (meta.data?.[1]?.result as string | undefined) ?? "Agent ID";

  return {
    /** True when the connected wallet holds an Agent ID (per the Invoice). */
    isHolder: holder.data ?? false,
    /** True while the holder check is still loading. */
    isLoading: holder.isLoading || agentIdAddress.isLoading,
    /** The Agent ID contract address the Invoice points at (mock on testnet/local). */
    agentId,
    /** How many Agent IDs the wallet holds (display only). */
    balance,
    /** Agent ID token name (display only). */
    name,
  };
}

/** The message shown when a wallet without an Agent ID hits the gate. */
export const AGENT_ID_GATE_COPY =
  "You need an Agent ID to create or pay invoices. Claim one in the Binance App (Wallet > Agent ID banner) — it is free, one per wallet.";
