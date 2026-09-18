// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice Deploy MilestoneEscrow **v3** to Anvil or Arbitrum Sepolia.
///         v3 ABI is incompatible with v2 (`0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`)
///         and v1 (`0x72b474DB34268281CD10db655cc1517C33973049`). Always a new address.
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
///
/// After deploy, optionally create a small 1-of-1 smoke campaign:
///   ESCROW_ADDRESS=0x... forge script script/CreateDemo.s.sol --rpc-url $RPC --broadcast
/// Featured 2-of-3 (requires ATTESTOR_2 + ATTESTOR_3):
///   ESCROW_ADDRESS=0x... forge script script/CreateFeaturedDemo.s.sol --rpc-url $RPC --broadcast
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
        console.log("MilestoneEscrow v3:", address(escrow));

        vm.stopBroadcast();
    }
}
