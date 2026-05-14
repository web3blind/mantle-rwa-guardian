# Mantle RWA Guardian — Hackathon Submission Text

## Short description

Mantle RWA Guardian is an AI risk and yield copilot for Mantle wallets that hold real-world-asset and yield-bearing tokens. It analyzes real Mantle Mainnet exposure, explains the portfolio in plain language, and publishes a verifiable assessment hash to a Mantle Sepolia proof contract.

## Problem

RWA and yield-bearing assets are becoming more useful on-chain, but a wallet balance alone does not tell users whether their exposure is concentrated, stale, illiquid, or hard to verify. Users need a readable audit, not just token rows.

## Solution

Mantle RWA Guardian turns a wallet address into a judge-ready audit flow:

1. Reads live Mantle Mainnet wallet data.
2. Detects tracked RWA and yield-bearing exposure such as mETH, USDY, mUSD, and FBTC.
3. Applies deterministic risk scoring to make the result reproducible.
4. Generates a human-readable AI report for risk and yield context.
5. Publishes portfolio/report hashes to a Mantle Sepolia proof contract.
6. Shows copyable proof details: transaction, contract, wallet, portfolio hash, and report hash.

## Why it matters for Mantle

Mantle can be a strong home for real yield and RWA-style products, but mainstream users need confidence and explainability. This project demonstrates a pattern where real Mainnet portfolio data becomes a clear AI report, and the integrity of that assessment is anchored on-chain.

## Demo flow

Open the live app, keep the prefilled demo wallet, and press **Run audit and publish proof**. The result page shows the risk score, tracked positions, AI agent report, and a Mantle Sepolia proof trail with copy buttons for every important field.

## What is built

- Live web app: https://mantleguardian.xyz
- Source code: https://github.com/web3blind/mantle-rwa-guardian
- Demo wallet: `0x588846213a30fd36244e0ae0ebb2374516da836c`
- Proof contract: `0x46a1dca82461427fe095b8ae33859e89c55dd1dc`
- Stack: Node.js 22, Viem, SQLite, vanilla accessible UI, Mantle Mainnet RPC, Mantle Sepolia proof contract.

## MVP boundary

The MVP intentionally focuses on one clear path: real wallet audit, explainable AI report, and verifiable proof. Production extensions would include more assets, historical charts, alerts, multi-wallet monitoring, deeper oracle/liquidity/bridge risk modules, and optionally a Mantle Mainnet proof deployment.

## One-liner

Mantle RWA Guardian makes RWA portfolio risk readable for users and verifiable on-chain for everyone else.
