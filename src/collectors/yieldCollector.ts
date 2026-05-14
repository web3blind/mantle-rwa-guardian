import { env } from '../config/env.js';
import type { YieldPoolSummary } from '../types/models.js';
import { fetchJson } from '../utils/fetchJson.js';

type DefiLlamaPool = { chain?: string; project?: string; symbol?: string; tvlUsd?: number; apy?: number; apyBase?: number; apyReward?: number; pool?: string };
type DefiLlamaPayload = { data?: DefiLlamaPool[] };

const TRACKED_SYMBOLS = ['METH', 'USDY', 'MUSD', 'FBTC'];

export async function collectYieldPools(): Promise<YieldPoolSummary[]> {
  const payload = await fetchJson<DefiLlamaPayload>(env.defiLlamaYieldsUrl);
  return (payload.data ?? [])
    .filter((pool) => pool.chain?.toLowerCase() === 'mantle')
    .filter((pool) => TRACKED_SYMBOLS.some((symbol) => (pool.symbol ?? '').toUpperCase().includes(symbol)))
    .map((pool) => ({
      asset: TRACKED_SYMBOLS.find((symbol) => (pool.symbol ?? '').toUpperCase().includes(symbol)) ?? 'unknown',
      project: pool.project ?? 'unknown',
      symbol: pool.symbol ?? 'unknown',
      tvlUsd: Number(pool.tvlUsd ?? 0),
      apy: pool.apy ?? null,
      apyBase: pool.apyBase ?? null,
      apyReward: pool.apyReward ?? null,
      poolId: pool.pool ?? 'unknown'
    }))
    .sort((a, b) => b.tvlUsd - a.tvlUsd);
}
