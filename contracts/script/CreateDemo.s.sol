// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

/// @notice Create a small v3 **1-of-1 smoke** campaign on an already-deployed escrow.
///
/// Live Sepolia campaign id `0` is a **hand-crafted** 1-of-1 (title
/// "MM v3 Demo Quorum", 1+2 USDC, 60s window) — not this script's defaults.
/// Running this script against the live v3 address mints the **next** id.
///
/// For a judge-facing **2-of-3 featured** exhibit (1h window, 3 miles, 10 USDC)
/// use `script/CreateFeaturedDemo.s.sol` instead. Do not point
/// `NEXT_PUBLIC_DEMO_CAMPAIGN_ID` at id 0 and call it 2-of-3.
///
/// Env:
///   PRIVATE_KEY          — sponsor key (must hold + approve USDC)
///   ESCROW_ADDRESS       — MilestoneEscrow v3
///   BENEFICIARY          — optional; defaults to the sponsor
///   ATTESTOR             — optional; defaults to the sponsor (1-of-1)
///   ATTESTOR_2           — optional second attestor; if set, quorum becomes 2
///   QUORUM               — optional override (default 1, or 2 when ATTESTOR_2 is set)
///   CHALLENGE_WINDOW     — seconds (default 60 — short for live demos)
///   DEADLINE_SECONDS     — seconds from now (default 7 days)
///
/// Amounts: 4 + 6 USDC (testnet-friendly). Sponsor must hold at least 10 USDC
/// and the script will `approve` the escrow for the total.
contract CreateDemo is Script {
    uint256 internal constant M1 = 4e6;
    uint256 internal constant M2 = 6e6;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address sponsor = vm.addr(pk);
        address escrowAddr = vm.envAddress("ESCROW_ADDRESS");
        address beneficiary = vm.envOr("BENEFICIARY", sponsor);
        address attestor = vm.envOr("ATTESTOR", sponsor);
        address attestor2 = vm.envOr("ATTESTOR_2", address(0));
        uint64 window = uint64(vm.envOr("CHALLENGE_WINDOW", uint256(60)));
        uint64 deadlineIn = uint64(vm.envOr("DEADLINE_SECONDS", uint256(7 days)));

        address[] memory attestors;
        uint8 defaultQuorum = 1;
        if (attestor2 != address(0) && attestor2 != attestor) {
            attestors = new address[](2);
            attestors[0] = attestor;
            attestors[1] = attestor2;
            defaultQuorum = 2;
        } else {
            attestors = new address[](1);
            attestors[0] = attestor;
        }
        uint8 quorum = uint8(vm.envOr("QUORUM", uint256(defaultQuorum)));

        string[] memory descriptions = new string[](2);
        descriptions[0] = "Ship public demo";
        descriptions[1] = "Judge walkthrough";
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = M1;
        amounts[1] = M2;

        MilestoneEscrow escrow = MilestoneEscrow(escrowAddr);
        IERC20 usdc = escrow.usdc();
        uint64 deadline = uint64(block.timestamp + deadlineIn);

        vm.startBroadcast(pk);
        usdc.approve(escrowAddr, M1 + M2);
        uint256 id = escrow.createCampaign(
            beneficiary,
            attestors,
            quorum,
            "MileMark v3 demo",
            "https://github.com/alxdfm/milemark",
            deadline,
            window,
            descriptions,
            amounts
        );
        vm.stopBroadcast();

        console.log("Demo campaign id:", id);
        console.log("Escrow:", escrowAddr);
        console.log("Sponsor:", sponsor);
        console.log("Beneficiary:", beneficiary);
        console.log("Quorum:", quorum);
        console.log("Challenge window (s):", window);
        console.log("Deadline:", deadline);
    }
}
