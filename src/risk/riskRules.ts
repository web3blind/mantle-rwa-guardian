import type { RiskAssessment, RiskFeatureSet, WalletSnapshot, YieldPoolSummary } from '../types/models.js';
import { hashReport, hashSnapshot } from '../storage/snapshotHash.js';

function riskLevel(score: number): RiskAssessment['level'] {
  if (score < 30) return 'low';
  if (score < 55) return 'medium';
  if (score < 75) return 'medium-high';
  return 'high';
}

export function buildRiskFeatures(snapshot: WalletSnapshot, pools: YieldPoolSummary[] = []): RiskFeatureSet {
  const positions = snapshot.positions;
  const portfolioValueUsd = positions.reduce((sum, position) => sum + position.valueUsd, 0);
  const maxAssetSharePct = positions.reduce((max, position) => Math.max(max, position.sharePct), 0);
  const rwaSharePct = positions
    .filter((position) => position.category === 'rwa_treasury' || position.category === 'rebasing_rwa' || position.category === 'btc_rwa')
    .reduce((sum, position) => sum + position.sharePct, 0);
  const ethLsdSharePct = positions.filter((position) => position.category === 'liquid_staking').reduce((sum, position) => sum + position.sharePct, 0);
  const btcBridgeSharePct = positions.filter((position) => position.category === 'btc_rwa').reduce((sum, position) => sum + position.sharePct, 0);
  const usdRwaSharePct = positions
    .filter((position) => position.category === 'rwa_treasury' || position.category === 'rebasing_rwa')
    .reduce((sum, position) => sum + position.sharePct, 0);

  const lowLiquidityWarnings = positions.flatMap((position) => {
    const matchingPools = pools.filter((pool) => pool.asset.toLowerCase() === position.symbol.toLowerCase());
    const largestPoolTvl = matchingPools.reduce((max, pool) => Math.max(max, pool.tvlUsd), 0);
    if (largestPoolTvl > 0 && position.valueUsd > largestPoolTvl * 5) {
      return [`${position.symbol} position is more than 5x the largest known pool TVL ($${Math.round(largestPoolTvl).toLocaleString('en-US')}).`];
    }
    return [];
  });

  return {
    portfolioValueUsd,
    trackedAssetsCount: positions.length,
    maxAssetSharePct,
    rwaSharePct,
    ethLsdSharePct,
    btcBridgeSharePct,
    usdRwaSharePct,
    hasOracleDependency: positions.some((position) => position.riskTags.includes('oracle')),
    hasRebasingAsset: positions.some((position) => position.riskTags.includes('rebasing')),
    hasBridgeCustodyAsset: positions.some((position) => position.riskTags.includes('bridge') || position.riskTags.includes('custody')),
    hasAccumulatingAsset: positions.some((position) => position.riskTags.includes('accumulating_price')),
    lowLiquidityWarnings,
    unknownCounterpartyWarnings: snapshot.transfers.filter((transfer) => transfer.functionName?.toLowerCase().includes('unknown')).map((transfer) => `Unknown interaction ${transfer.txHash}`),
    staleTransferHistoryWarnings: []
  };
}

export function scoreRisk(snapshot: WalletSnapshot, pools: YieldPoolSummary[] = []): RiskAssessment {
  const features = buildRiskFeatures(snapshot, pools);
  let score = 20;
  if (features.maxAssetSharePct > 70) score += 20;
  else if (features.maxAssetSharePct > 50) score += 12;
  if (features.btcBridgeSharePct > 10) score += 10;
  const usdy = snapshot.positions.find((position) => position.symbol === 'USDY');
  if (usdy && usdy.sharePct > 10) score += 8;
  if (snapshot.positions.some((position) => position.symbol === 'mUSD')) score += 5;
  if (features.lowLiquidityWarnings.length > 0) score += 8;
  if (features.unknownCounterpartyWarnings.length > 0) score += 5;
  if (snapshot.positions.some((position) => position.priceSource.includes('fallback'))) score += 5;
  if (features.trackedAssetsCount >= 3 && features.maxAssetSharePct <= 50) score -= 5;
  score = Math.max(0, Math.min(100, score));

  const findings: string[] = [];
  const top = [...snapshot.positions].sort((a, b) => b.sharePct - a.sharePct)[0];
  if (top) findings.push(`${top.symbol} is the largest exposure at ${top.sharePct.toFixed(1)}% of tracked portfolio value.`);
  if (features.hasAccumulatingAsset) findings.push('USDY is an accumulating RWA token, not a flat $1 stablecoin.');
  if (features.hasBridgeCustodyAsset) findings.push('FBTC introduces bridge/custody/proof-of-reserve risk and should not be treated as native BTC.');
  findings.push(...features.lowLiquidityWarnings);

  const recommendations = [
    'Review concentration before adding more exposure to the largest asset.',
    'Compare position size with pool TVL before using any yield opportunity.',
    'Publish only hashes and the score on-chain; keep the full report off-chain.'
  ];
  const summary = `Risk score ${score}/100 (${riskLevel(score)}). Portfolio value from tracked assets: $${Math.round(features.portfolioValueUsd).toLocaleString('en-US')}.`;
  return {
    wallet: snapshot.wallet,
    chainId: snapshot.chainId,
    blockNumber: snapshot.blockNumber,
    score,
    level: riskLevel(score),
    summary,
    findings,
    recommendations,
    features,
    portfolioHash: hashSnapshot(snapshot),
    reportHash: hashReport([summary, ...findings, ...recommendations].join('\n'))
  };
}
