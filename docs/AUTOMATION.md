# Automation (Makefile + GitHub Actions)

Canonical reference for how MileMark builds, deploys and releases itself. The manual, step-by-step deploy guide is [`DEPLOY.md`](./DEPLOY.md) — nothing here replaces it, because every automated step runs the same commands documented there.

Verified against this repo on **2026-09-20** with Foundry `1.8.3`, Node 24 locally / Node 20 in CI, Python 3.12.

## The shape of it

```
push to main ─────────────────▶ nothing deploys
                                (web/vercel.json disables Vercel's git deploys)

publish a GitHub release ─────▶ .github/workflows/deploy-web.yml
                                typecheck → vercel build → deploy --prod → GET /demo == 200

click "Run workflow" manually ▶ .github/workflows/deploy-contracts.yml
                                forge test → broadcast → read back state → summary
```

Two deliberate asymmetries:

- **The frontend deploys on a release; the contract never does.** Each `Deploy.s.sol` broadcast creates a **new** escrow address, and the frontend keeps serving the old one until its `NEXT_PUBLIC_*` values are updated and rebuilt. Tying that to a release would mean publishing a release silently spends gas and splits the app from its contract.
- **Pushes to `main` deploy nothing.** `web/vercel.json` sets `git.deploymentEnabled.main = false`, so Vercel's own Git integration stays quiet and production moves only when you publish a release. Delete that `git` block to go back to deploy-on-push.

---

## First-time setup

The workflows are committed but inert until these exist. Nothing below is in the repo — secrets cannot be.

### 1. Repository secrets

Settings → Secrets and variables → Actions → **Secrets**.

| Secret | Used by | Where it comes from |
|---|---|---|
| `VERCEL_TOKEN` | deploy-web | https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | deploy-web | `.vercel/project.json` after `npx vercel link`, or Vercel → Team Settings |
| `VERCEL_PROJECT_ID` | deploy-web | same `.vercel/project.json` |
| `DEPLOY_PRIVATE_KEY` | deploy-contracts | A **testnet-only** key holding Arbitrum Sepolia ETH |
| `ARBISCAN_API_KEY` | deploy-contracts (optional) | https://arbiscan.io/myapikey — only needed for `--verify` |

To produce the two Vercel ids:

```bash
npx vercel link --yes --scope mile-mark --project milemark
cat .vercel/project.json     # { "orgId": "...", "projectId": "..." }
```

`.vercel/` is gitignored — it must never be committed.

### 2. Repository variables (optional)

Settings → Secrets and variables → Actions → **Variables**. Both have working defaults; set them only to override.

| Variable | Default if unset |
|---|---|
| `USDC_ADDRESS` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` (Circle testnet USDC) |
| `ARB_SEPOLIA_RPC_URL` | `https://sepolia-rollup.arbitrum.io/rpc` |

### 3. The `contracts-deploy` environment

`deploy-contracts.yml` declares `environment: contracts-deploy`. Create it under Settings → **Environments** and add yourself as a required reviewer. That turns every contract broadcast into an approval prompt — worth doing, since this is the only workflow that spends gas. Without the environment the job still runs; the approval gate is simply absent.

### 4. Vercel project

| Setting | Value | Why |
|---|---|---|
| Root Directory | `web` | The repo root has **no** `package.json`. Pointing Vercel at the root builds a stale or empty Next app and `/demo` returns 404 |
| Git repository | `alxdfm/milemark` | Was `callydus/milemark` on Cursor's origin until 2026-09-20 |
| Framework preset | Next.js | Also asserted by `web/vercel.json` |

