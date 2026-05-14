import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeAuditCacheForTests, readCachedAudit, writeCachedAudit } from '../../src/storage/auditCache.js';
import type { AuditWalletResult } from '../../src/api/auditWallet.js';

function fakeResult(): AuditWalletResult {
  return {
    generatedAt: '2026-05-14T00:00:00.000Z',
    snapshot: {
      wallet: '0x588846213a30fd36244e0ae0ebb2374516da836c',
      chainId: 5000,
      blockNumber: 123n,
      collectedAt: '2026-05-14T00:00:00.000Z',
      positions: [],
      transfers: []
    },
    pools: [],
    assessment: {
      wallet: '0x588846213a30fd36244e0ae0ebb2374516da836c',
      chainId: 5000,
      blockNumber: 123n,
      score: 42,
      level: 'medium',
      summary: 'summary',
      findings: [],
      recommendations: [],
      features: {
        portfolioValueUsd: 0,
        trackedAssetsCount: 0,
        maxAssetSharePct: 0,
        rwaSharePct: 0,
        ethLsdSharePct: 0,
        btcBridgeSharePct: 0,
        usdRwaSharePct: 0,
        hasOracleDependency: false,
        hasRebasingAsset: false,
        hasBridgeCustodyAsset: false,
        hasAccumulatingAsset: false,
        lowLiquidityWarnings: [],
        unknownCounterpartyWarnings: [],
        staleTransferHistoryWarnings: []
      },
      portfolioHash: `0x${'1'.repeat(64)}`,
      reportHash: `0x${'2'.repeat(64)}`
    },
    report: {
      summary: 'summary',
      markdown: '# Report',
      caveats: [],
      model: 'test/model',
      source: 'llm'
    },
    publication: {
      contract: '0x46a1dca82461427fe095b8ae33859e89c55dd1dc',
      wallet: '0x588846213a30fd36244e0ae0ebb2374516da836c',
      riskScore: 42,
      portfolioHash: `0x${'1'.repeat(64)}`,
      reportHash: `0x${'2'.repeat(64)}`,
      txHash: `0x${'3'.repeat(64)}`,
      blockNumber: '456',
      assessmentCount: '7',
      explorerUrl: `https://explorer.sepolia.mantle.xyz/tx/0x${'3'.repeat(64)}`
    },
    cache: {
      hit: false,
      ttlSeconds: 3600,
      auditedAt: '2026-05-14T00:00:00.000Z',
      expiresAt: '2026-05-14T01:00:00.000Z'
    }
  };
}

describe('audit cache', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rwa-audit-cache-'));

  afterEach(() => {
    closeAuditCacheForTests();
    vi.unstubAllEnvs();
    rmSync(dir, { recursive: true, force: true });
  });

  it('stores a wallet audit until the TTL expires', () => {
    vi.stubEnv('AUDIT_CACHE_DB_PATH', join(dir, 'cache.sqlite'));
    const now = new Date('2026-05-14T00:00:00.000Z');
    const result = fakeResult();

    const written = writeCachedAudit(result, 3600, now);
    const hit = readCachedAudit(result.assessment.wallet, new Date('2026-05-14T00:30:00.000Z'));
    const miss = readCachedAudit(result.assessment.wallet, new Date('2026-05-14T01:01:00.000Z'));

    expect(written.expiresAt).toBe('2026-05-14T01:00:00.000Z');
    expect(hit?.txHash).toBe(result.publication.txHash);
    expect(hit?.result.publication.txHash).toBe(result.publication.txHash);
    expect(miss).toBeNull();
  });
});
