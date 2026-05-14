# Mantle RWA Guardian Implementation Plan

> **For Hermes:** Use the `coding`, `test-driven-development`, and `subagent-driven-development` skills to implement this plan task-by-task. Keep execution scoped to `/root/hackatons/mantle-rwa-guardian` unless a task explicitly says otherwise.

**Goal:** Build Mantle RWA Guardian — an AI risk/yield copilot for Mantle portfolios holding mETH, USDY, mUSD, and FBTC, with structured on-chain data collection, liquidity-aware recommendations, and verifiable on-chain AI assessments.

**Architecture:** The project is a full-stack hackathon MVP: a local/backend data collector reads Mantle mainnet data from RPC, Routescan, DefiLlama, and token/oracle calls; a deterministic risk engine converts raw facts into explicit risk features; an AI report layer explains risk/yield in human language; a Solidity contract on Mantle Sepolia stores assessment proofs/hashes; a public frontend lets a user enter a wallet, review the report, and publish an assessment. The AI must never invent portfolio facts: it receives only structured collector output.

**Tech Stack:** Node.js/TypeScript, Next.js or Vite+React frontend, backend API routes or Express/Fastify service, viem/ethers for EVM calls, Solidity + Foundry or Hardhat for contracts, Mantle Mainnet RPC for indexing, Mantle Sepolia for deployment, Routescan API, DefiLlama APIs, optional SQLite for cached snapshots, OpenRouter/LLM provider for narrative report generation.

---

## 0. Project facts and constraints

### Hackathon context

- Project name: **Mantle RWA Guardian**.
- Track focus: **AI x RWA**.
- Secondary angle: **AI Alpha & Data** because the service turns raw Mantle portfolio data into risk/yield intelligence.
- Deployment Award requirements to cover:
  - verified smart contract;
  - public frontend;
  - demo video;
  - meaningful Mantle network usage.
- Critical requirement: the project must include an **AI-powered function callable on-chain** or a verifiable on-chain result produced by AI.
- Proposed framing:
  - “Our agent turns raw Mantle RWA positions into verifiable, on-chain risk assessments.”

### Product thesis

Mantle RWA Guardian analyzes a wallet’s Mantle RWA/LST/BTC exposure, detects risks and yield opportunities, then produces an AI-readable and user-readable report. The report is anchored on-chain by publishing score/hash/timestamp to a Mantle Sepolia contract.

### UX principle: “RealClaw-like UX”

This means only the interaction style, not copying RealClaw:

- user writes or enters a wallet in simple terms;
- service explains risks without requiring DeFi expertise;
- agent gathers data and proposes actions;
- recommendations are grounded in on-chain data;
- result can be fixed on-chain as an AI assessment trail.

It does **not** mean using RealClaw/Byreal/Solana SDKs. The product is Mantle-native RWA risk/yield analysis.

### Non-goals for MVP

- Do not build a trading bot.
- Do not manage private keys.
- Do not execute swaps, deposits, withdrawals, bridges, or lending transactions for users.
- Do not attempt full DeFi position indexing across all Mantle protocols in the first MVP.
- Do not claim investment advice. Use “risk/yield analysis” and “recommendation candidate”.
- Do not treat USDY/mUSD as plain USDC clones.
- Do not recommend moving large positions into low-TVL pools.

---

## 1. Confirmed Mantle assets

Keep these addresses in `src/config/assets.ts` and re-verify before final deployment.

### Mantle Mainnet, chain id `5000`

RPC:

```text
https://rpc.mantle.xyz
```

Assets:

- **mETH**
  - address: `0xcDA86A272531e8640cD7F1a92c01839911B90bb0`
  - decimals: `18`
  - observed symbol: `mETH`
  - category: `liquid_staking`
  - risks: staking, validator, withdrawal buffer, oracle/pauser, bridge/liquidity.

- **USDY**
  - address: `0x5bE26527e817998A7206475496fDE1E68957c5A6`
  - decimals: `18`
  - observed name: `Ondo U.S. Dollar Yield`
  - observed symbol: `USDY`
  - category: `rwa_treasury`
  - semantics: accumulating token; price per token grows; not a flat `$1` stablecoin.
  - risks: oracle dependency, transfer restrictions/blocklist possibility, liquidity, RWA issuer/custody.

- **mUSD**
  - address: `0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3`
  - decimals: `18`
  - observed name: `Mantle USD`
  - observed symbol: `mUSD`
  - category: `rebasing_rwa`
  - semantics: rebasing version; user balance can change.
  - risks: rebasing accounting, integration confusion, special pricing/conversion handling.

- **USDY redemption price oracle**
  - address: `0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f`
  - method: `getPrice()`
  - selector: `0x98d5fdca`
  - observed price during research: about `1.13277249` with `1e18` precision.

