export const MANTLE_MAINNET_CHAIN_ID = 5000;
export const MANTLE_SEPOLIA_CHAIN_ID = 5003;

export type AssetCategory = 'liquid_staking' | 'rwa_treasury' | 'rebasing_rwa' | 'btc_rwa';

export type RiskTag =
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

export interface AssetRegistryEntry {
  chainId: number;
  symbol: 'mETH' | 'USDY' | 'mUSD' | 'FBTC';
  address: `0x${string}`;
  decimals: number;
  category: AssetCategory;
  riskTags: RiskTag[];
  priceStrategy: 'defillama' | 'oracle' | 'usd_fallback';
}

export const ASSETS: AssetRegistryEntry[] = [
  {
    chainId: MANTLE_MAINNET_CHAIN_ID,
    symbol: 'mETH',
    address: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
    decimals: 18,
    category: 'liquid_staking',
    riskTags: ['staking', 'validator', 'withdrawal_buffer', 'oracle', 'bridge', 'liquidity'],
    priceStrategy: 'defillama'
  },
  {
    chainId: MANTLE_MAINNET_CHAIN_ID,
    symbol: 'USDY',
    address: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
    decimals: 18,
    category: 'rwa_treasury',
    riskTags: ['accumulating_price', 'oracle', 'blocklist_possible', 'liquidity'],
    priceStrategy: 'oracle'
  },
  {
    chainId: MANTLE_MAINNET_CHAIN_ID,
    symbol: 'mUSD',
    address: '0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3',
    decimals: 18,
    category: 'rebasing_rwa',
    riskTags: ['rebasing', 'oracle', 'liquidity'],
    priceStrategy: 'usd_fallback'
  },
  {
    chainId: MANTLE_MAINNET_CHAIN_ID,
    symbol: 'FBTC',
    address: '0xC96dE26018A54D51c097160568752c4E3BD6C364',
    decimals: 8,
    category: 'btc_rwa',
    riskTags: ['bridge', 'custody', 'proof_of_reserve', 'liquidity'],
    priceStrategy: 'defillama'
  },
  {
    chainId: MANTLE_SEPOLIA_CHAIN_ID,
    symbol: 'mETH',
    address: '0x9EF6f9160Ba00B6621e5CB3217BB8b54a92B2828',
    decimals: 18,
    category: 'liquid_staking',
    riskTags: ['staking', 'validator', 'withdrawal_buffer', 'oracle', 'bridge', 'liquidity'],
    priceStrategy: 'defillama'
  },
  {
    chainId: MANTLE_SEPOLIA_CHAIN_ID,
    symbol: 'FBTC',
    address: '0x037017580b1Ed99952a006b5197592B1AA08A166',
    decimals: 8,
    category: 'btc_rwa',
    riskTags: ['bridge', 'custody', 'proof_of_reserve', 'liquidity'],
    priceStrategy: 'defillama'
  }
];

export function getAssetsForChain(chainId: number): AssetRegistryEntry[] {
  return ASSETS.filter((asset) => asset.chainId === chainId);
}

export function getAssetBySymbol(chainId: number, symbol: AssetRegistryEntry['symbol']): AssetRegistryEntry | undefined {
  return ASSETS.find((asset) => asset.chainId === chainId && asset.symbol === symbol);
}
