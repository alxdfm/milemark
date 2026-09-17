// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice Deploy MilestoneEscrow to Anvil or Arbitrum Sepolia.
///
/// Env:
///   PRIVATE_KEY          — deployer key (never commit this)
///   USDC_ADDRESS         — token to escrow. On Arbitrum Sepolia use Circle USDC
///                          `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
///                          (see https://developers.circle.com/stablecoins/usdc-on-test-networks).
///                          Omit and set DEPLOY_MOCK_USDC=true for local Anvil.
///   DEPLOY_MOCK_USDC     — if "true", deploys MockERC20 and uses it as USDC.
///
/// Example (Anvil):
///   DEPLOY_MOCK_USDC=true PRIVATE_KEY=0xac09... forge script script/Deploy.s.sol \
///     --rpc-url http://127.0.0.1:8545 --broadcast
///
/// Example (Arbitrum Sepolia):
///   USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d \
///   PRIVATE_KEY=$PRIVATE_KEY forge script script/Deploy.s.sol \
///     --rpc-url $ARB_SEPOLIA_RPC_URL --broadcast --verify
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        bool deployMock = vm.envOr("DEPLOY_MOCK_USDC", false);

        vm.startBroadcast(pk);

        address usdc;
        if (deployMock) {
            MockERC20 mock = new MockERC20();
            usdc = address(mock);
            console.log("MockERC20 (local USDC):", usdc);
        } else {
            usdc = vm.envAddress("USDC_ADDRESS");
            console.log("Using existing USDC:", usdc);
        }

        MilestoneEscrow escrow = new MilestoneEscrow(usdc);
        console.log("MilestoneEscrow:", address(escrow));

        vm.stopBroadcast();
    }
}