- **FBTC**
  - address: `0xC96dE26018A54D51c097160568752c4E3BD6C364`
  - decimals: `8`
  - observed name: `Fire Bitcoin`
  - observed symbol: `FBTC`
  - category: `btc_rwa`
  - risks: bridge/custody/proof-of-reserve, minter/governor dependency, 8-decimal accounting.

FBTC related contracts observed from docs:

- FireBridge: `0xbee335BB44e75C4794a0b9B54E8027b111395943`
- Minter: `0x80b534D4bB3D809FbDA809DCB26D3f220634AED7`
- FeeModel: `0xd12D39E682715a40dbC860fa07F02bF48841294e`
- GovernorModule: `0x09e4c43eD89E5972df026d94FdA3a7680637c59A`
- Factory: `0x4697F9b54Bf24776b81f42A5E2Da81FBA3763bA4`

### Mantle Sepolia, chain id `5003`

RPC:

```text
https://rpc.sepolia.mantle.xyz
```

Assets/contracts for testing:

- **mETH Sepolia**
  - address: `0x9EF6f9160Ba00B6621e5CB3217BB8b54a92B2828`
  - decimals: `18`
  - observed symbol: `mETH`

- **FBTC Sepolia**
  - address: `0x037017580b1Ed99952a006b5197592B1AA08A166`
  - decimals: `8`
  - observed name: `Fire Bitcoin`
  - observed symbol: `FBTC`

---

## 2. Confirmed data sources

### Mantle RPC

Use for:

- `eth_chainId`;
- `eth_blockNumber`;
- `eth_getCode`;
- ERC20 `balanceOf`;
- ERC20 `decimals`, `symbol`, `name`, `totalSupply`;
- direct oracle calls, especially USDY `getPrice()`;
- fallback `eth_getLogs` for token transfer events if Routescan is unavailable.

Mainnet RPC:

```text
https://rpc.mantle.xyz
```

Sepolia RPC:

```text
https://rpc.sepolia.mantle.xyz
```

### Routescan Etherscan-compatible API

Base:

```text
https://api.routescan.io/v2/network/mainnet/evm/5000/etherscan/api
```

Useful endpoint:

```text
module=account
action=tokentx
contractaddress=<TOKEN>
address=<WALLET>
page=1
offset=20
sort=desc
```

Use for:

- recent token transfers;
- direction: incoming/outgoing;
- counterparties;
- transaction hashes;
- timestamps;
- explorer-provided `functionName` / method id.

### DefiLlama Prices

Endpoint:

```text
https://coins.llama.fi/prices/current/mantle:<token_address>
```

Confirmed useful for:

- mETH;
- USDY;
- FBTC.

mUSD may not always be returned. MVP must handle mUSD with a special pricing fallback and clear caveat.

### DefiLlama Yields

Endpoint:

```text
https://yields.llama.fi/pools
```

Observed useful rows:

- `ondo-yield-assets` / `USDY` on Mantle:
  - TVL around `$29.4M`;
  - APY around `3.55%`.
- `lendle-pooled-markets` / `METH` on Mantle:
  - TVL around `$293k`;
  - APY around `0.34%`.
- `circuit-protocol` / `METH` on Mantle:
  - TVL around `$55k`;
  - APY around `2.23%`.
- `aave-v3` / `FBTC` on Mantle:
  - TVL around `$99k`;
  - APY around `0%`.
- `lendle-pooled-markets` / `FBTC` on Mantle:
  - TVL around `$30k`;
  - APY around `1.6%`.

Important MVP insight: liquidity and TVL must be compared against wallet position size before recommending a pool.

---

## 3. Real-wallet validation already performed

This section must be preserved because it proves feasibility.

### Test wallet

```text
0x588846213a30fd36244e0ae0ebb2374516da836c
```

Observed facts:

- wallet type: EOA, not contract;
- network: Mantle Mainnet;
- block during test: `95324557`;
- tracked assets present: mETH, USDY, mUSD, FBTC.

### Portfolio snapshot from feasibility test

Approximate total tracked value: **$2.86M**.

- **mETH**
  - balance: `799.726657 mETH`
  - price observed: `$2504.73`
  - value: about `$2,003,099`
  - share: about `70.06%`.

- **USDY**
  - balance: `280,489.566 USDY`
  - DefiLlama price observed: `$1.1320`
  - USDY oracle price observed: `$1.13277249`
  - value: about `$317,522`
  - share: about `11.11%`.

- **mUSD**
  - balance: `36,509.185 mUSD`
  - MVP price fallback: `$1.00`
  - value: about `$36,509`
  - share: about `1.28%`.

- **FBTC**
  - balance: `6.22027327 FBTC`
  - price observed: `$80,716.43`
  - value: about `$502,078`
  - share: about `17.56%`.

### Demo risk score

- score: `62 / 100`;
- level: `medium-high`.

Why:

- high concentration in mETH;
- mETH staking/withdrawal/bridge risk;
- USDY oracle/blocklist/liquidity risk;
- mUSD rebasing accounting risk;
- FBTC bridge/custody/proof-of-reserve risk;
- position sizes are large relative to available Mantle pool liquidity.

