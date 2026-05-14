import 'dotenv/config';

export const env = {
  mantleMainnetRpcUrl: process.env.MANTLE_MAINNET_RPC_URL || 'https://rpc.mantle.xyz',
  mantleSepoliaRpcUrl: process.env.MANTLE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.mantle.xyz',
  routescanMantleApiUrl: process.env.ROUTESCAN_MANTLE_API_URL || 'https://api.routescan.io/v2/network/mainnet/evm/5000/etherscan/api',
  defiLlamaPricesUrl: process.env.DEFILLAMA_PRICES_URL || 'https://coins.llama.fi/prices/current',
  defiLlamaYieldsUrl: process.env.DEFILLAMA_YIELDS_URL || 'https://yields.llama.fi/pools',
  deployerAddress: process.env.DEPLOYER_ADDRESS,
  deployTargetNetwork: process.env.DEPLOY_TARGET_NETWORK || 'mantle-sepolia'
};
