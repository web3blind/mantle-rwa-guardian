import { collectWalletSnapshot } from '../collectors/walletSnapshotCollector.js';
import { collectYieldPools } from '../collectors/yieldCollector.js';
import { generateAiReport, generateDeterministicReport, type GeneratedReport } from '../ai/reportGenerator.js';
import { scoreRisk } from '../risk/riskRules.js';
import { hashReport } from '../storage/snapshotHash.js';
import type { RiskAssessment, WalletSnapshot, YieldPoolSummary } from '../types/models.js';

export interface WalletAnalysisResult {
  snapshot: WalletSnapshot;
  pools: YieldPoolSummary[];
  assessment: RiskAssessment;
  report: GeneratedReport;
  generatedAt: string;
}

function poolsForPositions(snapshot: WalletSnapshot, pools: YieldPoolSummary[]): YieldPoolSummary[] {
  const held = new Set(snapshot.positions.map((position) => position.symbol.toUpperCase()));
  return pools.filter((pool) => held.has(pool.asset.toUpperCase())).slice(0, 12);
}

export function buildWalletAnalysisResult(
  snapshot: WalletSnapshot,
  allPools: YieldPoolSummary[] = [],
  generatedAt = new Date().toISOString()
): WalletAnalysisResult {
  const pools = poolsForPositions(snapshot, allPools);
  const baseAssessment = scoreRisk(snapshot, pools);
  const report = generateDeterministicReport(snapshot, baseAssessment, pools);
  const assessment: RiskAssessment = {
    ...baseAssessment,
    summary: report.summary,
    reportHash: hashReport(report.markdown)
  };
  return { snapshot, pools, assessment, report, generatedAt };
}

export async function buildAiWalletAnalysisResult(
  snapshot: WalletSnapshot,
  allPools: YieldPoolSummary[] = [],
  generatedAt = new Date().toISOString()
): Promise<WalletAnalysisResult> {
  const base = buildWalletAnalysisResult(snapshot, allPools, generatedAt);
  const report = await generateAiReport(snapshot, base.assessment, base.pools);
  const assessment: RiskAssessment = {
    ...base.assessment,
    summary: report.summary,
    reportHash: hashReport(report.markdown)
  };
  return { ...base, assessment, report };
}

export async function analyzeWallet(wallet: string): Promise<WalletAnalysisResult> {
  const [snapshot, pools] = await Promise.all([
    collectWalletSnapshot(wallet),
    collectYieldPools().catch(() => [])
  ]);
  return buildAiWalletAnalysisResult(snapshot, pools);
}