### Transfer-history signals from feasibility test

mETH:

- recent incoming transfers in May 2026;
- signal: active accumulation of mETH.

USDY:

- recent outgoing transfers in May 2026;
- signal: USDY is actively used, not only idle.

FBTC:

- multiple recent incoming transfers in May 2026;
- signal: active accumulation of BTC exposure on Mantle.

mUSD:

- first page history showed older 2024 transfers;
- signal: requires deeper pagination and rebasing-aware logic.

### Key feasibility conclusion

The service can work: it can collect balances, prices, USD values, yield opportunities, transfer history, oracle context, risk tags, and liquidity warnings. The strongest “wow” moment is that the AI can understand portfolio size relative to available pool liquidity, not merely list tokens.

---

## 4. Product requirements

### User-facing MVP flow

1. User opens public frontend.
2. User enters a Mantle wallet address.
3. Frontend calls backend analysis endpoint.
4. Backend collector builds a wallet snapshot:
   - balances;
   - prices;
   - USD valuation;
   - transfer history;
   - yield pools;
   - oracle data;
   - risk features.
5. Risk engine returns deterministic score and structured findings.
6. AI report generator creates a clear human-readable report.
7. UI displays:
   - portfolio summary;
   - risk score;
   - asset breakdown;
   - risk explanations;
   - liquidity-aware yield notes;
   - recent activity;
   - “Publish assessment” button.
8. User can publish an assessment proof to Mantle Sepolia.
9. Contract stores:
   - wallet address;
   - chain id;
   - risk score;
   - report hash;
   - portfolio hash;
   - timestamp;
   - optional short summary.
10. UI links to Routescan/Sepolia explorer for the assessment transaction.

### User-facing copy rules

- Say “risk/yield analysis”, not “financial advice”.
- Explain USDY as yield-bearing/accumulating, not as simple USDC.
- Explain mUSD as rebasing.
- Explain FBTC as BTC exposure with bridge/custody/proof-of-reserve risk.
- Explain mETH as liquid staking ETH exposure with withdrawal/liquidity risks.
- Warn when a wallet’s position is too large relative to pool TVL.
- Keep reports accessible and readable for non-experts.

---

## 5. Repository structure to create

Target root:

```text
/root/hackatons/mantle-rwa-guardian
```

Recommended structure:

```text
mantle-rwa-guardian/
├── PLAN.md
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── src/
│   ├── config/
│   │   ├── assets.ts
│   │   ├── chains.ts
│   │   └── env.ts
│   ├── collectors/
│   │   ├── rpcClient.ts
│   │   ├── assetRegistry.ts
│   │   ├── walletSnapshotCollector.ts
│   │   ├── yieldCollector.ts
│   │   ├── transferHistoryCollector.ts
│   │   ├── oracleCollector.ts
│   │   └── protocolExposureDetector.ts
│   ├── risk/
│   │   ├── riskFeatureBuilder.ts
│   │   ├── riskRules.ts
│   │   ├── riskScore.ts
│   │   └── liquidityWarnings.ts
│   ├── ai/
│   │   ├── reportPrompt.ts
│   │   ├── reportGenerator.ts
│   │   └── reportSchema.ts
│   ├── api/
│   │   ├── analyzeWallet.ts
│   │   └── publishAssessment.ts
│   ├── storage/
│   │   ├── cache.ts
│   │   └── snapshotHash.ts
│   └── utils/
│       ├── erc20.ts
│       ├── formatting.ts
│       ├── address.ts
│       └── fetchJson.ts
├── contracts/
│   ├── src/
│   │   └── RWAGuardian.sol
│   ├── script/
│   │   └── DeployRWAGuardian.s.sol
│   ├── test/
│   │   └── RWAGuardian.t.sol
│   └── foundry.toml
├── web/
│   ├── app/ or src/
│   ├── components/
│   └── styles/
├── tests/
│   ├── collectors/
│   ├── risk/
│   ├── ai/
│   └── fixtures/
└── scripts/
    ├── analyze-wallet.ts
    ├── verify-assets.ts
    ├── demo-report.ts
    └── deploy-sepolia.ts
```

If choosing Next.js, `web/` can be the app root. If choosing a single package app, place frontend under `app/` and backend under `src/`. Keep the structure simple; do not over-engineer monorepo tooling unless needed.

---

## 6. Environment variables

Create `.env.example`:

