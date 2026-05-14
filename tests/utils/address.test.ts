import { describe, expect, it } from 'vitest';
import { assertWalletAddress, normalizeWalletAddress } from '../../src/utils/address.js';

describe('wallet address validation', () => {
  it('normalizes valid EVM wallet addresses', () => {
    expect(normalizeWalletAddress('0x7ec2adFd40548c87458Ba838CaBb3DCF98609bD5')).toBe('0x7ec2adfd40548c87458ba838cabb3dcf98609bd5');
  });

  it('rejects malformed wallet addresses before network calls', () => {
    expect(() => assertWalletAddress('not-a-wallet')).toThrow('Invalid EVM wallet address');
    expect(() => assertWalletAddress('0x0000000000000000000000000000000000000000')).toThrow('Zero address is not allowed');
  });
});
