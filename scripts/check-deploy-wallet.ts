import 'dotenv/config';
import { createPublicClient, formatEther, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepolia } from '../src/config/chains.js';

if (!process.env.DEPLOYER_PRIVATE_KEY) {
  throw new Error('DEPLOYER_PRIVATE_KEY is not set');
}

const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
const client = createPublicClient({
  chain: mantleSepolia,
  transport: http(process.env.MANTLE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.mantle.xyz')
});

const [chainId, balance, blockNumber] = await Promise.all([
  client.getChainId(),
  client.getBalance({ address: account.address }),
  client.getBlockNumber()
]);

console.log(JSON.stringify({
  address: account.address,
  chainId,
  blockNumber: blockNumber.toString(),
  balanceMnt: formatEther(balance)
}, null, 2));
