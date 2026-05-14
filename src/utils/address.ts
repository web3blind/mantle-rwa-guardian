import { isAddress, zeroAddress } from 'viem';

export function normalizeWalletAddress(input: string): `0x${string}` {
  const trimmed = input.trim();
  if (!isAddress(trimmed)) {
    throw new Error('Invalid EVM wallet address');
  }
  const normalized = trimmed.toLowerCase() as `0x${string}`;
  if (normalized === zeroAddress) {
    throw new Error('Zero address is not allowed');
  }
  return normalized;
}

export function assertWalletAddress(input: string): `0x${string}` {
  return normalizeWalletAddress(input);
}
