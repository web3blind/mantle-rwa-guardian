# Verify RWAGuardian on Mantle Sepolia

Contract address:

```text
0x46a1dca82461427fe095b8ae33859e89c55dd1dc
```

Explorer:

```text
https://sepolia.mantlescan.xyz/address/0x46a1dca82461427fe095b8ae33859e89c55dd1dc#code
```

Deployment tx:

```text
0x6fc22d5e810af40d810ea7d960a321463ebfd1a56efcbc30b28ae8f1b938b57d
```

## Preferred path: Standard JSON Input

1. Open Mantle Sepolia contract verification page for the address above.
2. Select verification method: **Solidity Standard-Json-Input** / **Standard JSON Input**.
3. Compiler version: **v0.8.35+commit.47b9dedd**.
4. Optimization: **enabled**.
5. Optimizer runs: **200**.
6. EVM version: leave **default** unless MantleScan requires a value.
7. Constructor arguments: leave **empty**. `RWAGuardian` has no constructor.
8. Upload/paste the file:

```text
contracts/standard-input.json
```

9. Complete captcha and submit.

## Fallback path: Single File

If Standard JSON is rejected, use:

```text
contracts/src/RWAGuardian.sol
```

Settings for Single File:

- Contract name: `RWAGuardian`
- Compiler: `v0.8.35+commit.47b9dedd`
- License: `MIT`
- Optimization: enabled
- Runs: `200`
- Constructor arguments: empty

## Notes

- I could not finish this automatically because MantleScan required a Cloudflare Turnstile/captcha response.
- The contract has already been deployed and used successfully; verification is only source-code publication in the explorer.
