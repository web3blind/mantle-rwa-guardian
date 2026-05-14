// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/RWAGuardian.sol";

contract DeployRWAGuardian is Script {
    function run() external returns (RWAGuardian guardian) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        guardian = new RWAGuardian();
        vm.stopBroadcast();
    }
}
