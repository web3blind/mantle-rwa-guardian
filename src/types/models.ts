import type { AssetCategory, RiskTag } from '../config/assets.js';

export interface WalletAssetPosition {
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

export interface TransferEventSummary {
  asset: string;
  date: string;
  direction: 'in' | 'out' | 'self';
  amount: string;
  counterparty: `0x${string}`;
  functionName?: string;
  txHash: `0x${string}`;
}

export interface YieldPoolSummary {
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

export interface WalletSnapshot {
  wallet: `0x${string}`;
  chainId: number;
  blockNumber: bigint;
  collectedAt: string;
  positions: WalletAssetPosition[];
  transfers: TransferEventSummary[];
}

export interface RiskFeatureSet {
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

export interface RiskAssessment {
  wallet: `0x${string}`;
  chainId: number;
  blockNumber: bigint;
  score: number;
  level: 'low' | 'medium' | 'medium-high' | 'high';
  summary: string;
  findings: string[];
  recommendations: string[];
  features: RiskFeatureSet;
  portfolioHash: `0x${string}`;
  reportHash: `0x${string}`;
}
