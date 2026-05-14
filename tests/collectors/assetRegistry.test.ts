import { describe, expect, it } from 'vitest';
import { getAssetsForChain, getAssetBySymbol, MANTLE_MAINNET_CHAIN_ID, MANTLE_SEPOLIA_CHAIN_ID } from '../../src/config/assets.js';

describe('Mantle asset registry', () => {
  it('contains the four required Mantle mainnet assets with correct decimals', () => {
    const assets = getAssetsForChain(MANTLE_MAINNET_CHAIN_ID);
    expect(assets.map((asset) => asset.symbol).sort()).toEqual(['FBTC', 'mETH', 'mUSD', 'USDY'].sort());
    expect(getAssetBySymbol(MANTLE_MAINNET_CHAIN_ID, 'mETH')?.decimals).toBe(18);
    expect(getAssetBySymbol(MANTLE_MAINNET_CHAIN_ID, 'USDY')?.decimals).toBe(18);
    expect(getAssetBySymbol(MANTLE_MAINNET_CHAIN_ID, 'mUSD')?.decimals).toBe(18);
    expect(getAssetBySymbol(MANTLE_MAINNET_CHAIN_ID, 'FBTC')?.decimals).toBe(8);
  });

  it('tags asset semantics needed by the risk engine', () => {
    expect(getAssetBySymbol(MANTLE_MAINNET_CHAIN_ID, 'USDY')?.riskTags).toContain('accumulating_price');
    expect(getAssetBySymbol(MANTLE_MAINNET_CHAIN_ID, 'mUSD')?.riskTags).toContain('rebasing');
    expect(getAssetBySymbol(MANTLE_MAINNET_CHAIN_ID, 'mETH')?.riskTags).toContain('staking');
    expect(getAssetBySymbol(MANTLE_MAINNET_CHAIN_ID, 'FBTC')?.riskTags).toContain('proof_of_reserve');
  });

  it('contains Sepolia test assets for deployment demos', () => {
    const assets = getAssetsForChain(MANTLE_SEPOLIA_CHAIN_ID);
    expect(assets.map((asset) => asset.symbol).sort()).toEqual(['FBTC', 'mETH'].sort());
  });
});
