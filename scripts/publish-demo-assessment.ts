import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, http, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepolia } from '../src/config/chains.js';
import { hashReport } from '../src/storage/snapshotHash.js';

type Artifact = { abi: unknown[] };

if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error('DEPLOYER_PRIVATE_KEY is not set');
if (!process.env.NEXT_PUBLIC_RWA_GUARDIAN_ADDRESS) throw new Error('NEXT_PUBLIC_RWA_GUARDIAN_ADDRESS is not set');

const artifact = JSON.parse(await readFile('contracts/out/RWAGuardian.json', 'utf8')) as Artifact;
const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
const contractAddress = process.env.NEXT_PUBLIC_RWA_GUARDIAN_ADDRESS as `0x${string}`;
const publicClient = createPublicClient({ chain: mantleSepolia, transport: http(process.env.MANTLE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.mantle.xyz') });
const walletClient = createWalletClient({ account, chain: mantleSepolia, transport: http(process.env.MANTLE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.mantle.xyz') });

const wallet = (process.argv[2] ?? '0x588846213a30fd36244e0ae0ebb2374516da836c') as `0x${string}`;
const riskScore = Number(process.argv[3] ?? 76);
const summary = process.argv[4] ?? 'Demo AI assessment: high RWA/LST concentration; review mETH and FBTC liquidity before reallocating.';
const portfolioHash = hashReport(`${wallet}:mantle-mainnet:demo-portfolio`);
const reportHash = hashReport(summary);

const hash = await walletClient.writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: 'publishAssessment',
  args: [wallet, 5000n, riskScore, portfolioHash, reportHash, summary],
  account,
  chain: mantleSepolia
});

const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
if (receipt.status !== 'success') throw new Error(`Publish failed: ${hash}`);
const count = await publicClient.readContract({ address: contractAddress, abi: artifact.abi, functionName: 'assessmentCount' }) as bigint;
const info = {
  contract: contractAddress,
  wallet,
  riskScore,
  portfolioHash,
  reportHash,
  txHash: hash,
  blockNumber: receipt.blockNumber.toString(),
  assessmentCount: count.toString(),
  publishedAt: new Date().toISOString()
};
await writeFile('contracts/demo-assessment.mantle-sepolia.json', `${JSON.stringify(info, null, 2)}\n`);
console.log(JSON.stringify(info, null, 2));
