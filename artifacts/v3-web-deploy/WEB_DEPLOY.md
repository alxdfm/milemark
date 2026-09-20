# MileMark v3 web deploy (Vercel)

Canonical newcomer guide (prerequisites, env matrix, smoke checks, `/demo` 404): [`docs/DEPLOY.md`](../../docs/DEPLOY.md).

This file is the **tarball / rebuild** note. Production `https://milemark-pearl.vercel.app` once served a **pre-v3** frontend (`/demo` → Next 404) even with v3 env vars. Env is not enough: Vercel must **rebuild this `web/` tree** with Root Directory = `web/` (or an archive whose root is `web/package.json`). `web/vercel.json` only sets `"framework": "nextjs"`.

| Item | Value |
|---|---|
| App root | `web/` (`package.json` here — **Vercel Root Directory = `web`**) |
| Framework | Next.js 16 App Router |
| Live escrow v3 | `0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC` |
| Demo kit | `/demo` |
| Demo campaign | id `0` |
| Chain | Arbitrum Sepolia `421614` |
| From block | `309949200` |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

Routes that must exist after a good build: `/`, `/create`, `/campaign/[id]`, **`/demo`**.

## Env (set on the Vercel project, Production)

Same as `web/.env.production` / `web/.env.example`:

```
NEXT_PUBLIC_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_ESCROW_ADDRESS=0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC
NEXT_PUBLIC_DEMO_CAMPAIGN_ID=0
NEXT_PUBLIC_ESCROW_FROM_BLOCK=309949200
NEXT_PUBLIC_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

## Deploy from this tarball

`artifacts/v3-web-deploy.tgz` is **source** (no `node_modules` / `.next`) so Vercel can build.

```bash
mkdir -p /tmp/milemark-web && tar -xzf artifacts/v3-web-deploy.tgz -C /tmp/milemark-web
cd /tmp/milemark-web
npx vercel link --yes --scope mile-mark --project milemark
npx vercel env pull .env.local   # optional; .env.production already has public v3 defaults
npx vercel deploy --prod --yes
```

One-shot without linking (CLI still needs `VERCEL_TOKEN` + org/project):

```bash
cd /tmp/milemark-web
VERCEL_ORG_ID=<mile-mark-team-id> \
VERCEL_PROJECT_ID=<milemark-project-id> \
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

## Deploy from git (Origin `main`)

1. Vercel project **Root Directory = `web`** (not repo root). Repo root has no Next `package.json`; that is why production 404s `/demo`.
2. Connect GitHub `alxdfm/milemark` `main` (or upload this tarball). Pushes do not deploy: `web/vercel.json` disables them, and production moves on a published release via `.github/workflows/deploy-web.yml`.
3. Redeploy **without** using an old deployment cache if the previous SHA predates `/demo`.

## Local production build (what this artifact was checked with)

```bash
cd web
npm ci
NEXT_PUBLIC_RPC=https://sepolia-rollup.arbitrum.io/rpc \
NEXT_PUBLIC_CHAIN_ID=421614 \
NEXT_PUBLIC_ESCROW_ADDRESS=0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC \
NEXT_PUBLIC_DEMO_CAMPAIGN_ID=0 \
NEXT_PUBLIC_ESCROW_FROM_BLOCK=309949200 \
NEXT_PUBLIC_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
npm run build
```

Confirm `.next/server/app/demo.html` (or `.next/server/app/demo/`) exists.
