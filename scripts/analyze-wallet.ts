import { collectWalletSnapshot } from '../src/collectors/walletSnapshotCollector.js';
import { collectYieldPools } from '../src/collectors/yieldCollector.js';
import { scoreRisk } from '../src/risk/riskRules.js';

const wallet = process.argv[2] ?? '0x588846213a30fd36244e0ae0ebb2374516da836c';
const snapshot = await collectWalletSnapshot(wallet);
const pools = await collectYieldPools().catch(() => []);
const assessment = scoreRisk(snapshot, pools);
console.log(JSON.stringify({ snapshot, assessment }, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2));
