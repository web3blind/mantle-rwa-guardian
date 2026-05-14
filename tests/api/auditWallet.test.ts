import { describe, expect, it } from 'vitest';
import { buildPublishInputFromAnalysis } from '../../src/api/auditWallet.js';
import type { WalletAnalysisResult } from '../../src/api/analyzeWallet.js';

const analysis = {
  assessment: {
    wallet: '0x588846213a30fd36244e0ae0ebb2374516da836c',
    chainId: 5000,
    blockNumber: 123n,
    score: 76,
    level: 'high',
    summary: 'A'.repeat(300),
    findings: [],
    recommendations: [],
    features: {},
    portfolioHash: '0x' + '1'.repeat(64),
    reportHash: '0x' + '2'.repeat(64)
  }
} as unknown as WalletAnalysisResult;

describe('buildPublishInputFromAnalysis', () => {
  it('turns an AI analysis into a bounded on-chain publish payload', () => {
    const input = buildPublishInputFromAnalysis(analysis);

    expect(input.wallet).toBe(analysis.assessment.wallet);
    expect(input.sourceChainId).toBe(5000);
    expect(input.riskScore).toBe(76);
    expect(input.portfolioHash).toBe(analysis.assessment.portfolioHash);
    expect(input.reportHash).toBe(analysis.assessment.reportHash);
    expect(input.summary).toHaveLength(280);
  });
});
