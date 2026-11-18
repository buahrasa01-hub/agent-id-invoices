# Agent ID Invoices

BNB-native invoicing where **only Agent ID holders can create and pay**.
Built for the [Agent ID Hackathon](https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf)
(Binance Wallet × BNB Chain, 60,000 USDC prize pool, submission deadline
9 December 2026 08:00 UTC).

## What it is

Any AI agent holding an [Agent ID](https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf)
(a `name.ai` name on the Binance Agentic Wallet, an ERC-721 that cannot be
transferred) can invoice any other Agent ID holder — and get paid in BNB:

1. **Create** — an Agent ID holder creates an invoice (amount in BNB, optional
   designated payer, optional due date, memo). The creator becomes that
   invoice's merchant.
2. **Pay** — an Agent ID holder pays the invoice with one transaction carrying
   the exact invoiced amount as `msg.value`. The BNB goes straight to the
   merchant. No token, no approval, no relayer.
3. **Receipt** — `InvoicePaid` is the receipt; `InvoiceCreated` /
   `InvoicePaid` / `InvoiceCancelled` events are the on-chain record, and the
   Pioneer ranking counts distinct Agent ID holders interacting with this
   contract.

The merchant can cancel an unpaid invoice before its due date. Invoices
expire after `dueAt` (0 = no expiry).

## Why Agent ID is the core, not a checkbox

- **Access control is the product.** `createInvoice` and `pay` both revert
  unless the caller holds an Agent ID (`balanceOf > 0` on the Agent ID
  contract). Identity — not a password, not an allowlist — decides who can
  invoice and who can pay. That is the use case the hackathon announcement
  names first: *access control, payments, and identity*.
- **Every interaction is an Agent ID interaction.** There is no way to use
  the contract without holding an Agent ID, so the on-chain metrics (distinct
  interacting holders, transaction count, volume) measure real Agent ID usage.
- **No faking.** There is no admin mint, no backdoor, no way to mark an
  invoice paid without the exact BNB arriving. Interactions must be organic:
  agents invoicing each other for real work.

## Contracts

| Network | Invoice | Agent ID | Block |
|---|---|---|---|
| BSC testnet (97) | [`0x8FF9AecB2e03Ccc72a35D686CfA723D6f449dEc1`](https://testnet.bscscan.com/address/0x8FF9AecB2e03Ccc72a35D686CfA723D6f449dEc1) | [`0x7B6943335e7507A00c7C2903ace22e2E7f49B19F`](https://testnet.bscscan.com/address/0x7B6943335e7507A00c7C2903ace22e2E7f49B19F) (MockAgentID, testnet only) | 143463937 |
| BSC mainnet (56) | *pending funding decision* | [`0x60B9262456dE011F7d15a54cdd8c48baaa8b022f`](https://bscscan.com/address/0x60B9262456dE011F7d15a54cdd8c48baaa8b022f) (SPACE ID Agent ID) | — |

- `contracts/src/AgentIDInvoice.sol` — the invoice contract.
- `contracts/src/mocks/MockAgentID.sol` — test-only ERC-721 stand-in for the
  real Agent ID, used on local chains and BSC testnet where the real Agent ID
  is not deployed. **Never on mainnet**: the deploy script refuses to use the
  mock on chain 56 and refuses the real Agent ID anywhere else.
- `contracts/test/AgentIDInvoice.t.sol` — 22 unit tests (incl. fuzz), all passing.

### Deployed on BSC testnet (18 Nov 2026) — live

- Invoice [`0x8FF9AecB2e03Ccc72a35D686CfA723D6f449dEc1`](https://testnet.bscscan.com/address/0x8FF9AecB2e03Ccc72a35D686CfA723D6f449dEc1),
  deploy tx [`0xfe07308b…`](https://testnet.bscscan.com/tx/0xfe07308b9c17499d327df3a0ffc7a6df304c2725cad1df0f16fa3f27c7abb3bb),
  block 143463937, status success.
- MockAgentID [`0x7B6943335e7507A00c7C2903ace22e2E7f49B19F`](https://testnet.bscscan.com/address/0x7B6943335e7507A00c7C2903ace22e2E7f49B19F),
  deploy tx [`0xb9c5fbef…`](https://testnet.bscscan.com/tx/0xb9c5fbef74a9cc3219fd681fac67a892fff1ee1a729adbc4d351f6e25e7f032e).
  Source verified on Sourcify: **exact match** (creation + runtime).
- E2E on the real testnet (18 Nov): create invoice 0.01 BNB — success
  ([`0xf984ddc6…`](https://testnet.bscscan.com/tx/0xf984ddc6a01daff22c45d951a5f6ee8919023606bd085a23f507eb5c163781a5),
  block 143464186); pay 0.009 BNB — reverted `WrongAmount(0.01, 0.009)`;
  pay exact 0.01 BNB — success
  ([`0x8b581218…`](https://testnet.bscscan.com/tx/0x8b581218c583d4845ed86a152b5236d0ccde3efe0a0abf2357a69a2572838ddf),
  block 143464246), `isPaid` true, contract balance 0.
- Web app live: https://agent-id-invoices.vercel.app/
  (Vercel project `prj_0jiqIbSCa7axnkeVGYiogepT6U8h`, deployment READY).

### Verified on a local fork of BSC testnet (18 Nov 2026)

- Deploy: MockAgentID 979,307 gas, AgentIDInvoice 909,835 gas.
- Create invoice 0.01 BNB: success, 149,068 gas. `isOpen` true.
- Pay with wrong amount (0.009 BNB): reverted `WrongAmount(0.01, 0.009)`.
- Pay exact 0.01 BNB: success, 95,465 gas, `isPaid` true, merchant received
  exactly 0.01 BNB, contract balance 0.

### Mainnet gas estimate (from the fork deploy)

Deploying `AgentIDInvoice` costs **909,835 gas**. At 3 gwei that is
≈ **0.0027 BNB**; at 5 gwei ≈ 0.0046 BNB. Creating and paying invoices is
paid by the merchant/buyer themselves, not the deployer. Funding ~0.01 BNB
covers the deploy plus a few test transactions with margin.

## Web app

Next.js app in `web/` (standalone, no workspace dependencies): create an
invoice, pay it, view receipts, browse activity. Live site:
**https://agent-id-invoices.vercel.app/** (BSC testnet contract above).

```bash
cd web && npm install && npm run build   # typecheck + build
```

## Develop

```bash
make build          # forge build
make test           # forge test (22 unit tests)
make anvil          # empty local chain (31337)
make fork           # local copy of BSC testnet on 127.0.0.1:8555 (chain 97097)
make deploy-fork    # deploy to the fork (mock Agent ID)
make deploy-testnet ACCOUNT=<keystore>   # BSC testnet (97)
make deploy-mainnet ACCOUNT=<keystore>   # BSC mainnet (56) — real BNB, only on funding decision
```

Deployer keystores are made with `cast wallet import <name> --interactive`
(the key never goes through argv or logs). Never commit a keystore, a
`.env*` file, or anything under `*-wallet.json`.

## Safety

- No admin functions, no pausing, no freezing, no withdrawing user funds:
  payments go straight from payer to merchant in the same transaction.
- No `receive()`/`fallback()`: BNB sent straight to the contract by mistake
  reverts, so funds can never get stuck here.
- The contract never asks for, stores, or transmits seed phrases, private
  keys, API secrets, or pairing codes. Wallets sign their own transactions
  and confirm them themselves.
- The project does not use the "Binance" or "BNB" name to impersonate the
  official brand, and it promises no returns of any kind.

## License

MIT. See [LICENSE](LICENSE).
