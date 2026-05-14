import { describe, expect, it } from 'vitest';
import { buildWalletAnalysisResult } from '../../src/api/analyzeWallet.js';
import type { WalletSnapshot, YieldPoolSummary } from '../../src/types/models.js';

const snapshot: WalletSnapshot = {
  wallet: '0x588846213a30fd36244e0ae0ebb2374516da836c',
  chainId: 5000,
  blockNumber: 123n,
  collectedAt: '2026-05-14T00:00:00.000Z',
  transfers: [],
  positions: [
    {
      symbol: 'mETH',
      address: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
      balanceRaw: 10n,
      balance: '10',
      decimals: 18,
      priceUsd: 2500,
      priceSource: 'defillama',
      valueUsd: 25000,
      sharePct: 83.3,
      category: 'liquid_staking',
      riskTags: ['staking', 'bridge']
    },
    {
      symbol: 'USDY',
      address: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
      balanceRaw: 5000n,
      balance: '5000',
      decimals: 18,
      priceUsd: 1.1,
      priceSource: 'defillama',
      valueUsd: 5500,
      sharePct: 16.7,
      category: 'rwa_treasury',
      riskTags: ['oracle', 'accumulating_price']
    }
  ]
};

const pools: YieldPoolSummary[] = [
  { asset: 'mETH', project: 'lendle-pooled-markets', symbol: 'METH', tvlUsd: 1000, apy: 0.5, apyBase: 0.5, apyReward: null, poolId: 'pool-1' },
  { asset: 'USDY', project: 'ondo-yield-assets', symbol: 'USDY', tvlUsd: 1000000, apy: 3.5, apyBase: 3.5, apyReward: null, poolId: 'pool-2' }
];

describe('buildWalletAnalysisResult', () => {
  it('builds a deterministic analysis with report and on-chain hashes', () => {
    const result = buildWalletAnalysisResult(snapshot, pools, '2026-05-14T00:00:00.000Z');

    expect(result.assessment.score).toBeGreaterThan(50);
    expect(result.assessment.portfolioHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.assessment.reportHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.report.markdown).toContain('Mantle RWA Guardian report');
    expect(result.report.markdown).toContain('not financial advice');
    expect(result.pools).toHaveLength(2);
  });
});
