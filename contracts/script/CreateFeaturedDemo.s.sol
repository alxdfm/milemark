// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

/// @notice Mint a **featured 2-of-3** v3 campaign on an already-deployed escrow.
///
/// Live Sepolia campaign id `0` is the original **1-of-1 smoke** exhibit
/// ("MM v3 Demo Quorum", 1+2 USDC, 60s window). This script does **not**
/// rewrite id 0 — it creates the **next** id (`campaignCount` before increment).
///
/// After broadcast, set `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` to the printed id and
/// rebuild the frontend. Keep id 0 labeled as the historical smoke campaign.
///
/// Env (required):
///   PRIVATE_KEY          — sponsor key (must hold + approve USDC)
///   ESCROW_ADDRESS       — MilestoneEscrow v3
///   ATTESTOR_2           — second unique attestor
///   ATTESTOR_3           — third unique attestor
///
/// Env (optional):
///   BENEFICIARY          — defaults to the sponsor
///   ATTESTOR             — first attestor; defaults to the sponsor
///   QUORUM               — default 2 (must be 1..unique attestors)
///   CHALLENGE_WINDOW     — seconds (default 3600 — 1 hour, not the 60s smoke)
///   DEADLINE_SECONDS     — seconds from now (default 30 days)
///
/// Amounts: 3 + 4 + 3 USDC (10 USDC total, 6 decimals). Sponsor must hold at
/// least 10 USDC of `escrow.usdc()`; the script `approve`s the total.
///
/// Sepolia (live v3) — operator must have a funded key:
///
///   cd contracts
///   ESCROW_ADDRESS=0xC5A623f9204D3768DDce4aA34137b1eF75D7ADCC \
///   ATTESTOR_2=0x... ATTESTOR_3=0x... \
///   PRIVATE_KEY=$PRIVATE_KEY \
///   forge script script/CreateFeaturedDemo.s.sol \
///     --rpc-url ${ARB_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc} \
///     --broadcast --chain 421614
///
/// Local Anvil (accounts 1 and 2 as extra attestors):
///
///   ESCROW_ADDRESS=0x... \
///   ATTESTOR_2=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
///   ATTESTOR_3=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
///   PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
///   forge script script/CreateFeaturedDemo.s.sol \
///     --rpc-url http://127.0.0.1:8545 --broadcast
///
/// Equivalent cast (replace $DEADLINE with a unix second strictly in the future):
///
///   cast send $USDC "approve(address,uint256)" $ESCROW 10000000 --private-key $PK --rpc-url $RPC
///   cast send $ESCROW \
///     "createCampaign(address,address[],uint8,string,string,uint64,uint64,string[],uint256[])" \
///     $BENEFICIARY "[$ATTESTOR,$ATTESTOR_2,$ATTESTOR_3]" 2 \
///     "MileMark featured 2-of-3" "https://github.com/alxdfm/milemark" \
///     $DEADLINE 3600 \
///     '["Public demo live on Sepolia","Two attestors reach quorum","Claim after the challenge window"]' \
///     '[3000000,4000000,3000000]' \
///     --private-key $PK --rpc-url $RPC
contract CreateFeaturedDemo is Script {
    uint256 internal constant M1 = 3e6;
    uint256 internal constant M2 = 4e6;
    uint256 internal constant M3 = 3e6;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address sponsor = vm.addr(pk);
        address escrowAddr = vm.envAddress("ESCROW_ADDRESS");
        address beneficiary = vm.envOr("BENEFICIARY", sponsor);
        address attestor = vm.envOr("ATTESTOR", sponsor);
        address attestor2 = vm.envAddress("ATTESTOR_2");
        address attestor3 = vm.envAddress("ATTESTOR_3");
        uint64 window = uint64(vm.envOr("CHALLENGE_WINDOW", uint256(1 hours)));
        uint64 deadlineIn = uint64(vm.envOr("DEADLINE_SECONDS", uint256(30 days)));

        require(attestor2 != address(0) && attestor3 != address(0), "ATTESTOR_2 and ATTESTOR_3 required");
        require(
            attestor != attestor2 && attestor != attestor3 && attestor2 != attestor3,
            "need 3 unique attestors for 2-of-3"
        );

        address[] memory attestors = new address[](3);
        attestors[0] = attestor;
        attestors[1] = attestor2;
        attestors[2] = attestor3;
        uint8 quorum = uint8(vm.envOr("QUORUM", uint256(2)));

        string[] memory descriptions = new string[](3);
        descriptions[0] = "Public demo live on Sepolia";
        descriptions[1] = "Two attestors reach quorum";
        descriptions[2] = "Claim after the challenge window";
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = M1;
        amounts[1] = M2;
        amounts[2] = M3;

        MilestoneEscrow escrow = MilestoneEscrow(escrowAddr);
        IERC20 usdc = escrow.usdc();
        uint64 deadline = uint64(block.timestamp + deadlineIn);

        vm.startBroadcast(pk);
        usdc.approve(escrowAddr, M1 + M2 + M3);
        uint256 id = escrow.createCampaign(
            beneficiary,
            attestors,
            quorum,
            "MileMark featured 2-of-3",
            "https://github.com/alxdfm/milemark",
            deadline,
            window,
            descriptions,
            amounts
        );
        vm.stopBroadcast();

        console.log("Featured campaign id:", id);
        console.log("Set NEXT_PUBLIC_DEMO_CAMPAIGN_ID to this id and rebuild.");
        console.log("Historical smoke campaign id 0 stays the original 1-of-1.");
        console.log("Escrow:", escrowAddr);
        console.log("Sponsor:", sponsor);
        console.log("Beneficiary:", beneficiary);
        console.log("Attestor 1:", attestor);
        console.log("Attestor 2:", attestor2);
        console.log("Attestor 3:", attestor3);
        console.log("Quorum:", quorum);
        console.log("Challenge window (s):", window);
        console.log("Deadline:", deadline);
    }
}