Production env vars: the table in [`DEPLOY.md`](./DEPLOY.md#full-config-reference). The tracked `web/.env.production` plus the fallbacks in `web/lib/contracts/addresses.ts` already match live v3, so an unset dashboard still builds correctly.

---

## Publishing a release

```bash
make gates                      # forge test + typecheck + production build
make release VERSION=v1.2.3     # gh release create --generate-notes
```

`make release` refuses to run on a dirty tree. It needs the [`gh` CLI](https://cli.github.com/) authenticated; without it, create the release from the GitHub UI and the workflow fires the same way.

Watch the run under Actions → **Deploy web**. The run summary ends with the deployment URL, and the final step fails the run if `GET <url>/demo` is not `200`.

To redeploy the current `main` without cutting a release: Actions → Deploy web → **Run workflow**.

---

## `.github/workflows/deploy-web.yml`

| | |
|---|---|
| Triggers | `release: published`, `workflow_dispatch` |
| Concurrency | group `vercel-production`, queued not cancelled — two production deploys never race |
| Node | 20, npm cache keyed on `web/package-lock.json` |

Steps, in order:

1. `npm ci` in `web/`
2. **Typecheck** — `tsc --noEmit`. Blocking.
3. **Lint** — `continue-on-error: true`. See [Why lint does not block](#why-lint-does-not-block).
4. `vercel pull --environment=production` — fetches project settings and production env
5. `vercel build --prod`
6. `vercel deploy --prebuilt --prod` — captures the URL into the step output and the run summary
7. `curl $url/demo` — must be `200`

**The Vercel CLI runs from the repo root, not from `web/`.** The project's Root Directory is already `web`, so the CLI resolves `web/` itself; running it inside `web/` would look for `web/web/` and fail. This is the single most common way to break this workflow when editing it.

The `/demo` smoke check exists because a wrong Root Directory produces a *successful* build of the wrong thing — the deploy goes green and `/demo` 404s. Checking a route that only exists in the real app catches it.

### Why lint does not block

`npm run lint` currently reports **4 errors**, all pre-existing and all from rules introduced in `eslint-config-next` 16:

| File | Rule |
|---|---|
| `web/components/campaign/deadline-line.tsx` (2×) | `react-hooks/purity` — `Date.now()` during render |
| `web/components/create-campaign-form.tsx` | `react-hooks/set-state-in-effect` |
| `web/components/demo/demo-kit.tsx` | `react-hooks/set-state-in-effect` |

The quality gates in `DEPLOY.md` are `forge test` + `typecheck` + `build`; lint was never one of them. Making it blocking would fail every release for reasons unrelated to the release. It still runs, so the errors stay visible in each run, and the step goes red without stopping the deploy. Fix those four and flip `continue-on-error` to make it a real gate.

---

## `.github/workflows/deploy-contracts.yml`

**Manual only.** No push trigger, no release trigger, by design.

| Input | Meaning |
|---|---|
| `network` | Choice; `arbitrum-sepolia` is the only option today |
| `confirm` | Must be the literal string `DEPLOY`. Anything else fails the run before checkout |
| `verify` | Boolean, default true. Skipped anyway when `ARBISCAN_API_KEY` is unset |

Steps: confirmation guard → checkout → `foundry-rs/foundry-toolchain` → `forge test -vv` (all 44 must pass) → `forge script Deploy.s.sol --broadcast [--verify]` → read `usdc()` and `campaignCount()` back off-chain → run summary → upload `contracts/broadcast/Deploy.s.sol/421614/` as an artifact.

The address and deploy block come out of `run-latest.json` via `jq`, not from parsing log output.

### After a contract deploy, the frontend is stale

This is the part no workflow can do for you. The run summary prints the exact values; the work is:

1. `NEXT_PUBLIC_ESCROW_ADDRESS` → the new address, in `web/.env.production` **and** the Vercel dashboard
2. `NEXT_PUBLIC_ESCROW_FROM_BLOCK` → a few hundred blocks **before** the deploy block (the summary suggests `deployBlock - 200`). Too high and the activity timeline is empty; see [`DEPLOY.md`](./DEPLOY.md#how-to-pick-next_public_escrow_from_block)
3. `LIVE_ESCROW_V3` in `web/lib/contracts/addresses.ts` → the new address (this is the fallback when env is unset, and it sits next to the v1/v2 guards)
4. Seed a campaign — `make demo-sepolia ESCROW_ADDRESS=0x...` or `make featured-sepolia ESCROW_ADDRESS=0x...` — then set `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` to the printed id
5. If the Solidity ABI changed: `make abi`, and commit the regenerated `web/lib/contracts/abi.ts`
6. Publish a release so the frontend rebuilds — `NEXT_PUBLIC_*` are inlined at build time, so an env change without a rebuild changes nothing

---

## Makefile reference

`make help` prints this list from the target comments. Every target is a wrapper — the underlying commands are all in [`DEPLOY.md`](./DEPLOY.md).

### Contracts

| Target | Does |
|---|---|
| `make build` | `forge build` |
| `make test` | `forge test` — 44 `test_*` functions |
| `make fmt` / `make fmt-check` | `forge fmt`, and the CI-friendly check variant |
| `make anvil` | Starts a local node (blocking; use another terminal) |
| `make deploy-local` | Escrow + `MockERC20` on Anvil, using the **public** Anvil account 0 key |
| `make demo-local ESCROW_ADDRESS=0x...` | 1-of-1 smoke campaign on Anvil |
| `make deploy-sepolia` | **Spends gas.** New escrow on Arbitrum Sepolia; prompts for `DEPLOY` |
| `make demo-sepolia ESCROW_ADDRESS=0x...` | **Spends testnet USDC.** Prompts for `DEPLOY` |
| `make featured-sepolia ESCROW_ADDRESS=0x...` | **Spends testnet USDC.** Needs `ATTESTOR_2` and `ATTESTOR_3` |
| `make abi` | `forge build` then `scripts/export-abi.py` → rewrites `web/lib/contracts/abi.ts` |
| `make check-live` | Reads `usdc()` and `campaignCount()` off the live v3 escrow |

The `*-sepolia` targets read `contracts/.env` (Foundry auto-loads it). Copy it from `contracts/.env.example`; it is gitignored and must stay that way.

### Frontend

| Target | Does |
|---|---|
| `make web-install` | `npm ci` |
| `make web-dev` | Dev server on `http://localhost:43147` |
| `make web-build` | Production build |
| `make web-typecheck` | `tsc --noEmit` |
| `make web-lint` | ESLint — 4 known errors, not a gate |
| `make web-check` | typecheck + lint |

### Release

| Target | Does |
|---|---|
| `make gates` | `test` + `web-typecheck` + `web-build` — mirrors the gates in `DEPLOY.md` |
| `make release VERSION=v1.2.3` | Refuses a dirty tree, then `gh release create --generate-notes` |

### Overridable variables

| Variable | Default |
|---|---|
| `ANVIL_RPC` | `http://127.0.0.1:8545` |
| `SEPOLIA_RPC` | `https://sepolia-rollup.arbitrum.io/rpc` |
| `ANVIL_KEY` | Anvil account 0 — a **public** test key, never used by `*-sepolia` targets |
| `LIVE_ESCROW` | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` |

---

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Deploy web fails at `vercel pull` | Missing or expired `VERCEL_TOKEN`, or wrong org/project id | Re-issue the token; re-read `.vercel/project.json` |
| Deploy succeeds, `/demo` returns 404, smoke step fails | Vercel Root Directory is not `web` | Fix it in project settings and re-run the workflow |
| `vercel build` cannot find `package.json` | Someone changed the CLI steps to run inside `web/` | Run them from the repo root |
| Production still shows the old contract after a deploy | `NEXT_PUBLIC_*` are inlined at build time | Update env, then publish a release to rebuild |
| Activity timeline empty on a fresh escrow | `NEXT_PUBLIC_ESCROW_FROM_BLOCK` is after the create event | Set it a few hundred blocks before the deploy block |
| Contract workflow fails instantly | `confirm` was not exactly `DEPLOY` | Re-dispatch with the exact string |
| `--verify` fails but the deploy went through | `ARBISCAN_API_KEY` missing or rate-limited | Deploy still valid; verify later with `forge verify-contract` |
| Push to `main` deployed to production | The `git` block was removed from `web/vercel.json` | Restore `git.deploymentEnabled.main = false` |

## Rolling back

There is no rollback target, on purpose — the two halves roll back differently.

- **Frontend:** Vercel → Deployments → pick the previous production deployment → Promote. Instant and does not touch the repo.
- **Contract:** not rollable. The old escrow still exists at its old address with its state intact, so "rolling back" means pointing `NEXT_PUBLIC_ESCROW_ADDRESS` and `LIVE_ESCROW_V3` back at it and publishing a release.

## Key handling

`DEPLOY_PRIVATE_KEY` is a **testnet** key. It sits in GitHub Actions secrets, which means anyone who can push a workflow to this repo can exfiltrate it — that is true of every CI secret, and it is why this repo never holds a key with mainnet value. The `contracts-deploy` environment with required reviewers narrows who can trigger a run that reads it.

`contracts/.env` is gitignored and holds the local copy. `contracts/.env.example` documents every variable with a **public** example value; the Anvil key that appears there is the well-known account 0 key, published in Foundry's own docs.
