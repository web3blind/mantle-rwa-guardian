import { formatUnits } from 'viem';
import { ASSETS, MANTLE_MAINNET_CHAIN_ID, getAssetsForChain } from '../config/assets.js';
import { env } from '../config/env.js';
import { getMantleMainnetClient } from './rpcClient.js';
import type { WalletAssetPosition, WalletSnapshot } from '../types/models.js';
import { assertWalletAddress } from '../utils/address.js';
import { erc20Abi } from '../utils/erc20.js';
import { fetchJson } from '../utils/fetchJson.js';

type PricePayload = { coins?: Record<string, { price?: number }> };

async function loadDefiLlamaPrices(): Promise<Record<string, number>> {
  const ids = ASSETS.filter((asset) => asset.chainId === MANTLE_MAINNET_CHAIN_ID).map((asset) => `mantle:${asset.address}`).join(',');
  try {
    const payload = await fetchJson<PricePayload>(`${env.defiLlamaPricesUrl}/${ids}`);
    return Object.fromEntries(Object.entries(payload.coins ?? {}).map(([key, value]) => [key.toLowerCase(), Number(value.price ?? 0)]));
  } catch {
    return {};
  }
}

export async function collectWalletSnapshot(walletInput: string): Promise<WalletSnapshot> {
  const wallet = assertWalletAddress(walletInput);
  const client = getMantleMainnetClient();
  const [blockNumber, prices] = await Promise.all([client.getBlockNumber(), loadDefiLlamaPrices()]);
  const rawPositions = await Promise.all(getAssetsForChain(MANTLE_MAINNET_CHAIN_ID).map(async (asset) => {
    const balanceRaw = await client.readContract({ address: asset.address, abi: erc20Abi, functionName: 'balanceOf', args: [wallet] });
    const balance = formatUnits(balanceRaw, asset.decimals);
    const priceKey = `mantle:${asset.address}`.toLowerCase();
    const fallbackPrice = asset.symbol === 'mUSD' ? 1 : null;
    const priceUsd = prices[priceKey] || fallbackPrice;
    const valueUsd = priceUsd ? Number(balance) * priceUsd : 0;
    return { asset, balanceRaw, balance, priceUsd, valueUsd };
  }));
  const totalValue = rawPositions.reduce((sum, position) => sum + position.valueUsd, 0);
  const positions: WalletAssetPosition[] = rawPositions
    .filter((position) => position.balanceRaw > 0n)
    .map((position) => ({
      symbol: position.asset.symbol,
      address: position.asset.address,
      balanceRaw: position.balanceRaw,
      balance: position.balance,
      decimals: position.asset.decimals,
      priceUsd: position.priceUsd,
      priceSource: position.priceUsd === 1 && position.asset.symbol === 'mUSD' ? 'usd_fallback' : position.asset.priceStrategy,
      valueUsd: position.valueUsd,
      sharePct: totalValue > 0 ? (position.valueUsd / totalValue) * 100 : 0,
      category: position.asset.category,
      riskTags: position.asset.riskTags
    }));
  return { wallet, chainId: MANTLE_MAINNET_CHAIN_ID, blockNumber, collectedAt: new Date().toISOString(), positions, transfers: [] };
}
