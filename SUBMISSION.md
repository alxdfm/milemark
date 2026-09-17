# HackQuest submission checklist — MileMark

Arbitrum Open House Singapore **Online** Buildathon. Dates below are the published window as of the project brief — confirm on HackQuest before you file.

MileMark **v2** (metadata, 1-of-n attestors, deadline reclaim, evidence). The v1 Sepolia address `0x72b474DB34268281CD10db655cc1517C33973049` is **obsolete** after the ABI break.

## Deadlines

- [ ] Register the team / project on HackQuest by **~2 Oct**
- [ ] Final submission by **~4 Oct** (repo, demo, write-up)

## What judges should find in this repo

- [ ] `contracts/` Foundry project with `MilestoneEscrow.sol`, unit tests, `Deploy.s.sol`
- [ ] `web/` Next.js App Router app: home, create (templates), campaign-by-id (roles, timeline, reclaim)
- [ ] `forge test` passes
- [ ] `cd web && npm install && npm run typecheck` passes
- [ ] README explains v2 flow, local Anvil demo, Sepolia deploy, ABI break
- [ ] No real mainnet keys, `.env` files, or funded private keys in git

## Onchain (Arbitrum Sepolia)

- [ ] Deploy **v2** `MilestoneEscrow` with Circle testnet USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- [ ] Verify the contract on Arbiscan (or upload flattened source)
- [ ] Paste the **new** address + tx into README **Deployed address** table (currently TODO)
- [ ] Point `web/.env.example` `NEXT_PUBLIC_ESCROW_ADDRESS` at the v2 address
- [ ] Create at least one real v2 campaign on Sepolia so `/campaign/0` is not empty
- [ ] Do not wire the UI to obsolete v1 `0x72b474DB34268281CD10db655cc1517C33973049`

## Demo video (≤ 3 minutes suggested)

- [ ] Screen recording: connect wallet (Sepolia) → create from a template → attestor completes any-order with evidence → beneficiary claims → warp/wait deadline → sponsor reclaims remaining
- [ ] Show Arbiscan tx links in the recording or the description
- [ ] Upload (YouTube unlisted / Drive) and paste URL into README **Demo video** TODO

## Submission coherence

- [ ] Same Git remote as the HackQuest “project repo” field
- [ ] README title **MileMark**, chain **Arbitrum Sepolia**, track matching the form
- [ ] English UI is acceptable; no extra product surface beyond v2 MVP
- [ ] Do **not** add Stylus, Permit2, a subgraph, or mainnet as primary before submit

## Links to paste on HackQuest

| Field | Value |
|---|---|
| Repo | https://cursor.com/codebase/callydus/tmp-0f72549bdb4a9c0f |
| Live app | TODO |
| Contract (v2) | **TODO — redeploy required** |
| Video | TODO |
| Arbiscan | TODO |
| Obsolete v1 | `0x72b474DB34268281CD10db655cc1517C33973049` (do not use) |
