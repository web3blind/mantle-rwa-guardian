import { scoreRisk } from '../src/risk/riskRules.js';
import type { WalletSnapshot, YieldPoolSummary } from '../src/types/models.js';

const snapshot: WalletSnapshot = {
  wallet: '0x588846213a30fd36244e0ae0ebb2374516da836c',
  chainId: 5000,
  blockNumber: 1n,
  collectedAt: new Date().toISOString(),
  positions: [
    { symbol: 'mETH', address: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0', balanceRaw: 1n, balance: '1011.5', decimals: 18, priceUsd: 2000, priceSource: 'defillama', valueUsd: 2023000, sharePct: 70.2, category: 'liquid_staking', riskTags: ['staking', 'oracle', 'liquidity'] },
    { symbol: 'USDY', address: '0x5bE26527e817998A7206475496fDE1E68957c5A6', balanceRaw: 1n, balance: '281000', decimals: 18, priceUsd: 1.13, priceSource: 'oracle', valueUsd: 317530, sharePct: 11.0, category: 'rwa_treasury', riskTags: ['accumulating_price', 'oracle', 'liquidity'] },
    { symbol: 'FBTC', address: '0xC96dE26018A54D51c097160568752c4E3BD6C364', balanceRaw: 1n, balance: '5.0', decimals: 8, priceUsd: 100000, priceSource: 'defillama', valueUsd: 500000, sharePct: 17.4, category: 'btc_rwa', riskTags: ['bridge', 'custody', 'proof_of_reserve', 'liquidity'] }
  ],
  transfers: []
};
const pools: YieldPoolSummary[] = [{ asset: 'mETH', project: 'Example', symbol: 'mETH', tvlUsd: 250000, apy: 3.2, apyBase: 3.2, apyReward: null, poolId: 'demo' }];
console.log(JSON.stringify(scoreRisk(snapshot, pools), (_, value) => typeof value === 'bigint' ? value.toString() : value, 2));
