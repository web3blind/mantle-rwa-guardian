import { describe, expect, it } from 'vitest';
import { hashReport, hashSnapshot } from '../../src/storage/snapshotHash.js';

describe('snapshot hashing', () => {
  it('creates stable 32-byte hashes independent of object key order', () => {
    const first = hashSnapshot({ wallet: '0x1', chainId: 5000, nested: { b: 2, a: 1 } });
    const second = hashSnapshot({ nested: { a: 1, b: 2 }, chainId: 5000, wallet: '0x1' });
    expect(first).toBe(second);
    expect(first).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('hashes report text for on-chain anchoring', () => {
    expect(hashReport('Risk score: 62')).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
