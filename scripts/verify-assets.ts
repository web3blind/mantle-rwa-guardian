import { getAssetsForChain, MANTLE_MAINNET_CHAIN_ID, MANTLE_SEPOLIA_CHAIN_ID } from '../src/config/assets.js';
import { getMantleMainnetClient, getMantleSepoliaClient } from '../src/collectors/rpcClient.js';
import { erc20Abi } from '../src/utils/erc20.js';

async function verify(chainId: number) {
  const client = chainId === MANTLE_MAINNET_CHAIN_ID ? getMantleMainnetClient() : getMantleSepoliaClient();
  for (const asset of getAssetsForChain(chainId)) {
    const [symbol, decimals] = await Promise.all([
      client.readContract({ address: asset.address, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address: asset.address, abi: erc20Abi, functionName: 'decimals' })
    ]);
    const ok = symbol.toUpperCase() === asset.symbol.toUpperCase() && decimals === asset.decimals;
    console.log(`${ok ? 'OK' : 'MISMATCH'} chain=${chainId} ${asset.symbol} ${asset.address} liveSymbol=${symbol} liveDecimals=${decimals}`);
    if (!ok) process.exitCode = 1;
  }
}

await verify(MANTLE_MAINNET_CHAIN_ID);
await verify(MANTLE_SEPOLIA_CHAIN_ID);
