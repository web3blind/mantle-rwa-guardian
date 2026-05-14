import type { RiskAssessment, WalletSnapshot, YieldPoolSummary } from '../types/models.js';

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  cost_details?: {
    upstream_inference_cost?: number;
  };
}

export interface GeneratedReport {
  summary: string;
  markdown: string;
  caveats: string[];
  model: string;
  source: 'llm' | 'deterministic-fallback';
  usage?: OpenRouterUsage;
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: OpenRouterUsage;
}

function usd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function bestPoolsFor(asset: string, pools: YieldPoolSummary[]): YieldPoolSummary[] {
  return pools
    .filter((pool) => pool.asset.toLowerCase() === asset.toLowerCase())
    .sort((left, right) => right.tvlUsd - left.tvlUsd)
    .slice(0, 3);
}

export function generateDeterministicReport(
  snapshot: WalletSnapshot,
  assessment: RiskAssessment,
  pools: YieldPoolSummary[] = []
): GeneratedReport {
  const topPositions = [...snapshot.positions].sort((left, right) => right.valueUsd - left.valueUsd);
  const caveats = [
    'This is risk/yield analysis, not financial advice.',
    'Pool APY and TVL can change quickly; verify live values before taking action.',
    'Only mETH, USDY, mUSD, and FBTC positions are tracked in this MVP.'
  ];

  const assetSections = topPositions.map((position) => {
    const matchingPools = bestPoolsFor(position.symbol, pools);
    const poolLines = matchingPools.length > 0
      ? matchingPools.map((pool) => `  - ${pool.project}: ${pool.apy === null ? 'APY n/a' : `${pool.apy.toFixed(2)}% APY`}, TVL ${usd(pool.tvlUsd)}`).join('\n')
      : '  - No sufficiently visible Mantle yield pool found in DefiLlama for this asset.';
    return `- ${position.symbol}: ${position.balance} (${usd(position.valueUsd)}, ${pct(position.sharePct)}).\n${poolLines}`;
  });

  const summary = `Risk score ${assessment.score}/100 (${assessment.level}) for ${snapshot.wallet}. Tracked value: ${usd(assessment.features.portfolioValueUsd)}.`;
  const markdown = [
    `# Mantle RWA Guardian report`,
    '',
    summary,
    '',
    '## Key findings',
    ...assessment.findings.map((finding) => `- ${finding}`),
    '',
    '## Asset and yield context',
    ...assetSections,
    '',
    '## Recommendations',
    ...assessment.recommendations.map((recommendation) => `- ${recommendation}`),
    '',
    '## Caveats',
    ...caveats.map((caveat) => `- ${caveat}`)
  ].join('\n');

  return { summary, markdown, caveats, model: 'deterministic-mvp', source: 'deterministic-fallback' };
}

function compactPromptPayload(snapshot: WalletSnapshot, assessment: RiskAssessment, pools: YieldPoolSummary[]) {
  return {
    wallet: snapshot.wallet,
    chainId: snapshot.chainId,
    blockNumber: snapshot.blockNumber.toString(),
    positions: snapshot.positions.map((position) => ({
      symbol: position.symbol,
      balance: position.balance,
      valueUsd: Math.round(position.valueUsd),
      sharePct: Number(position.sharePct.toFixed(1)),
      category: position.category,
      riskTags: position.riskTags
    })),
    risk: {
      score: assessment.score,
      level: assessment.level,
      findings: assessment.findings,
      recommendations: assessment.recommendations,
      features: assessment.features
    },
    yieldPools: pools.slice(0, 12).map((pool) => ({
      asset: pool.asset,
      project: pool.project,
      tvlUsd: Math.round(pool.tvlUsd),
      apy: pool.apy,
      warning: pool.liquidityWarning ?? null
    }))
  };
}

function normalizeAiMarkdown(content: string, fallback: GeneratedReport): string {
  const trimmed = content.trim();
  if (!trimmed) return fallback.markdown;
  return trimmed.includes('not financial advice')
    ? trimmed
    : `${trimmed}\n\n## Caveats\n- This is risk/yield analysis, not financial advice.`;
}

export async function generateAiReport(
  snapshot: WalletSnapshot,
  assessment: RiskAssessment,
  pools: YieldPoolSummary[] = [],
  fetchImpl: typeof fetch = fetch
): Promise<GeneratedReport> {
  const fallback = generateDeterministicReport(snapshot, assessment, pools);
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL || 'openai/gpt-4.1-mini';
  if (!apiKey) return fallback;

  try {
    const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'http-referer': 'https://mantle-rwa-guardian.local',
        'x-title': 'Mantle RWA Guardian'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are Mantle RWA Guardian, an AI risk analyst agent. Write concise markdown for a crypto hackathon demo. Use only the provided data. Do not invent balances, APY, prices, or protocols. Include risk reasoning, yield context, recommendations, and a not-financial-advice caveat.'
          },
          {
            role: 'user',
            content: JSON.stringify(compactPromptPayload(snapshot, assessment, pools))
          }
        ]
      })
    });
    if (!response.ok) return fallback;
    const data = await response.json() as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallback;
    if (data.usage) {
      console.log('[ai-usage]', JSON.stringify({
        model,
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        cost: data.usage.cost
      }));
    }
    return {
      summary: fallback.summary,
      markdown: normalizeAiMarkdown(content, fallback),
      caveats: fallback.caveats,
      model,
      source: 'llm',
      usage: data.usage
    };
  } catch {
    return fallback;
  }
}