```bash
# Mantle RPCs
MANTLE_MAINNET_RPC_URL=https://rpc.mantle.xyz
MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz

# Explorer / market data
ROUTESCAN_MANTLE_API_URL=https://api.routescan.io/v2/network/mainnet/evm/5000/etherscan/api
DEFILLAMA_PRICES_URL=https://coins.llama.fi/prices/current
DEFILLAMA_YIELDS_URL=https://yields.llama.fi/pools

# AI provider. Do not commit real keys.
OPENROUTER_API_KEY=
AI_MODEL=openai/gpt-4.1-mini

# Deployment. Do not commit real private keys.
DEPLOYER_PRIVATE_KEY=
MANTLESCAN_API_KEY=

# Contract address after deployment
NEXT_PUBLIC_RWA_GUARDIAN_ADDRESS=
NEXT_PUBLIC_MANTLE_SEPOLIA_CHAIN_ID=5003
```

Security rules:

- Never commit `.env`.
- Never print private keys.
- Use a fresh hackathon deployer wallet, not a wallet with funds.
- Backend must validate wallet addresses before network calls.
- Backend must rate-limit public analysis endpoint if deployed.

---

## 7. Core data model

### `AssetRegistryEntry`

```ts
type AssetCategory = 'liquid_staking' | 'rwa_treasury' | 'rebasing_rwa' | 'btc_rwa';

type RiskTag =
  | 'staking'
  | 'validator'
  | 'withdrawal_buffer'
  | 'oracle'
  | 'bridge'
  | 'custody'
  | 'rebasing'
  | 'accumulating_price'
  | 'blocklist_possible'
  | 'proof_of_reserve'
  | 'liquidity';

interface AssetRegistryEntry {
  chainId: number;
  symbol: 'mETH' | 'USDY' | 'mUSD' | 'FBTC';
  address: `0x${string}`;
  decimals: number;
  category: AssetCategory;
  riskTags: RiskTag[];
  priceStrategy: 'defillama' | 'oracle' | 'usd_fallback';
}
```

### `WalletAssetPosition`

```ts
interface WalletAssetPosition {
  symbol: string;
  address: `0x${string}`;
  balanceRaw: bigint;
  balance: string;
  decimals: number;
  priceUsd: number | null;
  priceSource: string;
  valueUsd: number;
  sharePct: number;
  category: AssetCategory;
  riskTags: RiskTag[];
}
```

### `TransferEventSummary`

```ts
interface TransferEventSummary {
  asset: string;
  date: string;
  direction: 'in' | 'out' | 'self';
  amount: string;
  counterparty: `0x${string}`;
  functionName?: string;
  txHash: `0x${string}`;
}
```

### `YieldPoolSummary`

```ts
interface YieldPoolSummary {
  asset: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  poolId: string;
  liquidityWarning?: string;
}
```

### `RiskFeatureSet`

```ts
interface RiskFeatureSet {
  portfolioValueUsd: number;
  trackedAssetsCount: number;
  maxAssetSharePct: number;
  rwaSharePct: number;
  ethLsdSharePct: number;
  btcBridgeSharePct: number;
  usdRwaSharePct: number;
  hasOracleDependency: boolean;
  hasRebasingAsset: boolean;
  hasBridgeCustodyAsset: boolean;
  hasAccumulatingAsset: boolean;
  lowLiquidityWarnings: string[];
  unknownCounterpartyWarnings: string[];
  staleTransferHistoryWarnings: string[];
}
```

### `RiskAssessment`

```ts
interface RiskAssessment {
  wallet: `0x${string}`;
  chainId: number;
  blockNumber: number;
  score: number; // 0-100, higher means more risk
  level: 'low' | 'medium' | 'medium-high' | 'high';
  summary: string;
  findings: string[];
  recommendations: string[];
  features: RiskFeatureSet;
  portfolioHash: `0x${string}`;
  reportHash: `0x${string}`;
}
```

---

## 8. Deterministic risk rules

The AI report must be based on deterministic rules and structured facts.

### Seed risk features

- `portfolio_value_usd`
- `rwa_share_percent`
- `single_asset_concentration`
- `usd_stable_exposure`
- `eth_lsd_exposure`
- `btc_bridge_exposure`
- `oracle_dependency`
- `rebasing_asset_present`
- `custodial_or_bridge_asset_present`
- `low_liquidity_warning`
- `yield_vs_risk_score`
- `stale_transfer_history`
- `unknown_contract_interaction`

### Scoring proposal

Start from `20` base risk.

Add:

- `+20` if largest asset share > 70%.
- `+12` if largest asset share > 50% and <= 70%.
- `+10` if FBTC value > 10% of portfolio.
- `+8` if USDY value > 10% of portfolio.
- `+5` if mUSD present.
- `+8` if any position is more than 5x the largest relevant pool TVL.
- `+5` if transfer history includes unknown contract counterparties.
- `+5` if price source falls back rather than live price/oracle.
- `-5` if portfolio has at least 3 tracked assets and no asset > 50%.
- `-5` if USDY is a moderate allocation and oracle/DefiLlama prices agree within tolerance.

Clamp score to `0..100`.

Levels:

- `0-29`: low;
- `30-54`: medium;
- `55-74`: medium-high;
- `75-100`: high.

### Asset-specific rules

USDY:

