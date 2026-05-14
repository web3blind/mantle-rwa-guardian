import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepolia } from '../config/chains.js';
import { assertWalletAddress } from '../utils/address.js';

interface Artifact { abi: unknown[] }

export interface PublishAssessmentInput {
  wallet: string;
  sourceChainId?: number;
  riskScore: number;
  portfolioHash: `0x${string}`;
  reportHash: `0x${string}`;
  summary: string;
}

export interface PublishAssessmentResult {
  contract: `0x${string}`;
  wallet: `0x${string}`;
  riskScore: number;
  portfolioHash: `0x${string}`;
  reportHash: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber: string;
  assessmentCount: string;
  explorerUrl: string;
}

function requireHex32(value: string, label: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) throw new Error(`${label} must be a bytes32 hex string`);
  return value as `0x${string}`;
}

export function normalizePublishInput(input: PublishAssessmentInput): Required<PublishAssessmentInput> {
  const wallet = assertWalletAddress(input.wallet);
  if (!Number.isInteger(input.riskScore) || input.riskScore < 0 || input.riskScore > 100) {
    throw new Error('riskScore must be an integer from 0 to 100');
  }
  if (!input.summary || input.summary.length > 280) throw new Error('summary is required and must be <= 280 characters');
  return {
    wallet,
    sourceChainId: input.sourceChainId ?? 5000,
    riskScore: input.riskScore,
    portfolioHash: requireHex32(input.portfolioHash, 'portfolioHash'),
    reportHash: requireHex32(input.reportHash, 'reportHash'),
    summary: input.summary
  };
}

export async function publishAssessment(input: PublishAssessmentInput): Promise<PublishAssessmentResult> {
  const normalized = normalizePublishInput(input);
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
  const contractAddress = process.env.NEXT_PUBLIC_RWA_GUARDIAN_ADDRESS as `0x${string}` | undefined;
  if (!privateKey) throw new Error('DEPLOYER_PRIVATE_KEY is not set');
  if (!contractAddress) throw new Error('NEXT_PUBLIC_RWA_GUARDIAN_ADDRESS is not set');

  const artifact = JSON.parse(await readFile('contracts/out/RWAGuardian.json', 'utf8')) as Artifact;
  const account = privateKeyToAccount(privateKey);
  const transport = http(process.env.MANTLE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.mantle.xyz');
  const publicClient = createPublicClient({ chain: mantleSepolia, transport });
  const walletClient = createWalletClient({ account, chain: mantleSepolia, transport });

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'publishAssessment',
    args: [normalized.wallet, BigInt(normalized.sourceChainId), normalized.riskScore, normalized.portfolioHash, normalized.reportHash, normalized.summary],
    account,
    chain: mantleSepolia
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
  if (receipt.status !== 'success') throw new Error(`Publish failed: ${txHash}`);
  const assessmentCount = await publicClient.readContract({ address: contractAddress, abi: artifact.abi, functionName: 'assessmentCount' }) as bigint;
  return {
    contract: contractAddress,
    wallet: normalized.wallet as `0x${string}`,
    riskScore: normalized.riskScore,
    portfolioHash: normalized.portfolioHash,
    reportHash: normalized.reportHash,
    txHash,
    blockNumber: receipt.blockNumber.toString(),
    assessmentCount: assessmentCount.toString(),
    explorerUrl: `https://explorer.sepolia.mantle.xyz/tx/${txHash}`
  };
}
