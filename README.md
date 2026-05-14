# Mantle RWA Guardian

AI risk/yield copilot for Mantle wallets that hold real-world-asset and yield-bearing assets such as mETH, USDY, mUSD, and FBTC.

- Live demo: https://mantleguardian.xyz
- Source: https://github.com/web3blind/mantle-rwa-guardian
- Demo wallet: `0x588846213a30fd36244e0ae0ebb2374516da836c`

## What it does

Mantle RWA Guardian turns a wallet address into an explainable audit:

1. Reads real Mantle Mainnet token balances and pricing context.
2. Detects tracked RWA/yield exposure: mETH, USDY, mUSD, and FBTC.
3. Scores portfolio risk with deterministic rules.
4. Generates a human-readable AI report when `OPENROUTER_API_KEY` is configured.
5. Publishes assessment hashes to a Mantle Sepolia proof contract.
6. Shows the user a copyable audit result with transaction, contract, wallet, portfolio hash, and report hash.

The UI is intentionally demo-friendly: long hashes are shortened visually, proof fields have copy buttons, and cached audit timing is shown as human text such as `Cache refresh in 39 minutes` instead of raw ISO timestamps.

## Why Mantle

RWA and yield-bearing assets are useful only if users can understand their exposure. A balance list is not enough. The project demonstrates a simple pattern for consumer-facing portfolio intelligence on Mantle:

```text
Mantle Mainnet portfolio data -> AI explanation -> Mantle Sepolia verifiable proof
```

The demo analyzes real Mainnet data while publishing proof on Sepolia, which keeps the hackathon demo safer and cheaper without pretending the portfolio itself is test data.

## Live demo flow

1. Open https://mantleguardian.xyz.
2. Keep the prefilled demo wallet or paste another Mantle wallet.
3. Press **Run audit and publish proof**.
4. Review:
   - risk score and summary;
   - tracked positions;
   - AI agent report;
   - Mantle Sepolia proof details;
   - copy buttons for transaction, contract, wallet, portfolio hash, and report hash.

Repeat audits for the same wallet are cached in SQLite for 1 hour by default. During the cache window, the app returns the previous report and transaction link instead of publishing duplicate on-chain assessments.

## Architecture

```text
Browser UI
  -> Node.js API
    -> Mantle Mainnet RPC / public data sources
    -> deterministic risk engine
    -> optional OpenRouter AI report
    -> SQLite audit cache
    -> Mantle Sepolia RWAGuardian proof contract
```

### Main components

- `public/` — accessible vanilla JS/CSS frontend.
- `src/server.ts` — Node.js HTTP server and API routes.
- `src/collectors/` — wallet snapshot, token balances, and yield/pricing context.
- `src/risk/` — deterministic scoring and findings.
- `src/ai/` — AI report generation with deterministic fallback for tests/local demos.
- `src/api/auditWallet.ts` — full audit flow used by the browser.
- `src/storage/` — SQLite cache and deterministic snapshot hashing.
- `contracts/src/RWAGuardian.sol` — proof contract.
- `src/autoDeploy.ts` — built-in PM2 auto-deploy watcher.

## API

- `GET /api/analyze?wallet=<address>` — returns Mantle Mainnet portfolio analysis, risk score, report, and hashes.
- `POST /api/audit` — full demo action: collect data, generate report, publish hashes on Mantle Sepolia, and return proof details.
- `POST /api/publish` — lower-level publish route for scripts/tests.
- `GET /health` — service health check.

## Mantle Sepolia proof contract

Contract:

```text
0x46a1dca82461427fe095b8ae33859e89c55dd1dc
```

Deployment transaction:

```text
0x6fc22d5e810af40d810ea7d960a321463ebfd1a56efcbc30b28ae8f1b938b57d
```

Demo assessment transactions:

```text
0x9e5203e66438764323842cc867a90590fd49fcd6de2c15c39b550b8136cd418d
0xa0071352ede71f71157742e22f84d7975b1453824de6b3a78ce22c21714953a1
```

Deployment metadata lives in `contracts/deployment.mantle-sepolia.json`.
Demo assessment metadata lives in `contracts/demo-assessment.mantle-sepolia.json`.

## Local setup

```bash
npm install
cp .env.example .env
npm test
npm run typecheck
npm run dev
```

The local app starts on `http://localhost:3000` unless `PORT` is set.

Useful commands:

```bash
npm run compile:contracts
npm run check:deploy-wallet
npm run deploy:sepolia
npm run publish:demo
```

## Environment

See `.env.example` for all supported variables.

Important values:

```env
OPENROUTER_API_KEY=
AI_MODEL=openai/gpt-5.4-mini
DEPLOYER_PRIVATE_KEY=
NEXT_PUBLIC_RWA_GUARDIAN_ADDRESS=0x46a1dca82461427fe095b8ae33859e89c55dd1dc
AUDIT_CACHE_TTL_SECONDS=3600
AUTO_DEPLOY=true
AUTO_DEPLOY_BRANCH=main
AUTO_DEPLOY_INTERVAL_MS=60000
```

`DEPLOYER_PRIVATE_KEY` and API keys must stay in `.env`; never commit or print them.

## Deployment

The public deployment runs behind Nginx/aaPanel with PM2 on `127.0.0.1:3004`.

Built-in auto-deploy is enabled by environment variables:

```env
AUTO_DEPLOY=true
AUTO_DEPLOY_BRANCH=main
AUTO_DEPLOY_INTERVAL_MS=60000
```

When enabled, the running server checks `origin/<branch>` once per interval. If a new commit exists, it runs:

```bash
git fetch --quiet origin main
git reset --hard origin/main
npm ci
npm test
npm run typecheck
```

After validation it exits with code 0 so PM2 restarts the process with the new code. Failed deploy checks are logged and keep the current process alive. The old `.sh`/cron deploy wrapper has been removed so there is only one persistent deploy mechanism.

## Security notes

- `.env` is ignored by git.
- Private keys are only read from environment variables.
- The public UI does not show model names, fallback diagnostics, API keys, private keys, or internal cost accounting.
- On-chain proof stores hashes/score metadata, not the full private report text.
- Audit caching avoids duplicate on-chain writes during the TTL window.

## If this were more than an MVP

The next production-grade steps would be:

- connect more Mantle RWA and DeFi positions;
- add historical risk/yield charts;
- verify the proof contract on the explorer;
- deploy the proof contract to Mantle Mainnet if required by product/compliance goals;
- add user accounts or signed wallet sessions;
- add alerting for risk score changes;
- support multi-wallet and organization portfolios;
- run continuous monitoring instead of only on-demand audits;
- add deeper liquidity, depeg, oracle, bridge, and smart-contract risk modules.

For the hackathon, the current scope is intentionally focused: one clear wallet audit, an explainable AI report, and a verifiable Mantle proof trail.