- flag as accumulating token;
- compare DefiLlama price to oracle price if both available;
- warn if user expects it to be `$1`;
- mention possible transfer restrictions/blocklist;
- mention liquidity risk;
- use Ondo Yield Assets APY as base yield context.

mUSD:

- flag as rebasing;
- do not infer yield from balance changes unless specifically implemented;
- if no live market price, use `$1 fallback` with explicit caveat;
- add accounting-risk warning.

mETH:

- flag staking/validator/withdrawal risk;
- flag L2 liquidity/bridge context;
- compare position size to available Mantle mETH pools;
- avoid recommending small-TVL pools to large holders.

FBTC:

- flag bridge/custody/proof-of-reserve risk;
- handle decimals as `8`;
- compare position size to FBTC pool TVL;
- do not call it “native BTC”.

---

## 9. On-chain assessment contract

### Contract name

`RWAGuardian.sol`

### Minimal Solidity interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RWAGuardian {
    struct Assessment {
        address wallet;
        uint256 sourceChainId;
        uint8 riskScore;
        bytes32 portfolioHash;
        bytes32 reportHash;
        string summary;
        uint256 timestamp;
        address reporter;
    }

    Assessment[] public assessments;

    event AssessmentPublished(
        uint256 indexed assessmentId,
        address indexed wallet,
        uint256 indexed sourceChainId,
        uint8 riskScore,
        bytes32 portfolioHash,
        bytes32 reportHash,
        address reporter,
        uint256 timestamp
    );

    function publishAssessment(
        address wallet,
        uint256 sourceChainId,
        uint8 riskScore,
        bytes32 portfolioHash,
        bytes32 reportHash,
        string calldata summary
    ) external returns (uint256 assessmentId) {
        require(wallet != address(0), "wallet=0");
        require(riskScore <= 100, "riskScore>100");
        require(portfolioHash != bytes32(0), "portfolioHash=0");
        require(reportHash != bytes32(0), "reportHash=0");

        assessments.push(Assessment({
            wallet: wallet,
            sourceChainId: sourceChainId,
            riskScore: riskScore,
            portfolioHash: portfolioHash,
            reportHash: reportHash,
            summary: summary,
            timestamp: block.timestamp,
            reporter: msg.sender
        }));

        assessmentId = assessments.length - 1;
        emit AssessmentPublished(
            assessmentId,
            wallet,
            sourceChainId,
            riskScore,
            portfolioHash,
            reportHash,
            msg.sender,
            block.timestamp
        );
    }

    function assessmentCount() external view returns (uint256) {
        return assessments.length;
    }
}
```

### Contract acceptance criteria

- Unit tests pass.
- Rejects `wallet=0`.
- Rejects `riskScore > 100`.
- Rejects zero hashes.
- Emits `AssessmentPublished`.
- Returns assessment id.
- Deploys to Mantle Sepolia.
- Contract is verified on explorer if feasible.

### AI-powered function callable on-chain requirement

MVP interpretation:

- AI computes or explains the risk assessment off-chain based on structured on-chain data.
- A callable on-chain function `publishAssessment(...)` stores the AI assessment proof.
- The on-chain record includes `riskScore`, `portfolioHash`, `reportHash`, and timestamp.

Stretch option if time remains:

- Add `requestAssessment(wallet)` event function for a frontend/backend watcher:
  - user calls contract requesting analysis;
  - backend watches event;
  - backend computes AI report;
  - backend or user publishes final assessment.

---

## 10. API endpoints

### `GET /api/analyze?wallet=0x...`

Returns full analysis.

Validation:

- wallet must be valid EVM address;
- chain is fixed to Mantle mainnet for MVP;
- return 400 for invalid input;
- rate-limit if public.

Response shape:

```json
{
  "wallet": "0x...",
  "chainId": 5000,
  "blockNumber": 95324557,
  "totalUsd": 2859208.13,
  "assets": [],
  "yields": {},
  "transfers": {},
  "features": {},
  "assessment": {
    "score": 62,
    "level": "medium-high",
    "summary": "...",
    "findings": [],
    "recommendations": [],
    "portfolioHash": "0x...",
    "reportHash": "0x..."
  },
  "aiReport": "..."
}
```

### `POST /api/publish-assessment`

Option A, frontend signs transaction directly:

- backend only returns tx data/calldata;
- wallet signs via MetaMask/Rabby.

Option B, backend relays transaction:

- not recommended for MVP unless using a low-value deployer key and strict controls.

Prefer Option A.

---

## 11. Frontend requirements

### Pages/components

- Landing page:
  - project name;
  - one-sentence explanation;
  - wallet input;
  - “Analyze wallet” button;
  - example wallet button using `0x588846213a30fd36244e0ae0ebb2374516da836c`.

- Analysis view:
  - total tracked value;
  - risk score badge;
  - asset breakdown list;
  - risk findings;
  - recommendations;
  - yield opportunities;
  - recent transfers;
  - oracle/pricing caveats;
  - publish assessment button;
  - explorer links.

- Published assessment state:
  - tx hash;
  - contract address;
  - assessment id;
  - explorer link.

### Accessibility requirements

- Real labels for all inputs/buttons.
- Keyboard-only navigation works.
- No color-only risk indicators; include text labels.
- Risk score must be readable by screen readers.
- Loading and error states must be announced with text.
- Tables are optional; prefer accessible cards/lists for mobile and screen readers.

### Visual style suggestion

- Dark DeFi dashboard.
- Risk score prominent.
- Asset cards with category labels.
- Warning cards for liquidity mismatch.
- Keep copy clear and non-jargony.

---

## 12. AI report generation

### AI input policy

The LLM receives only structured JSON from collectors and deterministic risk engine. It must not browse or infer missing facts.

### Prompt rules

System prompt should say:

- You are Mantle RWA Guardian.
- Explain risk/yield clearly.
- Use only provided facts.
- Do not provide financial advice.
- If data is missing, say so.
- Highlight liquidity mismatch.
- Explain token semantics: USDY accumulating, mUSD rebasing, mETH staking, FBTC bridge/custody.

### Output schema

```ts
interface AiReport {
  title: string;
  shortSummary: string;
  riskLevel: string;
  keyFindings: string[];
  recommendations: string[];
  caveats: string[];
  onChainSummary: string;
}
```

`onChainSummary` should be short enough for contract storage, for example under 280 characters.

---

## 13. Implementation tasks

### Task 1: Initialize project

Objective: create package and basic tooling.

Files:

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

Steps:

1. Initialize Node project.
2. Install TypeScript, vitest, viem, zod, dotenv.
3. Add scripts:
   - `test`
   - `typecheck`
   - `lint` if linting is configured
   - `analyze:wallet`
   - `verify:assets`
4. Verify `npm test` runs.

Acceptance:

- `npm test` executes.
- `npm run typecheck` executes.
- `.env` is ignored.

### Task 2: Asset registry

Objective: create typed Mantle asset registry.

Files:

- Create: `src/config/chains.ts`
- Create: `src/config/assets.ts`
- Test: `tests/collectors/assetRegistry.test.ts`

Steps:

1. Write failing tests for chain ids and asset addresses.
2. Implement registry.
3. Add helper `getAssetsForChain(chainId)`.
4. Verify tests pass.

Acceptance:

- All four mainnet assets are present.
- Sepolia test assets are present.
- Decimals are correct.
- Risk tags are present.

### Task 3: RPC ERC20 reader

Objective: read ERC20 metadata and balances from Mantle RPC.

Files:

- Create: `src/collectors/rpcClient.ts`
- Create: `src/utils/erc20.ts`
- Test: `tests/collectors/rpcClient.test.ts`

Steps:

1. Write unit tests with mocked transport.
2. Implement `readErc20Balance`, `readSymbol`, `readDecimals`, `readName`.
3. Add script `scripts/verify-assets.ts`.
4. Run against Mantle RPC.

Acceptance:

- mETH, USDY, mUSD, FBTC metadata matches expected values.
- Balance reader handles 18 and 8 decimals correctly.

### Task 4: DefiLlama price collector

Objective: fetch prices for tracked assets.

Files:

- Create: `src/collectors/priceCollector.ts`
- Test: `tests/collectors/priceCollector.test.ts`

Steps:

1. Test URL construction.
2. Test parsing of DefiLlama response.
3. Implement mUSD fallback logic with caveat.
4. Verify live call for mETH/USDY/FBTC.

Acceptance:

- Prices returned for mETH/USDY/FBTC when API responds.
- mUSD fallback is explicit and marked as fallback.
- Failures do not crash full analysis; they produce warnings.

### Task 5: USDY oracle collector

Objective: read USDY oracle `getPrice()` directly.

Files:

- Create: `src/collectors/oracleCollector.ts`
- Test: `tests/collectors/oracleCollector.test.ts`

Steps:

1. Test selector `0x98d5fdca`.
2. Implement oracle call.
3. Convert `1e18` precision to decimal number/string.
4. Add comparison helper between oracle and DefiLlama price.

Acceptance:

- Oracle returns plausible USDY redemption price.
- Price mismatch warning triggers if difference is above threshold.

### Task 6: Wallet snapshot collector

Objective: combine balances, prices, categories, and USD values.

Files:

- Create: `src/collectors/walletSnapshotCollector.ts`
- Test: `tests/collectors/walletSnapshotCollector.test.ts`

Steps:

1. Test with fixture balances.
2. Calculate value and share percentage.
3. Include block number.
4. Include warnings for missing prices.

Acceptance:

- Snapshot for the real test wallet returns all four assets.
- Total USD is calculated.
- Share percentages sum approximately to 100.

### Task 7: Routescan transfer history collector

Objective: collect recent token transfers per asset.

Files:

- Create: `src/collectors/transferHistoryCollector.ts`
- Test: `tests/collectors/transferHistoryCollector.test.ts`

Steps:

1. Test Routescan URL generation.
2. Test parsing of timestamps, function names, direction, amount.
3. Implement fallback empty result handling.
4. Add optional pagination support.

Acceptance:

- Recent mETH/USDY/FBTC transfers for test wallet can be displayed.
- Direction is correct.
- Amount decimals are correct.

### Task 8: Yield collector

Objective: fetch and filter relevant DefiLlama yield pools.

Files:

- Create: `src/collectors/yieldCollector.ts`
- Test: `tests/collectors/yieldCollector.test.ts`

Steps:

1. Test filtering by chain `Mantle` and underlying token address.
2. Sort pools by TVL descending.
3. Keep APY, base APY, reward APY, TVL, project, symbol.
4. Handle missing pools.

Acceptance:

- USDY Ondo pool appears.
- mETH pools appear.
- FBTC pools appear.
- mUSD absence is handled cleanly.

### Task 9: Liquidity warning engine

Objective: compare wallet position size with pool TVL.

Files:

- Create: `src/risk/liquidityWarnings.ts`
- Test: `tests/risk/liquidityWarnings.test.ts`

Rules:

- If position value > 100% of largest relevant pool TVL: high warning.
- If position value > 25% of largest relevant pool TVL: medium warning.
- If pool TVL is unavailable: data warning.

Acceptance:

- The real test wallet produces warnings for mETH/FBTC pool mismatch.
- USDY does not produce the same warning because Ondo Yield Assets TVL is much larger.

### Task 10: Risk feature builder

Objective: convert snapshot and collectors into explicit risk features.

Files:

- Create: `src/risk/riskFeatureBuilder.ts`
- Test: `tests/risk/riskFeatureBuilder.test.ts`

Acceptance:

- Features include concentration, RWA share, ETH LST share, BTC bridge share, oracle dependency, rebasing presence, liquidity warnings, stale history, unknown counterparties.

### Task 11: Risk score engine

Objective: produce deterministic score and level.

Files:

- Create: `src/risk/riskScore.ts`
- Create: `src/risk/riskRules.ts`
- Test: `tests/risk/riskScore.test.ts`

Acceptance:

- Real test wallet is approximately `medium-high`, around score `62` unless rule tuning changes.
- High concentration raises score.
- Diversification lowers score only modestly.
- Score is clamped `0..100`.

### Task 12: Snapshot/report hashing

Objective: compute stable hashes for on-chain proof.

Files:

- Create: `src/storage/snapshotHash.ts`
- Test: `tests/storage/snapshotHash.test.ts`

Rules:

- Canonicalize JSON with sorted keys.
- Hash portfolio facts separately from AI report.
- Use keccak256-compatible hashing for EVM.

Acceptance:

- Same input yields same hash.
- Different balance/score/report changes hash.

### Task 13: AI report generator

Objective: generate human-readable report from structured facts.

Files:

- Create: `src/ai/reportPrompt.ts`
- Create: `src/ai/reportGenerator.ts`
- Create: `src/ai/reportSchema.ts`
- Test: `tests/ai/reportGenerator.test.ts`

Steps:

1. Build schema-first report object.
2. Add mock AI provider for tests.
3. Add real provider only behind environment variable.
4. Enforce “use only provided facts” in prompt.

Acceptance:

- Tests pass without API keys.
- Real AI generation works when key is set.
- Report includes caveats for USDY/mUSD/mETH/FBTC.
- Report mentions liquidity mismatch when present.

### Task 14: Analyze wallet API

Objective: expose full analysis over HTTP.

Files:

- Create or modify API route depending on framework.
- Test: `tests/api/analyzeWallet.test.ts`

Acceptance:

- Invalid wallet returns 400.
- Valid wallet returns snapshot + risk + AI report.
- API handles upstream failures with partial warnings.

### Task 15: Smart contract tests

Objective: implement and test `RWAGuardian.sol`.

Files:

- Create: `contracts/src/RWAGuardian.sol`
- Create: `contracts/test/RWAGuardian.t.sol`
- Create: `contracts/foundry.toml`

Acceptance:

- `forge test` passes.
- Event emitted.
- Invalid inputs revert.

### Task 16: Deploy contract to Mantle Sepolia

Objective: deploy and verify assessment contract.

Files:

- Create: `contracts/script/DeployRWAGuardian.s.sol`
- Create or modify deployment script.

Commands:

```bash
forge script script/DeployRWAGuardian.s.sol \
  --rpc-url $MANTLE_SEPOLIA_RPC_URL \
  --broadcast
