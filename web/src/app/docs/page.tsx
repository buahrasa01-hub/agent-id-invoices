import type { Metadata } from "next";
import { GitHubIcon } from "@/components/Icons";
import { AGENT_ID_ADDRESS } from "@/lib/abi";
import { hackathonAnnouncementUrl, repoUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Docs" };

const sections = [
  { id: "challenge", label: "The challenge" },
  { id: "quickstart", label: "Quickstart" },
  { id: "network", label: "Network details" },
  { id: "tokens", label: "Get test BNB" },
  { id: "deploy", label: "Deploy to BSC" },
  { id: "invoices", label: "How invoices work" },
  { id: "differences", label: "Differences from Ethereum" },
  { id: "commands", label: "Commands" },
  { id: "submitting", label: "Submitting your project" },
  { id: "judging", label: "Judging" },
  { id: "faq", label: "FAQ" },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="code">
      <code>{children.trim()}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="shell">
      <div className="page-head">
        <div>
          <p className="eyebrow">Docs</p>
          <h1>Build on BNB Smart Chain</h1>
          <p className="lede">
            Everything in this app, on one page: run it locally, deploy to BSC testnet, and the few places where BSC behaves differently
            from Ethereum.
          </p>
        </div>
        <a className="btn secondary" href={repoUrl} target="_blank" rel="noreferrer">
          <GitHubIcon />
          View the code on GitHub
        </a>
      </div>

      <div className="notice warn">
        <strong>Judging counts on-chain Agent ID activity.</strong>
        <span>
          Contracts, invoices and payments must happen on BNB Smart Chain, and only Agent ID holders can create or pay. Activity on
          another chain doesn&apos;t count.
        </span>
      </div>

      <div className="docs">
        <nav className="docs-toc" aria-label="On this page">
          <p className="docs-toc-title">On this page</p>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </nav>

        <article className="docs-body">
          <section id="challenge">
            <h2>Agent ID Hackathon</h2>
            <p>
              Build with Agent ID on BNB Chain. Agent ID is an identity for AI agents, issued as a non-transferable ERC-721 in the
              Binance Wallet. This app — <strong>Agent ID Invoices</strong> — is BNB-native invoicing where only Agent ID holders can
              create and pay invoices. A merchant creates an invoice for a fixed BNB amount, and any Agent ID holder pays it with one
              transaction; the BNB goes straight to the merchant.
            </p>
            <div className="table-wrap">
              <table className="data docs-table">
                <tbody>
                  <tr><th scope="row">Prize pool</th><td>$60,000 USDC: Pioneer $29,000 and Innovation $29,000 (1st $10,000 each), plus $2,000 in community prizes</td></tr>
                  <tr><th scope="row">Submission deadline</th><td>9 Dec 2026, 15:00 WIB (08:00 UTC). Late submissions aren&apos;t accepted.</td></tr>
                  <tr><th scope="row">Judging</th><td>10 to 20 Dec 2026</td></tr>
                  <tr><th scope="row">Prizes paid</th><td>Within 14 working days after 20 Dec 2026</td></tr>
                  <tr><th scope="row">Categories</th><td>Pioneer: on-chain data ranking of Agent ID holder interactions · Innovation: jury score (Agent ID depth 30%, practicality 25%, completeness 25%, innovation 20%)</td></tr>
                  <tr><th scope="row">Announcement</th><td><a href={hackathonAnnouncementUrl} target="_blank" rel="noreferrer">Binance announcement</a> — the official rules win over anything on this page</td></tr>
                </tbody>
              </table>
            </div>
            <h3>What this project is — and isn&apos;t</h3>
            <p>
              It is a payment tool for Agent ID holders: invoices in native BNB, gated by Agent ID on chain. It is not affiliated with or
              endorsed by Binance — it is an independent hackathon entry built on the public Agent ID contract. It promises no returns of
              any kind: there is no yield, no staking, and no token.
            </p>
          </section>

          <section id="quickstart">
            <h2>Quickstart</h2>
            <p>
              Five minutes, no funds needed. You need Node 22+ and Foundry (<code>foundryup</code>).
            </p>
            <Code>{`
git clone --recursive ${repoUrl}.git
cd agent-id-invoices
make check            # build contracts, unit tests, web typecheck
`}</Code>
            <p>Run the whole app against a local copy of BSC testnet, with the real Agent ID state:</p>
            <Code>{`
# terminal 1: local copy of BSC testnet on 127.0.0.1:8555 (chain 97097)
make fork

# terminal 2: deploy AgentIDInvoice (mock Agent ID + one mock ID for the deployer)
make deploy-fork            # prints the Invoice address

cp web/.env.example web/.env.local
#   NEXT_PUBLIC_NETWORKS=fork,bsc-testnet
#   NEXT_PUBLIC_INVOICE_FORK=<address from deploy-fork>
make dev
`}</Code>
            <p>
              Use the <strong>Local fork / BSC testnet</strong> switcher in the header. The first time you pick the fork, your wallet offers to
              add &quot;BSC testnet fork (local)&quot; as a new network. After that, switching is one click, and your real testnet network stays
              untouched.
            </p>
            <div className="card info">
              <h3>Why the fork has its own chain ID (97097)</h3>
              <p className="sub">
                It copies BSC testnet&apos;s state (accounts, balances), but anything you sign there can&apos;t be replayed on the real
                testnet, and wallets never mix the two up.
              </p>
            </div>
            <p>
              Want an empty chain instead? <code>make anvil</code> + <code>make deploy-local</code> deploys a <code>MockAgentID</code> that
              mints a mock Agent ID to the deployer.
            </p>
          </section>

          <section id="network">
            <h2>Network details</h2>
            <div className="table-wrap">
              <table className="data docs-table">
                <tbody>
                  <tr><th scope="row">Network</th><td>BNB Smart Chain testnet</td></tr>
                  <tr><th scope="row">Chain ID</th><td><code>97</code> (mainnet <code>56</code>, fork <code>97097</code>, local anvil <code>31337</code>)</td></tr>
                  <tr><th scope="row">RPC</th><td><code>https://data-seed-prebsc-1-s1.binance.org:8545</code> (HTTPS only, no WebSocket)</td></tr>
                  <tr><th scope="row">Explorer</th><td><a href="https://testnet.bscscan.com" target="_blank" rel="noreferrer">testnet.bscscan.com</a> (mainnet: bscscan.com)</td></tr>
                  <tr><th scope="row">Gas token</th><td>BNB (18 decimals). Testnet BNB comes from the faucet — see below.</td></tr>
                  <tr><th scope="row">Agent ID</th><td><code className="wrap">{AGENT_ID_ADDRESS}</code><br />SPACE ID Agent ID, ERC-721, non-transferable. On testnet and local chains the deploy script uses a mock instead — the real contract is only on mainnet.</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              All of this is defined inline in <code>web/src/lib/env.ts</code> (chains via viem&apos;s <code>defineChain</code>). There is no
              shared kit package: <code>web/</code> is self-contained.
            </p>
          </section>

          <section id="tokens">
            <h2>Get test BNB</h2>
            <ul>
              <li>
                <strong>BSC testnet faucet:</strong>{" "}
                <a href="https://testnet.bnbchain.org/faucet-smart" target="_blank" rel="noreferrer">testnet.bnbchain.org/faucet-smart</a>.
                Paste your wallet address and claim test BNB. Check the page for its rules and limits.
              </li>
              <li>
                <strong>Local fork:</strong> <code>make deal TO=&lt;address&gt;</code> for test balances. Nothing leaves your machine.
              </li>
            </ul>
            <p>A little testnet BNB is plenty: deploying <code>AgentIDInvoice</code> and paying invoices costs a fraction of a BNB in gas.</p>
            <h3>Get an Agent ID</h3>
            <p>
              Agent ID is claimed in the Binance App: open your Wallet and follow the Agent ID banner. It is free, one per wallet, and
              non-transferable. Without one, this app shows the gate message and the contract reverts with{" "}
              <code>NotAgentIdHolder</code> — the app never asks for a seed phrase, a private key, or a pairing code.
            </p>
          </section>

          <section id="deploy">
            <h2>Deploy to BSC</h2>
            <p>Keep your deployer key out of files and shell history. Foundry&apos;s encrypted keystore asks for the key once and a password each time:</p>
            <Code>{`
cast wallet import bsc-deployer --interactive   # paste the key of a TEST wallet
cast wallet address --account bsc-deployer      # fund this address from the faucet

make deploy-testnet ACCOUNT=bsc-deployer
`}</Code>
            <p>
              Then set <code>NEXT_PUBLIC_INVOICE_BSC_TESTNET</code> in <code>web/.env.local</code> and add <code>bsc-testnet</code> to{" "}
              <code>NEXT_PUBLIC_NETWORKS</code>. Mainnet deploy (<code>make deploy-mainnet</code>) uses real BNB and the real Agent ID
              contract — only when the deploy is funded and approved.
            </p>
            <div className="notice bad">
              <strong>Use a wallet made only for testing.</strong>
              <span>Never paste a private key into chat, an issue, or a committed file.</span>
            </div>
            <p>
              <strong>Putting the app online:</strong> set <code>NEXT_PUBLIC_NETWORKS=bsc-testnet</code> only. With <code>fork</code> or{" "}
              <code>local</code> listed, visitors get a &quot;Local fork&quot; option that points at their own 127.0.0.1.
            </p>
          </section>

          <section id="invoices">
            <h2>How invoices work</h2>
            <p>
              <code>AgentIDInvoice</code> is BNB-native and multi-merchant. Any Agent ID holder creates an invoice with{" "}
              <code>createInvoice(invoiceId, payer, amount, dueAt, memo)</code>: a fixed amount in BNB (wei), an optional due date, and an
              optional payer (the zero address means any Agent ID holder may pay). The caller becomes the invoice&apos;s merchant. The buyer
              then pays the exact amount with <code>pay(invoiceId)</code> and <code>msg.value</code> equal to the invoiced amount. The BNB
              goes straight to the merchant, and the <code>InvoicePaid(invoiceId, payer, amount)</code> event is the receipt.
            </p>
            <div className="grid-2">
              <div className="card">
                <h3>Create</h3>
                <p className="sub">One transaction. The creator pays gas.</p>
                <Code>{`
merchant → createInvoice(id, payer, amount, dueAt, memo)
           → InvoiceCreated event
`}</Code>
              </div>
              <div className="card">
                <h3>Pay</h3>
                <p className="sub">One transaction. The buyer pays gas + the amount.</p>
                <Code>{`
buyer → pay(invoiceId) {value: amount} → Invoice
        Invoice → BNB → merchant
        InvoicePaid event
`}</Code>
              </div>
            </div>
            <p>Design choices worth keeping:</p>
            <ul>
              <li>
                <strong>The amount lives on chain, in the invoice.</strong> There is no price table in the app and nothing for a payer to
                over- or underpay: <code>pay</code> reverts with <code>WrongAmount</code> unless <code>msg.value</code> equals the invoiced
                amount exactly.
              </li>
              <li>
                <strong>Agent ID gating is on chain, not just in the UI.</strong> Both <code>createInvoice</code> and <code>pay</code>{" "}
                revert with <code>NotAgentIdHolder</code> for wallets without an Agent ID. The UI reads{" "}
                <code>isAgentIdHolder(address)</code> to show the gate before a wallet tries.
              </li>
              <li>
                Invoices expire at their due date and the merchant can cancel unpaid ones with <code>cancelInvoice</code>.
              </li>
              <li>
                No <code>receive()</code> or <code>fallback()</code>: BNB sent straight to the contract by mistake reverts, so funds can
                never get stuck there. Invoice payments never sit in the contract.
              </li>
            </ul>
            <div className="notice warn">
              <strong>Anyone holding an Agent ID can pay an open invoice with no designated payer — by design.</strong>
              <span>
                An invoice with no designated payer is payable by any Agent ID holder, so share its pay link only with the intended payer,
                or set the payer when you create it. Invoice ids are random 32 bytes, so nobody can guess and claim one in advance.
              </span>
            </div>
            <p>Code to read, in order:</p>
            <ol>
              <li><code>contracts/src/AgentIDInvoice.sol</code></li>
              <li><code>contracts/test/AgentIDInvoice.t.sol</code>: every rule above as a test</li>
              <li><code>contracts/test/fork/</code>: the same flows against the real Agent ID on a local fork</li>
              <li><code>web/src/app/checkout/page.tsx</code>: the single-transaction BNB payment in the UI</li>
              <li><code>web/src/components/useAgentId.ts</code>: the Agent ID gate</li>
            </ol>
          </section>

          <section id="differences">
            <h2>Differences from Ethereum</h2>
            <div className="table-wrap">
              <table className="data docs-table wide">
                <thead>
                  <tr><th>Topic</th><th>What happens</th><th>What to do</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Log range limit</strong></td>
                    <td><code>eth_getLogs</code> over a wide block range fails on BSC.</td>
                    <td>Use <code>getLogsChunked</code> from <code>web/src/lib/logs.ts</code> (2,000 blocks at a time), starting from your deploy block.</td>
                  </tr>
                  <tr>
                    <td><strong>No WebSocket RPC</strong></td>
                    <td><code>watchContractEvent</code> over WS won&apos;t connect.</td>
                    <td>Poll over HTTPS (viem&apos;s default for <code>http()</code>).</td>
                  </tr>
                  <tr>
                    <td><strong>BNB, not ETH</strong></td>
                    <td>Gas and invoice amounts are BNB (18 decimals).</td>
                    <td>Amounts in the UI are BNB; the contract stores wei. <code>formatEther</code> / <code>parseEther</code>.</td>
                  </tr>
                  <tr>
                    <td><strong>Agent ID is mainnet-only</strong></td>
                    <td>The real Agent ID contract is not deployed on BSC testnet.</td>
                    <td>On testnet and local chains the deploy script deploys a <code>MockAgentID</code>. Never point mainnet at the mock.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="commands">
            <h2>Commands</h2>
            <Code>{`
make build          Compile contracts
make test           Unit tests (local, no network)
make test-fork      Tests against the real Agent ID on a local fork of BSC testnet
make check          Everything CI runs (contracts + web typecheck)
make anvil          Empty local chain (31337)
make fork           Local copy of BSC testnet on 127.0.0.1:8555 (chain 97097)
make deploy-local   Deploy AgentIDInvoice (mock Agent ID) to \`make anvil\`
make deploy-fork    Deploy AgentIDInvoice (mock Agent ID) to \`make fork\`
make deploy-testnet Deploy AgentIDInvoice to BSC testnet (ACCOUNT=<keystore>)
make deploy-mainnet Deploy AgentIDInvoice to BSC mainnet (ACCOUNT=<keystore>, real BNB)
make dev            Start the web app
`}</Code>
            <p>
              Web only (from <code>web/</code>): <code>npm run typecheck</code>, <code>npm run build</code>, <code>npm start</code>.{" "}
              <code>npm run dev</code> may fail on this VM (Google Fonts via Turbopack doesn&apos;t resolve); verify with{" "}
              <code>next build</code> + <code>next start</code> instead.
            </p>
          </section>

          <section id="submitting">
            <h2>Submitting your project</h2>
            <p>What the hackathon asks for:</p>
            <ul>
              <li><strong>Open-source code:</strong> a public GitHub repository with clean, readable code.</li>
              <li><strong>Deployed and verified contracts:</strong> on BNB Chain, with source verified on BscScan.</li>
              <li><strong>Live product:</strong> a working demo. Innovation entries need a live product with at least 30 Agent ID addresses interacting during the submission period.</li>
              <li><strong>Documentation:</strong> the problem you solve, your architecture, the core workflows, and the technologies you used.</li>
              <li><strong>Demo video:</strong> required for Innovation submissions.</li>
            </ul>
            <p>Make it easy for judges to check your on-chain activity:</p>
            <ul>
              <li>Contract addresses on BSC testnet (<code>97</code>) and mainnet (<code>56</code>), with BscScan links.</li>
              <li>A link to the exact commit you deployed.</li>
              <li>A few transaction hashes that show your app working. The receipt and activity pages show them.</li>
            </ul>
            <h3>Before you submit</h3>
            <ul className="checklist">
              <li>Submitted before the deadline. Submit early; the portal gets slow at the end.</li>
              <li>The repo is public and opens in a logged-out browser.</li>
              <li>No private keys, <code>.env</code> files or API keys in the repo or its commit history.</li>
              <li>A stranger can run the project from your README.</li>
              <li>Contracts and payments are on BNB Chain, not another network.</li>
              <li>The demo link works without logging in.</li>
              <li>Every team member is listed and registered.</li>
              <li>The repo has an open-source license, and every template or snippet you reused is credited.</li>
            </ul>
            <h3 id="licenses">Licenses and credit</h3>
            <p>
              This app is adapted from Aevum Invoices (MIT, PQA Labs), itself forked from the Aevum Starter Kit. The adaptation — BNB-native
              payments, Agent ID gating, multi-merchant invoices — is MIT licensed.
            </p>
            <ul>
              <li>Put a permissive open-source license on your repo, usually MIT or Apache 2.0.</li>
              <li>Keep the original copyright and license headers in any file you copy from another project.</li>
              <li>Put a short comment above any code snippet you borrow, naming the source repo, author and license.</li>
            </ul>
          </section>

          <section id="judging">
            <h2>Judging</h2>
            <p>Two categories, $29,000 each. The announcement has the current list and weights.</p>
            <div className="table-wrap">
              <table className="data docs-table wide">
                <thead>
                  <tr><th>Category</th><th>What it means</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Pioneer</strong></td><td>Ranked by on-chain data: distinct Agent ID holders interacting with the contract during the submission period. Every create and pay is an interaction.</td></tr>
                  <tr><td><strong>Innovation</strong></td><td>Jury score: Agent ID depth 30%, practicality 25%, completeness 25%, innovation 20%. Needs a live product and at least 30 Agent ID addresses interacting.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="faq">
            <h2>FAQ</h2>
            <dl className="faq">
              <dt>Do I need an Agent ID to use this app?</dt>
              <dd>Yes — to create or pay. Reading invoices, receipts and activity works without one. Claim an Agent ID free in the Binance App (Wallet &gt; Agent ID banner).</dd>
              <dt>Can I pay with a token instead of BNB?</dt>
              <dd>No. Invoices here are BNB-native by design: one transaction, exact amount, straight to the merchant.</dd>
              <dt>Can anyone pay my invoice?</dt>
              <dd>Any Agent ID holder can pay an invoice with no designated payer. Set the payer address when you create it to restrict payment to one wallet.</dd>
              <dt>eth_getLogs errors on a big range.</dt>
              <dd>Split it into 2,000-block chunks with <code>getLogsChunked</code>.</dd>
              <dt>Can I deploy to another testnet?</dt>
              <dd>Not for the hackathon. Contracts and payments must be on BNB Chain, and the real Agent ID only exists on BSC mainnet.</dd>
              <dt>Does this app promise any returns?</dt>
              <dd>No. There is no yield, staking, or token here — it is a payment tool, nothing more.</dd>
              <dt>Where do I ask for help?</dt>
              <dd>
                See the <a href={hackathonAnnouncementUrl} target="_blank" rel="noreferrer">official announcement</a> for the hackathon&apos;s
                channels.
              </dd>
            </dl>
          </section>

          <p className="fine">
            Source and full README: <a href={repoUrl} target="_blank" rel="noreferrer">{repoUrl.replace("https://", "")}</a>. MIT licensed.
            Adapted from Aevum Invoices (MIT, PQA Labs). Not affiliated with or endorsed by Binance.
          </p>
        </article>
      </div>
    </main>
  );
}
