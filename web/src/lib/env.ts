import { isAddress, type Address, type Chain } from "viem";
import { defineChain } from "viem";

/** BNB Smart Chain testnet (97). */
export const bscTestnet = defineChain({
  id: 97,
  name: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: { default: { http: ["https://data-seed-prebsc-1-s1.binance.org:8545"] } },
  blockExplorers: { default: { name: "BscScan", url: "https://testnet.bscscan.com" } },
  testnet: true,
});

/** BNB Smart Chain mainnet (56). */
export const bscMainnet = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: { default: { http: ["https://bsc-dataseed1.binance.org"] } },
  blockExplorers: { default: { name: "BscScan", url: "https://bscscan.com" } },
});

/** Local fork of BSC testnet on 127.0.0.1:8555 (chain 97097, `make fork`). */
export const bscFork = defineChain({
  id: 97097,
  name: "BSC testnet fork (local)",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8555"] } },
  testnet: true,
});

/** Empty local anvil chain on 127.0.0.1:8545 (chain 31337, `make anvil`). */
export const localAnvil = defineChain({
  id: 31337,
  name: "Local anvil",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  testnet: true,
});

export type NetworkKey = "bsc-testnet" | "bsc" | "fork" | "local";

export interface Network {
  key: NetworkKey;
  /** Short name for the network switcher. */
  label: string;
  chain: Chain;
  /** Your AgentIDInvoice on this network, if you deployed one. */
  invoice?: Address;
  /** Only scan events from this block onward on the Activity page. */
  deployBlock?: bigint;
  /** Explorer base URL; undefined on local chains. */
  explorer?: string;
}

const address = (v: string | undefined): Address | undefined => (v && isAddress(v.trim()) ? (v.trim() as Address) : undefined);
const block = (v: string | undefined): bigint | undefined => (v && /^\d+$/.test(v.trim()) ? BigInt(v.trim()) : undefined);

// NEXT_PUBLIC_* values must be written out in full so Next.js can inline them into the browser bundle.
const all: Record<NetworkKey, Network> = {
  "bsc-testnet": {
    key: "bsc-testnet",
    label: "BSC testnet",
    chain: bscTestnet,
    invoice: address(process.env.NEXT_PUBLIC_INVOICE_BSC_TESTNET),
    deployBlock: block(process.env.NEXT_PUBLIC_DEPLOY_BLOCK_BSC_TESTNET),
    explorer: "https://testnet.bscscan.com",
  },
  bsc: {
    key: "bsc",
    label: "BSC mainnet",
    chain: bscMainnet,
    invoice: address(process.env.NEXT_PUBLIC_INVOICE_BSC_MAINNET),
    deployBlock: block(process.env.NEXT_PUBLIC_DEPLOY_BLOCK_BSC_MAINNET),
    explorer: "https://bscscan.com",
  },
  fork: {
    key: "fork",
    label: "Local fork",
    chain: bscFork,
    invoice: address(process.env.NEXT_PUBLIC_INVOICE_FORK),
    deployBlock: block(process.env.NEXT_PUBLIC_DEPLOY_BLOCK_FORK),
  },
  local: {
    key: "local",
    label: "Local anvil",
    chain: localAnvil,
    invoice: address(process.env.NEXT_PUBLIC_INVOICE_LOCAL),
    deployBlock: undefined,
  },
};

const requested = (process.env.NEXT_PUBLIC_NETWORKS ?? "bsc-testnet")
  .split(",")
  .map((k) => k.trim())
  .filter((k): k is NetworkKey => k in all);

/** The networks the app offers, in the order of NEXT_PUBLIC_NETWORKS. The first one is the default. */
export const networks: [Network, ...Network[]] = (() => {
  const keys = [...new Set(requested)];
  const list = (keys.length ? keys : (["bsc-testnet"] as NetworkKey[])).map((k) => all[k]);
  return list as [Network, ...Network[]];
})();

export const defaultNetwork = networks[0];

export function networkByChainId(chainId: number | undefined): Network | undefined {
  return networks.find((n) => n.chain.id === chainId);
}

export function networkByKey(key: string | null | undefined): Network | undefined {
  return networks.find((n) => n.key === key);
}

/** True when the network has a public explorer (links only make sense there). */
export function hasExplorer(net: Network): boolean {
  return Boolean(net.explorer);
}

export function txUrl(net: Network, hash: string): string {
  return `${net.explorer}/tx/${hash}`;
}

export function addressUrl(net: Network, address: string): string {
  return `${net.explorer}/address/${address}`;
}

export const walletConnectProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || undefined;

/** Where the "Source" links and the clone command on the Docs page point. Override it for a fork or a preview deploy. */
export const repoUrl = (process.env.NEXT_PUBLIC_REPO_URL?.trim() || "https://github.com/buahrasa01-hub/agent-id-invoices").replace(/\.git$|\/+$/g, "");

/** Official announcement of the Agent ID Hackathon (Binance Wallet x BNB Chain). */
export const hackathonAnnouncementUrl =
  "https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf";
