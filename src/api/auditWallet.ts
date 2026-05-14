import { analyzeWallet, type WalletAnalysisResult } from './analyzeWallet.js';
import { publishAssessment, type PublishAssessmentInput, type PublishAssessmentResult } from './publishAssessment.js';
import { assertWalletAddress } from '../utils/address.js';
import { getAuditCacheTtlSeconds, readCachedAudit, writeCachedAudit, type AuditCacheMetadata } from '../storage/auditCache.js';

export interface AuditWalletResult extends WalletAnalysisResult {
  publication: PublishAssessmentResult;
  cache: AuditCacheMetadata;
}

const inFlightAudits = new Map<string, Promise<AuditWalletResult>>();

export function buildPublishInputFromAnalysis(analysis: WalletAnalysisResult): PublishAssessmentInput {
  return {
    wallet: analysis.assessment.wallet,
    sourceChainId: analysis.assessment.chainId,
    riskScore: analysis.assessment.score,
    portfolioHash: analysis.assessment.portfolioHash,
    reportHash: analysis.assessment.reportHash,
    summary: analysis.assessment.summary.slice(0, 280)
  };
}

async function runFreshAudit(wallet: `0x${string}`): Promise<AuditWalletResult> {
  const analysis = await analyzeWallet(wallet);
  const publication = await publishAssessment(buildPublishInputFromAnalysis(analysis));
  const cached = writeCachedAudit({
    ...analysis,
    publication,
    cache: {
      hit: false,
      ttlSeconds: getAuditCacheTtlSeconds(),
      auditedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString()
    }
  });
  return {
    ...analysis,
    publication,
    cache: {
      hit: false,
      ttlSeconds: getAuditCacheTtlSeconds(),
      auditedAt: cached.auditedAt,
      expiresAt: cached.expiresAt
    }
  };
}

export async function auditWallet(wallet: string): Promise<AuditWalletResult> {
  const normalizedWallet = assertWalletAddress(wallet);
  const ttlSeconds = getAuditCacheTtlSeconds();
  const cached = readCachedAudit(normalizedWallet);
  if (cached) {
    return {
      ...cached.result,
      cache: {
        hit: true,
        ttlSeconds,
        auditedAt: cached.auditedAt,
        expiresAt: cached.expiresAt
      }
    };
  }

  const existing = inFlightAudits.get(normalizedWallet);
  if (existing) return existing;

  const pending = runFreshAudit(normalizedWallet).finally(() => {
    inFlightAudits.delete(normalizedWallet);
  });
  inFlightAudits.set(normalizedWallet, pending);
  return pending;
}
