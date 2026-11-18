# Agent ID Invoices. Run `make help` for the list.
SHELL := /bin/bash
.DEFAULT_GOAL := help

BSC_RPC       ?= https://data-seed-prebsc-1-s1.binance.org:8545
BSC_MAINNET   ?= https://bsc-dataseed1.binance.org
LOCAL_RPC     ?= http://127.0.0.1:8545
FORK_PORT     ?= 8555
FORK_RPC      ?= http://127.0.0.1:$(FORK_PORT)
# `make fork` runs under its own chain ID so wallets and signatures never mix it up with the real testnet.
FORK_CHAIN    := 97097
# anvil's first default account (public test account, local chains only).
ANVIL_0       := 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

.PHONY: help build test test-fork check anvil fork deploy-local deploy-fork deploy-testnet deploy-mainnet dev

help: ## Show this list
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[36mmake %-14s\033[0m %s\n", $$1, $$2}'

build: ## Compile contracts
	cd contracts && forge build

test: ## Unit tests (local, no network)
	cd contracts && forge test --no-match-path 'test/fork/*' -vv

test-fork: ## Tests against the real Agent ID on a local fork of BSC testnet (no funds needed)
	cd contracts && forge test --match-path 'test/fork/*' --fork-url $(BSC_RPC) -vv

check: build test ## Everything CI runs
	cd web && npm run typecheck

anvil: ## Empty local chain (31337)
	anvil --hardfork shanghai

fork: ## Local copy of BSC testnet on 127.0.0.1:8555 (chain 97097)
	anvil --fork-url $(BSC_RPC) --hardfork shanghai --chain-id $(FORK_CHAIN) --port $(FORK_PORT)

deploy-local: ## Deploy AgentIDInvoice (mock Agent ID) to `make anvil`
	cd contracts && forge script script/DeployInvoice.s.sol --rpc-url $(LOCAL_RPC) --broadcast --unlocked --sender $(ANVIL_0)

deploy-fork: ## Deploy AgentIDInvoice (mock Agent ID) to `make fork`
	@test "$$(cast chain-id --rpc-url $(FORK_RPC))" = "$(FORK_CHAIN)" || (echo "This only works on 'make fork'." && exit 1)
	cd contracts && forge script script/DeployInvoice.s.sol --rpc-url $(FORK_RPC) --broadcast --unlocked --sender $(ANVIL_0)

deploy-testnet: ## Deploy to BSC testnet (97). Needs ACCOUNT=<keystore name>
	@test -n "$(ACCOUNT)" || (echo "Set ACCOUNT=<name>. Create one with: cast wallet import <name> --interactive" && exit 1)
	cd contracts && forge script script/DeployInvoice.s.sol --rpc-url $(BSC_RPC) --broadcast --account $(ACCOUNT)

deploy-mainnet: ## Deploy to BSC mainnet (56). REAL BNB. Only on Bayu's funding decision.
	@test -n "$(ACCOUNT)" || (echo "Set ACCOUNT=<name>. Create one with: cast wallet import <name> --interactive" && exit 1)
	cd contracts && forge script script/DeployInvoice.s.sol --rpc-url $(BSC_MAINNET) --broadcast --account $(ACCOUNT)

dev: ## Start the web app on http://localhost:3000
	cd web && npm run dev
