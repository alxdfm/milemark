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

- [x] Deploy `MilestoneEscrow` with Circle testnet USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- [ ] Verify the contract on Arbiscan (or upload flattened source)
- [x] Paste address + tx into README **Deployed address** table
- [x] Point `web/.env.example` `NEXT_PUBLIC_ESCROW_ADDRESS` at that address (`web/.env.local` for local runs)
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
| Repo | https://cursor.com/codebase/callydus/tmp-0f72549bdb4a9c0f |
| Live app | TODO |
| Contract | `0x72b474DB34268281CD10db655cc1517C33973049` |
| Video | TODO |
| Arbiscan | https://sepolia.arbiscan.io/address/0x72b474DB34268281CD10db655cc1517C33973049 |
| Deploy tx | https://sepolia.arbiscan.io/tx/0xd1ecf3062cf3ab3bf34cbaf7429ceb214a7c75416d3289709864c950cf548057 |
| Deployer | `0x3A17eD984f20C50C6927addDAEf633fff40f84D4` |
