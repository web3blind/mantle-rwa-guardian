import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, getContractAddress, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepolia } from '../src/config/chains.js';

type Artifact = {
  abi: unknown[];
  bytecode: `0x${string}`;
};

if (!process.env.DEPLOYER_PRIVATE_KEY) {
  throw new Error('DEPLOYER_PRIVATE_KEY is not set');
}

const rpcUrl = process.env.MANTLE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
const artifact = JSON.parse(await readFile('contracts/out/RWAGuardian.json', 'utf8')) as Artifact;

const publicClient = createPublicClient({ chain: mantleSepolia, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain: mantleSepolia, transport: http(rpcUrl) });

const chainId = await publicClient.getChainId();
if (chainId !== mantleSepolia.id) {
  throw new Error(`Unexpected chain id ${chainId}; expected ${mantleSepolia.id}`);
}

const balance = await publicClient.getBalance({ address: account.address });
if (balance === 0n) {
  throw new Error(`Deployer ${account.address} has zero Mantle Sepolia MNT balance`);
}

const nonce = await publicClient.getTransactionCount({ address: account.address });
const predictedAddress = getContractAddress({ from: account.address, nonce: BigInt(nonce) });
const hash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  account,
  chain: mantleSepolia
});

console.log(`tx=${hash}`);
console.log(`predictedAddress=${predictedAddress}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
const deployedAddress = receipt.contractAddress ?? predictedAddress;
if (receipt.status !== 'success') {
  throw new Error(`Deployment failed: ${hash}`);
}
const code = await publicClient.getCode({ address: deployedAddress });
if (!code || code === '0x') {
  throw new Error(`No contract code at ${deployedAddress}`);
}

const deployInfo = {
  network: 'mantle-sepolia',
  chainId,
  deployer: account.address,
  contract: 'RWAGuardian',
  address: deployedAddress,
  txHash: hash,
  blockNumber: receipt.blockNumber.toString(),
  gasUsed: receipt.gasUsed.toString(),
  deployedAt: new Date().toISOString()
};
await writeFile('contracts/deployment.mantle-sepolia.json', `${JSON.stringify(deployInfo, null, 2)}\n`);

let envText = await readFile('.env', 'utf8');
const setEnv = (text: string, key: string, value: string) => {
  const line = `${key}=${value}`;
  return new RegExp(`^${key}=.*$`, 'm').test(text)
    ? text.replace(new RegExp(`^${key}=.*$`, 'm'), line)
    : `${text.trimEnd()}\n${line}\n`;
};
envText = setEnv(envText, 'NEXT_PUBLIC_RWA_GUARDIAN_ADDRESS', deployedAddress);
envText = setEnv(envText, 'RWA_GUARDIAN_DEPLOY_TX', hash);
await writeFile('.env', envText, { mode: 0o600 });

console.log(`deployedAddress=${deployedAddress}`);
console.log(`blockNumber=${receipt.blockNumber}`);
console.log(`gasUsed=${receipt.gasUsed}`);
