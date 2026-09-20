# MileMark — contract and frontend workflows.
#
# Requires: Foundry (forge/cast/anvil), Node 20+, Python 3. See docs/DEPLOY.md.
# Contract deploys read contracts/.env, which Foundry auto-loads (copy from
# contracts/.env.example). Never commit that file.
#
# Sepolia targets broadcast real transactions and create a NEW escrow address.
# They ask for confirmation first — see the "Live v3" note in docs/DEPLOY.md.

SHELL := /bin/bash
CONTRACTS := contracts
WEB := web

ANVIL_RPC ?= http://127.0.0.1:8545
SEPOLIA_RPC ?= https://sepolia-rollup.arbitrum.io/rpc
# Anvil account 0 — a PUBLIC test key. Never used by the sepolia-* targets.
ANVIL_KEY ?= 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
LIVE_ESCROW ?= 0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC

.DEFAULT_GOAL := help

# Guard for anything that spends real testnet gas.
define confirm
	@read -r -p "$(1) [type DEPLOY to continue]: " ans; \
	[ "$$ans" = "DEPLOY" ] || { echo "aborted"; exit 1; }
endef

.PHONY: help
help: ## Show this help
	@echo "MileMark targets:"
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Contracts -------------------------------------------------------------

.PHONY: build
build: ## Compile contracts
	cd $(CONTRACTS) && forge build

.PHONY: test
test: ## Run the Foundry test suite
	cd $(CONTRACTS) && forge test

.PHONY: fmt
fmt: ## Format Solidity sources
	cd $(CONTRACTS) && forge fmt

.PHONY: fmt-check
fmt-check: ## Fail if Solidity is unformatted
	cd $(CONTRACTS) && forge fmt --check

.PHONY: anvil
anvil: ## Start a local Anvil node (blocking)
	anvil

.PHONY: deploy-local
deploy-local: ## Deploy escrow + MockERC20 to Anvil
	cd $(CONTRACTS) && DEPLOY_MOCK_USDC=true PRIVATE_KEY=$(ANVIL_KEY) \
		forge script script/Deploy.s.sol --rpc-url $(ANVIL_RPC) --broadcast

.PHONY: demo-local
demo-local: ## Create the 1-of-1 smoke campaign on Anvil (ESCROW_ADDRESS=0x...)
	@[ -n "$(ESCROW_ADDRESS)" ] || { echo "ESCROW_ADDRESS=0x... is required"; exit 1; }
	cd $(CONTRACTS) && ESCROW_ADDRESS=$(ESCROW_ADDRESS) PRIVATE_KEY=$(ANVIL_KEY) \
		forge script script/CreateDemo.s.sol --rpc-url $(ANVIL_RPC) --broadcast

.PHONY: deploy-sepolia
deploy-sepolia: ## Deploy a NEW escrow to Arbitrum Sepolia (asks to confirm)
	$(call confirm,This creates a new escrow address and orphans the current frontend env)
	cd $(CONTRACTS) && forge script script/Deploy.s.sol \
		--rpc-url $(SEPOLIA_RPC) --broadcast --verify

.PHONY: demo-sepolia
demo-sepolia: ## Create the 1-of-1 smoke campaign on Sepolia (asks to confirm)
	@[ -n "$(ESCROW_ADDRESS)" ] || { echo "ESCROW_ADDRESS=0x... is required"; exit 1; }
	$(call confirm,This spends testnet USDC on $(ESCROW_ADDRESS))
	cd $(CONTRACTS) && ESCROW_ADDRESS=$(ESCROW_ADDRESS) \
		forge script script/CreateDemo.s.sol --rpc-url $(SEPOLIA_RPC) --broadcast

.PHONY: featured-sepolia
featured-sepolia: ## Create the featured 2-of-3 campaign on Sepolia (needs ATTESTOR_2/3)
	@[ -n "$(ESCROW_ADDRESS)" ] || { echo "ESCROW_ADDRESS=0x... is required"; exit 1; }
	$(call confirm,This spends testnet USDC on $(ESCROW_ADDRESS))
	cd $(CONTRACTS) && ESCROW_ADDRESS=$(ESCROW_ADDRESS) \
		forge script script/CreateFeaturedDemo.s.sol --rpc-url $(SEPOLIA_RPC) --broadcast

.PHONY: abi
abi: build ## Regenerate web/lib/contracts/abi.ts from the build artifacts
	python3 scripts/export-abi.py

.PHONY: check-live
check-live: ## Read the live v3 escrow state from Sepolia
	@echo "escrow        $(LIVE_ESCROW)"
	@echo "usdc()        $$(cast call $(LIVE_ESCROW) 'usdc()(address)' --rpc-url $(SEPOLIA_RPC))"
	@echo "campaignCount $$(cast call $(LIVE_ESCROW) 'campaignCount()(uint256)' --rpc-url $(SEPOLIA_RPC))"

# --- Frontend --------------------------------------------------------------

.PHONY: web-install
web-install: ## Install frontend dependencies
	cd $(WEB) && npm ci

.PHONY: web-dev
web-dev: ## Start the Next dev server on :43147
	cd $(WEB) && npm run dev

.PHONY: web-build
web-build: ## Production build of the frontend
	cd $(WEB) && npm run build

.PHONY: web-typecheck
web-typecheck: ## Typecheck the frontend
	cd $(WEB) && npm run typecheck

.PHONY: web-lint
web-lint: ## Lint the frontend (4 pre-existing react-hooks errors, not a release gate)
	cd $(WEB) && npm run lint

.PHONY: web-check
web-check: web-typecheck web-lint ## Typecheck and lint the frontend

# --- Release ---------------------------------------------------------------

# Mirrors the gates in docs/DEPLOY.md, which do not include lint.
.PHONY: gates
gates: test web-typecheck web-build ## Run every quality gate from docs/DEPLOY.md

.PHONY: release
release: ## Tag and publish a release, which triggers the Vercel deploy (VERSION=v1.2.3)
	@[ -n "$(VERSION)" ] || { echo "VERSION=v1.2.3 is required"; exit 1; }
	@git diff --quiet || { echo "working tree is dirty"; exit 1; }
	gh release create $(VERSION) --generate-notes
