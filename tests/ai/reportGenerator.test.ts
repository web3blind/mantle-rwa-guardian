import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateAiReport } from '../../src/ai/reportGenerator.js';
import { scoreRisk } from '../../src/risk/riskRules.js';
import type { WalletSnapshot, YieldPoolSummary } from '../../src/types/models.js';

const snapshot: WalletSnapshot = {
  wallet: '0x588846213a30fd36244e0ae0ebb2374516da836c',
  chainId: 5000,
  blockNumber: 123n,
  collectedAt: '2026-05-14T00:00:00.000Z',
  transfers: [],
  positions: [
    {
      symbol: 'USDY',
      address: '0x5bE26527e817998A7206475496fDE1E68957c5A6',
      balanceRaw: 5000n,
      balance: '5000',
      decimals: 18,
      priceUsd: 1.1,
      priceSource: 'defillama',
      valueUsd: 5500,
      sharePct: 100,
      category: 'rwa_treasury',
      riskTags: ['oracle', 'accumulating_price']
    }
  ]
};

const pools: YieldPoolSummary[] = [
  { asset: 'USDY', project: 'ondo-yield-assets', symbol: 'USDY', tvlUsd: 1000000, apy: 3.5, apyBase: 3.5, apyReward: null, poolId: 'pool-2' }
];

const assessment = scoreRisk(snapshot, pools);

describe('generateAiReport', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the LLM response when OpenRouter is configured', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubEnv('AI_MODEL', 'test/model');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '# AI report\nUSDY risk analysis.\n\nThis is not financial advice.' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, cost: 0.00018 }
      })
    })) as unknown as typeof fetch;

    const report = await generateAiReport(snapshot, assessment, pools, fetchMock);

    expect(report.source).toBe('llm');
    expect(report.model).toBe('test/model');
    expect(report.markdown).toContain('AI report');
    expect(report.usage?.cost).toBe(0.00018);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('falls back to deterministic report without an API key', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const fetchMock = vi.fn() as unknown as typeof fetch;

    const report = await generateAiReport(snapshot, assessment, pools, fetchMock);

    expect(report.source).toBe('deterministic-fallback');
    expect(report.markdown).toContain('Mantle RWA Guardian report');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
