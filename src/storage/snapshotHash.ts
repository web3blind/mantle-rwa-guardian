import { keccak256, toBytes } from 'viem';

function normalizeForJson(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalizeForJson(nested)])
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalizeForJson(value));
}

export function hashSnapshot(snapshot: unknown): `0x${string}` {
  return keccak256(toBytes(stableJson(snapshot)));
}

export function hashReport(report: string): `0x${string}` {
  return keccak256(toBytes(report));
}
