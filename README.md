# Mantle RWA Guardian

AI risk/yield copilot for Mantle portfolios holding mETH, USDY, mUSD, and FBTC.

Public demo domain: https://mantleguardian.xyz

The MVP analyzes real Mantle Mainnet wallet data, generates a structured risk/yield report, and anchors the AI assessment on-chain via a Mantle Sepolia contract.

## Current implementation status

- Project initialized in `/root/hackatons/mantle-rwa-guardian`.
- `PLAN.md` contains the full implementation plan.
- TypeScript/Vitest tooling configured.
- Mantle asset registry implemented and tested.
- Deterministic risk rules, snapshot hashing, wallet snapshot collector, yield collector, and deploy scripts implemented.
- `RWAGuardian` deployed to Mantle Sepolia and demo assessments published on-chain.
- AI report generation implemented through OpenRouter when `OPENROUTER_API_KEY` is set; deterministic fallback remains available for reproducible local demos.
- Backend API implemented: `GET /api/analyze?wallet=...` and `POST /api/publish`.
- Accessible frontend MVP implemented under `public/` and served by `npm run dev`.
- Deployment wallet generated locally; private key is stored only in `.env` and must not be committed or printed.

## Agent flow

```text
collect Mantle data -> LLM generates report -> publish hashes on-chain -> return report with tx proof in the UI
```

`OPENROUTER_API_KEY` enables the real LLM report path. If the key is absent or the model call fails, the app falls back to a deterministic local report so demos and tests remain stable. Recommended hackathon model: `openai/gpt-5.4-mini` (stronger reasoning than `openai/gpt-4.1-mini`, still usually about one cent or less per audit at current prompt sizes). OpenRouter usage/cost is logged from `response.usage` for internal spend tracking, but the browser UI keeps this accounting detail hidden from end users.

Repeat audits for the same wallet are cached in SQLite for **1 hour** by default (`AUDIT_CACHE_TTL_SECONDS=3600`). During the cache window the UI returns the previous report and transaction link instead of publishing a duplicate on-chain assessment. Cache database path: `./data/audit-cache.sqlite` by default.

## Network decision

For the hackathon MVP:

- Analyze portfolios on **Mantle Mainnet** because real mETH/USDY/mUSD/FBTC balances and transfer history are there.
- Deploy the proof/assessment contract on **Mantle Sepolia** because it is safer and cheaper for demos.
- The same deployer address can later be funded on Mantle Mainnet if mainnet deployment becomes required.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run compile:contracts
npm run check:deploy-wallet
npm run deploy:sepolia
npm run publish:demo
npm run dev
```

`npm run dev` starts the local full-stack MVP at `http://localhost:3000` unless `PORT` is set. The public aaPanel deployment runs on `127.0.0.1:3004` behind Nginx.

Optional built-in auto-deploy can be enabled for PM2 deployments:

```env
AUTO_DEPLOY=true
AUTO_DEPLOY_BRANCH=main
AUTO_DEPLOY_INTERVAL_MS=60000
```

When enabled, the running server resolves the repository root from its own module path, checks `origin/<branch>` once per interval, validates updates with `npm ci`, `npm test`, and `npm run typecheck`, then exits with code 0 so PM2 can restart it with the new code. Failed deploy checks are logged and keep the current process alive. The old cron/panel shell deploy wrapper was removed; use the built-in watcher only, so there is a single deploy mechanism.

- `GET /api/analyze?wallet=<address>` returns a live Mantle Mainnet portfolio analysis, risk score, AI-generated agent report when OpenRouter is configured, and report/portfolio hashes.
- `POST /api/audit` runs the full demo flow in one backend action: collect data, ask the LLM, publish hashes to `RWAGuardian` on Mantle Sepolia, then return the report plus transaction link. If the same wallet was audited during the last 1 hour, it returns the cached SQLite record and old transaction link instead of publishing again.
- `POST /api/publish` remains available for scripts/tests, but the browser UI no longer exposes a separate publish button.
- `/` serves the accessible browser UI for analysis and publishing.

## Demo wallet for analysis

```text
0x588846213a30fd36244e0ae0ebb2374516da836c
```

## Deploy wallet

Address only is safe to share:

```text
0x7ec2adFd40548c87458Ba838CaBb3DCF98609bD5
```

Private key is stored in `.env` as `DEPLOYER_PRIVATE_KEY`.

## Mantle Sepolia deployment

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

Deployment metadata is stored in `contracts/deployment.mantle-sepolia.json`.
Demo assessment metadata is stored in `contracts/demo-assessment.mantle-sepolia.json`.

## Faucet notes

Mantle Sepolia gas token is testnet MNT.

Useful faucets:

- Official Mantle faucet: https://faucet.sepolia.mantle.xyz/
- QuickNode Mantle Sepolia faucet: https://faucet.quicknode.com/mantle/sepolia
- Chainlink Mantle Sepolia faucet: https://faucets.chain.link/mantle-sepolia
- HackQuest faucet info: https://www.hackquest.io/faucets/5003

Observed limitations:

- Official Mantle faucet requires X authentication and wallet connect.
- QuickNode accepted a pasted address but rejected this fresh wallet because it has no qualifying ETH mainnet balance.
- HackQuest shows faucet balance but requires sign-in flow.

If automatic faucet funding is blocked, fund the deployer manually with a small amount of Mantle Sepolia MNT.