```

Acceptance:

- Contract deployed.
- Address saved to `.env` and README.
- Explorer link recorded.
- Verification attempted if explorer/API supports it.

### Task 17: Publish assessment transaction flow

Objective: let frontend publish assessment to contract.

Files:

- Create: `src/api/publishAssessment.ts`
- Frontend transaction component.

Acceptance:

- User wallet signs transaction.
- Contract receives wallet, chain id, score, hashes, summary.
- UI shows tx hash and explorer link.

### Task 18: Frontend analysis UI

Objective: build accessible dashboard.

Files:

- Create frontend components.

Acceptance:

- Wallet input works.
- Example wallet button works.
- Loading/error states are accessible.
- Report displays all key sections.
- Publish button appears when report is ready.

### Task 19: README and setup docs

Objective: document install, run, test, deploy, and demo.

README must include:

- what the project does;
- architecture diagram/text;
- environment variables;
- local setup;
- test commands;
- contract deployment;
- frontend deployment;
- demo wallet;
- known limitations;
- hackathon criteria mapping.

### Task 20: Demo script and video checklist

Objective: prepare hackathon demo.

Demo flow:

1. Open site.
2. Enter example wallet.
3. Show portfolio snapshot.
4. Show risk score `medium-high`.
5. Explain mETH concentration.
6. Explain USDY as accumulating RWA yield.
7. Explain FBTC liquidity/custody risk.
8. Show liquidity mismatch warnings.
9. Publish assessment on Mantle Sepolia.
10. Open explorer transaction.
11. Show contract event/proof.

Acceptance:

- Demo can be completed in under 3 minutes.
- No private keys shown.
- No broken loading states.

---

## 14. Validation commands

Use these as the final gate.

```bash
npm install
npm test
npm run typecheck
npm run analyze:wallet -- 0x588846213a30fd36244e0ae0ebb2374516da836c
npm run verify:assets
cd contracts && forge test
```

If frontend is Next/Vite:

```bash
npm run build
npm run dev
```

Manual checks:

- Analyze invalid address: returns friendly error.
- Analyze test wallet: returns non-empty report.
- Disable DefiLlama temporarily: app returns partial warning, not crash.
- Disable Routescan temporarily: app still returns balances/prices.
- Publish to Sepolia: transaction succeeds.
- Screen-reader/keyboard pass for core UI.

---

## 15. Deployment plan

### Backend/frontend

Recommended options:

- Vercel for frontend/API if using Next.js.
- Railway/Fly/Render if using separate Node backend.
- Static frontend + hosted API is acceptable.

Deployment requirements:

- Set env vars in hosting dashboard.
- Do not expose private keys.
- Public URL works without local machine.
- Demo wallet analysis completes within acceptable latency.

### Contract

- Deploy to Mantle Sepolia first.
- Store deployed address in README and frontend env.
- Verify contract if possible.
- Keep deployment tx hash.

---

## 16. Risks and mitigations

### Routescan API limits or failure

Mitigation:

- cache recent results;
- fallback to no-history warning;
- optionally add `eth_getLogs` fallback later.

### DefiLlama missing mUSD price

Mitigation:

- use `$1 fallback`;
- clearly label source as fallback;
- add future task for mUSD conversion/oracle.

### AI hallucination

Mitigation:

- provide structured JSON only;
- enforce output schema;
- deterministic risk score remains source of truth;
- report hash stores final output.

### Low-TVL pool recommendations

Mitigation:

- liquidity warning engine blocks aggressive recommendations;
- report should say “do not chase yield” when position size dwarfs pool TVL.

### Contract storage costs

Mitigation:

- store hashes and short summary only;
- full report remains off-chain.

### Financial-advice risk

Mitigation:

- explicit disclaimer;
- language: “analysis”, “candidate recommendation”, “risk warning”.

---

## 17. Definition of Done

The project is MVP-complete when:

- `PLAN.md` exists and stays updated.
- Asset registry includes mETH, USDY, mUSD, FBTC.
- Collector returns balances, prices, USD values, yields, transfers, oracle price.
- Risk engine returns deterministic score and findings.
- AI report is generated from structured facts only.
- Frontend analyzes a wallet and displays report accessibly.
- `RWAGuardian.sol` is tested.
- Contract is deployed to Mantle Sepolia.
- User can publish an assessment proof.
- README explains setup/install/deploy/demo.
- Demo wallet works:
  - `0x588846213a30fd36244e0ae0ebb2374516da836c`.
- Final demo shows the key insight:
  - the AI understands portfolio size relative to Mantle liquidity, not just token balances.

---

## 18. Immediate next action

Start with Task 1, then implement collectors before frontend polish. Do not start contract deployment until local tests and the analysis CLI work.

Suggested execution order:

1. Task 1: initialize project.
2. Task 2: asset registry.
3. Task 3: RPC ERC20 reader.
4. Task 4: price collector.
5. Task 5: oracle collector.
6. Task 6: wallet snapshot collector.
7. Task 8: yield collector.
8. Task 7: transfer history collector.
9. Task 9-12: risk and hashing.
10. Task 13-14: AI and API.
11. Task 15-17: contract and publish flow.
12. Task 18-20: frontend, docs, demo.
