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
    address internal attestor2 = makeAddr("attestor2");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant M1 = 100e6;
    uint256 internal constant M2 = 250e6;
    uint256 internal constant M3 = 150e6;
    uint256 internal constant TOTAL = M1 + M2 + M3;

    uint64 internal deadline;

    function setUp() public {
        usdc = new MockERC20();
        escrow = new MilestoneEscrow(address(usdc));
        deadline = uint64(block.timestamp + 30 days);

        usdc.mint(sponsor, 1_000_000e6);
        vm.prank(sponsor);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function _one(address a) internal pure returns (address[] memory list) {
        list = new address[](1);
        list[0] = a;
    }

    function _two(address a, address b) internal pure returns (address[] memory list) {
        list = new address[](2);
        list[0] = a;
        list[1] = b;
    }

    function _miles()
        internal
        pure
        returns (string[] memory descriptions, uint256[] memory amounts)
    {
        descriptions = new string[](3);
        descriptions[0] = "Ship MVP";
        descriptions[1] = "Pass audit";
        descriptions[2] = "Mainnet launch";
        amounts = new uint256[](3);
        amounts[0] = M1;
        amounts[1] = M2;
        amounts[2] = M3;
    }

    function _createDefault() internal returns (uint256 campaignId) {
        (string[] memory descriptions, uint256[] memory amounts) = _miles();
        vm.prank(sponsor);
        campaignId = escrow.createCampaign(
            beneficiary,
            _one(attestor),
            "Ship MVP",
            "ipfs://brief",
            deadline,
            descriptions,
            amounts
        );
    }

    function test_createCampaign_pullsTotalUsdcAndStoresMetadata() public {
        uint256 beforeSponsor = usdc.balanceOf(sponsor);
        uint256 beforeEscrow = usdc.balanceOf(address(escrow));

        uint256 id = _createDefault();

        assertEq(id, 0);
        assertEq(escrow.campaignCount(), 1);
        assertEq(usdc.balanceOf(sponsor), beforeSponsor - TOTAL);
        assertEq(usdc.balanceOf(address(escrow)), beforeEscrow + TOTAL);

        MilestoneEscrow.CampaignView memory view_ = escrow.getCampaign(id);

        assertEq(view_.sponsor, sponsor);
        assertEq(view_.beneficiary, beneficiary);
        assertEq(view_.title, "Ship MVP");
        assertEq(view_.briefURI, "ipfs://brief");
        assertEq(view_.deadline, deadline);
        assertEq(view_.milestoneCount, 3);
        assertGt(view_.createdAt, 0);
        assertEq(view_.claimable, 0);
        assertEq(view_.reclaimable, 0);

        assertTrue(escrow.isAttestor(id, attestor));
        assertFalse(escrow.isAttestor(id, stranger));
        address[] memory attestors = escrow.getAttestors(id);
        assertEq(attestors.length, 1);
        assertEq(attestors[0], attestor);

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertEq(list.length, 3);
        assertEq(list[0].description, "Ship MVP");
        assertEq(list[0].amount, M1);
        assertEq(list[0].evidenceURI, "");
        assertFalse(list[0].completed);
        assertFalse(list[0].claimed);
        assertFalse(list[0].reclaimed);
    }

    function test_createCampaign_emitsCampaignCreated() public {
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Done";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = M1;

        vm.expectEmit(true, true, true, true);
        emit MilestoneEscrow.CampaignCreated(0, sponsor, beneficiary, M1, deadline);

        vm.prank(sponsor);
        escrow.createCampaign(
            beneficiary, _one(attestor), "T", "", deadline, descriptions, amounts
        );
    }

    function test_createCampaign_dedupesAttestors() public {
        (string[] memory descriptions, uint256[] memory amounts) = _miles();
        address[] memory dupes = new address[](3);
        dupes[0] = attestor;
        dupes[1] = attestor;
        dupes[2] = attestor2;

        vm.prank(sponsor);
        uint256 id = escrow.createCampaign(
            beneficiary, dupes, "Dedupe", "", deadline, descriptions, amounts
        );

        address[] memory list = escrow.getAttestors(id);
        assertEq(list.length, 2);
        assertTrue(escrow.isAttestor(id, attestor));
        assertTrue(escrow.isAttestor(id, attestor2));
    }

    function test_onlyListedAttestorsCanComplete() public {
        (string[] memory descriptions, uint256[] memory amounts) = _miles();
        vm.prank(sponsor);
        uint256 id = escrow.createCampaign(
            beneficiary, _two(attestor, attestor2), "Set", "", deadline, descriptions, amounts
        );

        vm.prank(attestor);
        escrow.completeMilestone(id, 0, "ipfs://ev0");
        vm.prank(attestor2);
        escrow.completeMilestone(id, 2, "https://example.com/note");

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertTrue(list[0].completed);
        assertEq(list[0].evidenceURI, "ipfs://ev0");
        assertFalse(list[1].completed);
        assertTrue(list[2].completed);
        assertEq(list[2].evidenceURI, "https://example.com/note");
    }

    function test_unauthorizedCompleteReverts() public {
        uint256 id = _createDefault();

        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.completeMilestone(id, 0, "");

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.completeMilestone(id, 0, "");

        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.completeMilestone(id, 1, "");
    }

    function test_complete_storesEmptyEvidence() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 1, "");
        assertEq(escrow.getMilestones(id)[1].evidenceURI, "");
        assertTrue(escrow.getMilestones(id)[1].completed);
    }

    function test_complete_emitsMilestoneCompleted() public {
        uint256 id = _createDefault();
        vm.expectEmit(true, true, true, true);
        emit MilestoneEscrow.MilestoneCompleted(id, 0, attestor, "ipfs://e");
        vm.prank(attestor);
        escrow.completeMilestone(id, 0, "ipfs://e");
    }

    function test_claim_releasesCorrectAmount() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.completeMilestone(id, 0, "");
        vm.prank(attestor);
        escrow.completeMilestone(id, 2, "");

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
        escrow.completeMilestone(id, 1, "");

        vm.expectEmit(true, true, false, true);
        emit MilestoneEscrow.Claimed(id, beneficiary, M2);

        vm.prank(beneficiary);
        escrow.claim(id);
    }

    function test_doubleClaimReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 0, "");

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
        escrow.completeMilestone(id, 0, "");

        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.NotBeneficiary.selector);
        escrow.claim(id);
    }

    function test_complete_anyOrder() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.completeMilestone(id, 2, "later-first");

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertFalse(list[0].completed);
        assertFalse(list[1].completed);
        assertTrue(list[2].completed);
        assertEq(escrow.claimableAmount(id), M3);
    }

    function test_complete_twiceReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 0, "");

        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.AlreadyCompleted.selector);
        escrow.completeMilestone(id, 0, "");
    }

    function test_create_revertsOnBadInputs() public {
        string[] memory descriptions = new string[](1);
        descriptions[0] = "A";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = M1;

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        escrow.createCampaign(
            address(0), _one(attestor), "T", "", deadline, descriptions, amounts
        );

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        escrow.createCampaign(
            beneficiary, _one(address(0)), "T", "", deadline, descriptions, amounts
        );

        address[] memory emptyAtt = new address[](0);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.EmptyAttestors.selector);
        escrow.createCampaign(beneficiary, emptyAtt, "T", "", deadline, descriptions, amounts);

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.DeadlineInPast.selector);
        escrow.createCampaign(
            beneficiary, _one(attestor), "T", "", uint64(block.timestamp), descriptions, amounts
        );

        string[] memory emptyDesc = new string[](0);
        uint256[] memory emptyAmt = new uint256[](0);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.EmptyMilestones.selector);
        escrow.createCampaign(
            beneficiary, _one(attestor), "T", "", deadline, emptyDesc, emptyAmt
        );

        uint256[] memory two = new uint256[](2);
        two[0] = M1;
        two[1] = M2;
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.LengthMismatch.selector);
        escrow.createCampaign(beneficiary, _one(attestor), "T", "", deadline, descriptions, two);

        uint256[] memory zero = new uint256[](1);
        zero[0] = 0;
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAmount.selector);
        escrow.createCampaign(beneficiary, _one(attestor), "T", "", deadline, descriptions, zero);
    }

    function test_unknownCampaignReverts() public {
        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.completeMilestone(99, 0, "");

        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.claim(99);

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.reclaim(99);

        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.getCampaign(0);
    }

    function test_invalidIndexReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.InvalidIndex.selector);
        escrow.completeMilestone(id, 3, "");
    }

    function test_constructorRejectsZeroUsdc() public {
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        new MilestoneEscrow(address(0));
    }

    function test_claimAfterLaterCompletion() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.completeMilestone(id, 0, "");
        vm.prank(beneficiary);
        escrow.claim(id);

        vm.prank(attestor);
        escrow.completeMilestone(id, 1, "");
        vm.prank(beneficiary);
        escrow.claim(id);

        assertEq(usdc.balanceOf(beneficiary), M1 + M2);
    }

    function test_reclaim_beforeDeadlineReverts() public {
        uint256 id = _createDefault();
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.DeadlineNotPassed.selector);
        escrow.reclaim(id);
        assertEq(escrow.reclaimableAmount(id), 0);
    }

    function test_reclaim_notSponsorReverts() public {
        uint256 id = _createDefault();
        vm.warp(uint256(deadline) + 1);
        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.NotSponsor.selector);
        escrow.reclaim(id);
    }

    function test_reclaim_afterDeadlinePullsIncompleteOnly() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 0, "done");

        vm.warp(uint256(deadline) + 1);
        assertEq(escrow.reclaimableAmount(id), M2 + M3);
        assertEq(escrow.claimableAmount(id), M1);

        uint256 beforeSponsor = usdc.balanceOf(sponsor);
        uint256 beforeBen = usdc.balanceOf(beneficiary);

        vm.expectEmit(true, true, false, true);
        emit MilestoneEscrow.Reclaimed(id, sponsor, M2 + M3);
        vm.prank(sponsor);
        escrow.reclaim(id);

        assertEq(usdc.balanceOf(sponsor), beforeSponsor + M2 + M3);

        vm.prank(beneficiary);
        escrow.claim(id);
        assertEq(usdc.balanceOf(beneficiary), beforeBen + M1);

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertTrue(list[0].claimed);
        assertTrue(list[1].reclaimed);
        assertTrue(list[2].reclaimed);
        assertEq(escrow.reclaimableAmount(id), 0);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_reclaim_nothingLeftReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.completeMilestone(id, 0, "");
        vm.prank(attestor);
        escrow.completeMilestone(id, 1, "");
        vm.prank(attestor);
        escrow.completeMilestone(id, 2, "");

        vm.warp(uint256(deadline) + 1);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.NothingToReclaim.selector);
        escrow.reclaim(id);
    }

    function test_complete_afterReclaimReverts() public {
        uint256 id = _createDefault();
        vm.warp(uint256(deadline) + 1);
        vm.prank(sponsor);
        escrow.reclaim(id);

        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.AlreadyReclaimed.selector);
        escrow.completeMilestone(id, 0, "");
    }

    function test_complete_afterDeadlineBeforeReclaimOk() public {
        uint256 id = _createDefault();
        vm.warp(uint256(deadline) + 1);
        vm.prank(attestor);
        escrow.completeMilestone(id, 1, "late");
        assertEq(escrow.claimableAmount(id), M2);
        assertEq(escrow.reclaimableAmount(id), M1 + M3);
    }

    function test_doubleReclaimReverts() public {
        uint256 id = _createDefault();
        vm.warp(uint256(deadline) + 1);
        vm.prank(sponsor);
        escrow.reclaim(id);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.NothingToReclaim.selector);
        escrow.reclaim(id);
    }
}
