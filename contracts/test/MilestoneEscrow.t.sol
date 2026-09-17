// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract MilestoneEscrowTest is Test {
    MilestoneEscrow internal escrow;
    MockERC20 internal usdc;

    address internal sponsor = makeAddr("sponsor");
    address internal beneficiary = makeAddr("beneficiary");
    address internal attestor = makeAddr("attestor");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant M1 = 100e6;
    uint256 internal constant M2 = 250e6;
    uint256 internal constant M3 = 150e6;
    uint256 internal constant TOTAL = M1 + M2 + M3;

    function setUp() public {
        usdc = new MockERC20();
        escrow = new MilestoneEscrow(address(usdc));

        usdc.mint(sponsor, 1_000_000e6);
        vm.prank(sponsor);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function _createDefault() internal returns (uint256 campaignId) {
        string[] memory descriptions = new string[](3);
        descriptions[0] = "Ship MVP";
        descriptions[1] = "Pass audit";
        descriptions[2] = "Mainnet launch";

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = M1;
        amounts[1] = M2;
        amounts[2] = M3;

        vm.prank(sponsor);
        campaignId = escrow.createCampaign(beneficiary, attestor, descriptions, amounts);
    }

    function test_createCampaign_pullsTotalUsdc() public {
        uint256 beforeSponsor = usdc.balanceOf(sponsor);
        uint256 beforeEscrow = usdc.balanceOf(address(escrow));

        uint256 id = _createDefault();

        assertEq(id, 0);
        assertEq(escrow.campaignCount(), 1);
        assertEq(usdc.balanceOf(sponsor), beforeSponsor - TOTAL);
        assertEq(usdc.balanceOf(address(escrow)), beforeEscrow + TOTAL);

        (
            address gotSponsor,
            address gotBeneficiary,
            address gotAttestor,
            uint256 count,
            uint256 createdAt,
            uint256 claimable
        ) = escrow.getCampaign(id);

        assertEq(gotSponsor, sponsor);
        assertEq(gotBeneficiary, beneficiary);
        assertEq(gotAttestor, attestor);
        assertEq(count, 3);
        assertGt(createdAt, 0);
        assertEq(claimable, 0);

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertEq(list.length, 3);
        assertEq(list[0].description, "Ship MVP");
        assertEq(list[0].amount, M1);
        assertFalse(list[0].completed);
        assertFalse(list[0].claimed);
    }

    function test_createCampaign_emitsCampaignCreated() public {
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Done";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = M1;

        vm.expectEmit(true, true, true, true);
        emit MilestoneEscrow.CampaignCreated(0, sponsor, beneficiary, attestor, M1);

        vm.prank(sponsor);
        escrow.createCampaign(beneficiary, attestor, descriptions, amounts);
    }

    function test_onlyAttestorCanComplete() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.completeMilestone(id, 0);

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertTrue(list[0].completed);
        assertFalse(list[1].completed);
    }

    function test_unauthorizedCompleteReverts() public {
        uint256 id = _createDefault();

        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.completeMilestone(id, 0);

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.completeMilestone(id, 0);

        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.completeMilestone(id, 1);
    }

    function test_claim_releasesCorrectAmount() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.completeMilestone(id, 0);
        vm.prank(attestor);
        escrow.completeMilestone(id, 2);

        uint256 before = usdc.balanceOf(beneficiary);
        vm.prank(beneficiary);
        escrow.claim(id);

        assertEq(usdc.balanceOf(beneficiary), before + M1 + M3);
        assertEq(usdc.balanceOf(address(escrow)), TOTAL - M1 - M3);
        assertEq(escrow.claimableAmount(id), 0);

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertTrue(list[0].claimed);
        assertFalse(list[1].completed);
        assertFalse(list[1].claimed);
        assertTrue(list[2].claimed);
    }

    function test_claim_emitsClaimed() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 1);

        vm.expectEmit(true, true, false, true);
        emit MilestoneEscrow.Claimed(id, beneficiary, M2);

        vm.prank(beneficiary);
        escrow.claim(id);
    }

    function test_doubleClaimReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 0);

        vm.prank(beneficiary);
        escrow.claim(id);

        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.NothingToClaim.selector);
        escrow.claim(id);
    }

    function test_claim_withoutCompletedReverts() public {
        uint256 id = _createDefault();
        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.NothingToClaim.selector);
        escrow.claim(id);
    }

    function test_claim_notBeneficiaryReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 0);

        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.NotBeneficiary.selector);
        escrow.claim(id);
    }

    function test_complete_anyOrder() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.completeMilestone(id, 2);

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertFalse(list[0].completed);
        assertFalse(list[1].completed);
        assertTrue(list[2].completed);
        assertEq(escrow.claimableAmount(id), M3);
    }

    function test_complete_twiceReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 0);

        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.AlreadyCompleted.selector);
        escrow.completeMilestone(id, 0);
    }

    function test_create_revertsOnBadInputs() public {
        string[] memory descriptions = new string[](1);
        descriptions[0] = "A";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = M1;

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        escrow.createCampaign(address(0), attestor, descriptions, amounts);

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        escrow.createCampaign(beneficiary, address(0), descriptions, amounts);

        string[] memory emptyDesc = new string[](0);
        uint256[] memory emptyAmt = new uint256[](0);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.EmptyMilestones.selector);
        escrow.createCampaign(beneficiary, attestor, emptyDesc, emptyAmt);

        uint256[] memory two = new uint256[](2);
        two[0] = M1;
        two[1] = M2;
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.LengthMismatch.selector);
        escrow.createCampaign(beneficiary, attestor, descriptions, two);

        uint256[] memory zero = new uint256[](1);
        zero[0] = 0;
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAmount.selector);
        escrow.createCampaign(beneficiary, attestor, descriptions, zero);
    }

    function test_unknownCampaignReverts() public {
        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.completeMilestone(99, 0);

        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.claim(99);

        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.getCampaign(0);
    }

    function test_invalidIndexReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.InvalidIndex.selector);
        escrow.completeMilestone(id, 3);
    }

    function test_constructorRejectsZeroUsdc() public {
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        new MilestoneEscrow(address(0));
    }

    function test_claimAfterLaterCompletion() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.completeMilestone(id, 0);
        vm.prank(beneficiary);
        escrow.claim(id);

        vm.prank(attestor);
        escrow.completeMilestone(id, 1);
        vm.prank(beneficiary);
        escrow.claim(id);

        assertEq(usdc.balanceOf(beneficiary), M1 + M2);
    }
}
