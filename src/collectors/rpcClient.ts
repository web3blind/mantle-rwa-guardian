import { createPublicClient, http } from 'viem';
import { mantleMainnet, mantleSepolia } from '../config/chains.js';
import { env } from '../config/env.js';

export function getMantleMainnetClient() {
  return createPublicClient({ chain: mantleMainnet, transport: http(env.mantleMainnetRpcUrl) });
}

export function getMantleSepoliaClient() {
  return createPublicClient({ chain: mantleSepolia, transport: http(env.mantleSepoliaRpcUrl) });
}
