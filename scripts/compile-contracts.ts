import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import solc from 'solc';

const contractPath = path.resolve('contracts/src/RWAGuardian.sol');
const source = await readFile(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'RWAGuardian.sol': { content: source }
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((entry: { severity: string }) => entry.severity === 'error');
if (errors.length > 0) {
  for (const error of errors) console.error(error.formattedMessage);
  process.exit(1);
}

const compiled = output.contracts['RWAGuardian.sol'].RWAGuardian;
const artifact = {
  contractName: 'RWAGuardian',
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
  compiler: solc.version()
};

await mkdir('contracts/out', { recursive: true });
await writeFile('contracts/out/RWAGuardian.json', `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Compiled RWAGuardian with ${artifact.abi.length} ABI entries using solc ${artifact.compiler}`);
