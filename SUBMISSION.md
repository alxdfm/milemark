# HackQuest submission checklist — MileMark

Arbitrum Open House Singapore **Online** Buildathon. Dates below are the published window as of the project brief — confirm on HackQuest before you file.

## Deadlines

- [ ] Register the team / project on HackQuest by **~2 Oct**
- [ ] Final submission by **~4 Oct** (repo, demo, write-up)

## What judges should find in this repo

- [ ] `contracts/` Foundry project with `MilestoneEscrow.sol`, unit tests, `Deploy.s.sol`
- [ ] `web/` Next.js App Router app: home, create, campaign-by-id
- [ ] `forge test` passes
- [ ] `cd web && npm install && npm run typecheck` passes
- [ ] README explains problem, flow, local Anvil demo, Sepolia deploy
- [ ] No real mainnet keys, `.env` files, or funded private keys in git

## Onchain (Arbitrum Sepolia)

- [ ] Deploy `MilestoneEscrow` with Circle testnet USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- [ ] Verify the contract on Arbiscan (or upload flattened source)
- [ ] Paste address + tx into README **Deployed address** table (currently TODO)
- [ ] Point `web/.env.local` `NEXT_PUBLIC_ESCROW_ADDRESS` at that address
- [ ] Create at least one real campaign on Sepolia so `/campaign/0` is not empty

## Demo video (≤ 3 minutes suggested)

- [ ] Screen recording: connect wallet (Sepolia) → create campaign → attestor completes (show any-order) → beneficiary claims → failed double-claim
- [ ] Show Arbiscan tx links in the recording or the description
- [ ] Upload (YouTube unlisted / Drive) and paste URL into README **Demo video** TODO

## Submission coherence

- [ ] Same Git remote as the HackQuest “project repo” field
- [ ] README title **MileMark**, chain **Arbitrum Sepolia**, track matching the form
- [ ] English UI is acceptable; no extra product surface beyond MVP
- [ ] Do **not** add Stylus, mainnet config as primary, or an indexer before submit

## Links to paste on HackQuest

| Field | Value |
|---|---|
| Repo | _this repository_ |
| Live app | TODO |
| Contract | TODO |
| Video | TODO |
| Arbiscan | TODO |
