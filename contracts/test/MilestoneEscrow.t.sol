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
    address internal attestor3 = makeAddr("attestor3");
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

    function _three(address a, address b, address c) internal pure returns (address[] memory list) {
        list = new address[](3);
        list[0] = a;
        list[1] = b;
        list[2] = c;
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

    function _create(address[] memory attestors, uint8 quorum, uint64 challengeWindow)
        internal
        returns (uint256 campaignId)
    {
        (string[] memory descriptions, uint256[] memory amounts) = _miles();
        vm.prank(sponsor);
        campaignId = escrow.createCampaign(
            beneficiary,
            attestors,
            quorum,
            "Ship MVP",
            "ipfs://brief",
            deadline,
            challengeWindow,
            descriptions,
            amounts
        );
    }

    /// @dev v2-compatible default: 1-of-1, no challenge window.
    function _createDefault() internal returns (uint256 campaignId) {
        return _create(_one(attestor), 1, 0);
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
        assertEq(view_.challengeWindow, 0);
        assertEq(view_.quorum, 1);
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
        assertEq(list[0].attestationCount, 0);
        assertEq(list[0].completedAt, 0);
        assertFalse(list[0].completed);
        assertFalse(list[0].claimed);
        assertFalse(list[0].reclaimed);
        assertFalse(list[0].disputed);
    }

    function test_createCampaign_emitsCampaignCreated() public {
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Done";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = M1;

        vm.expectEmit(true, true, true, true);
        emit MilestoneEscrow.CampaignCreated(0, sponsor, beneficiary, M1, deadline, 1, 0);

        vm.prank(sponsor);
        escrow.createCampaign(
            beneficiary, _one(attestor), 1, "T", "", deadline, 0, descriptions, amounts
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
            beneficiary, dupes, 2, "Dedupe", "", deadline, 0, descriptions, amounts
        );

        address[] memory list = escrow.getAttestors(id);
        assertEq(list.length, 2);
        assertTrue(escrow.isAttestor(id, attestor));
        assertTrue(escrow.isAttestor(id, attestor2));
        assertEq(escrow.getCampaign(id).quorum, 2);
    }

    function test_create_revertsInvalidQuorum() public {
        (string[] memory descriptions, uint256[] memory amounts) = _miles();

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.InvalidQuorum.selector);
        escrow.createCampaign(
            beneficiary, _two(attestor, attestor2), 0, "T", "", deadline, 0, descriptions, amounts
        );

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.InvalidQuorum.selector);
        escrow.createCampaign(
            beneficiary, _one(attestor), 2, "T", "", deadline, 0, descriptions, amounts
        );

        // After dedupe unique=1, quorum=2 still invalid.
        address[] memory dupes = new address[](2);
        dupes[0] = attestor;
        dupes[1] = attestor;
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.InvalidQuorum.selector);
        escrow.createCampaign(
            beneficiary, dupes, 2, "T", "", deadline, 0, descriptions, amounts
        );
    }

    function test_create_revertsTooManyAttestors() public {
        (string[] memory descriptions, uint256[] memory amounts) = _miles();
        address[] memory many = new address[](33);
        for (uint256 i; i < 33; ++i) {
            many[i] = address(uint160(i + 1));
        }
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.TooManyAttestors.selector);
        escrow.createCampaign(
            beneficiary, many, 1, "T", "", deadline, 0, descriptions, amounts
        );
    }

    function test_onlyListedAttestorsCanAttest() public {
        uint256 id = _create(_two(attestor, attestor2), 1, 0);

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "ipfs://ev0");
        vm.prank(attestor2);
        escrow.attestMilestone(id, 2, "https://example.com/note");

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertTrue(list[0].completed);
        assertEq(list[0].evidenceURI, "ipfs://ev0");
        assertEq(list[0].attestationCount, 1);
        assertFalse(list[1].completed);
        assertTrue(list[2].completed);
        assertEq(list[2].evidenceURI, "https://example.com/note");
    }

    function test_unauthorizedAttestReverts() public {
        uint256 id = _createDefault();

        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.attestMilestone(id, 0, "");

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.attestMilestone(id, 0, "");

        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.NotAttestor.selector);
        escrow.attestMilestone(id, 1, "");
    }

    function test_attest_storesEmptyEvidence() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.attestMilestone(id, 1, "");
        assertEq(escrow.getMilestones(id)[1].evidenceURI, "");
        assertTrue(escrow.getMilestones(id)[1].completed);
    }

    function test_attest_emitsAttestedAndCompleted() public {
        uint256 id = _createDefault();
        vm.expectEmit(true, true, true, true);
        emit MilestoneEscrow.MilestoneAttested(id, 0, attestor, "ipfs://e", 1, 1);
        vm.expectEmit(true, true, true, true);
        emit MilestoneEscrow.MilestoneCompleted(id, 0, attestor, "ipfs://e");
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "ipfs://e");
    }

    function test_quorum_twoOfThree_completesOnSecondAttest() public {
        uint256 id = _create(_three(attestor, attestor2, attestor3), 2, 0);

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        MilestoneEscrow.Milestone[] memory mid = escrow.getMilestones(id);
        assertFalse(mid[0].completed);
        assertEq(mid[0].attestationCount, 1);
        assertEq(escrow.claimableAmount(id), 0);

        address[] memory voters = escrow.attestedBy(id, 0);
        assertEq(voters.length, 1);
        assertEq(voters[0], attestor);

        vm.expectEmit(true, true, true, true);
        emit MilestoneEscrow.MilestoneCompleted(id, 0, attestor2, "");
        vm.prank(attestor2);
        escrow.attestMilestone(id, 0, "");

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertTrue(list[0].completed);
        assertEq(list[0].attestationCount, 2);
        assertEq(list[0].completedAt, uint64(block.timestamp));
        assertEq(escrow.claimableAmount(id), M1);

        voters = escrow.attestedBy(id, 0);
        assertEq(voters.length, 2);
        assertEq(voters[0], attestor);
        assertEq(voters[1], attestor2);
        assertTrue(escrow.hasAttested(id, 0, attestor));
        assertTrue(escrow.hasAttested(id, 0, attestor2));
        assertFalse(escrow.hasAttested(id, 0, attestor3));

        bool[] memory flags = escrow.hasAttestedAll(id, attestor);
        assertEq(flags.length, 3);
        assertTrue(flags[0]);
        assertFalse(flags[1]);
        bool[] memory none = escrow.hasAttestedAll(id, stranger);
        assertFalse(none[0]);
    }

    function test_quorum_sameAttestorTwiceRevertsAlreadyAttested() public {
        uint256 id = _create(_two(attestor, attestor2), 2, 0);
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");

        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.AlreadyAttested.selector);
        escrow.attestMilestone(id, 0, "");
    }

    function test_firstNonEmptyEvidenceWins() public {
        uint256 id = _create(_two(attestor, attestor2), 2, 0);

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        vm.prank(attestor2);
        escrow.attestMilestone(id, 0, "ipfs://second");
        assertEq(escrow.getMilestones(id)[0].evidenceURI, "ipfs://second");

        uint256 id2 = _create(_two(attestor, attestor2), 2, 0);
        vm.prank(attestor);
        escrow.attestMilestone(id2, 1, "ipfs://first");
        vm.prank(attestor2);
        escrow.attestMilestone(id2, 1, "ipfs://ignored");
        assertEq(escrow.getMilestones(id2)[1].evidenceURI, "ipfs://first");
    }

    function test_attest_afterQuorumRevertsAlreadyCompleted() public {
        uint256 id = _create(_two(attestor, attestor2), 1, 0);
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");

        vm.prank(attestor2);
        vm.expectRevert(MilestoneEscrow.AlreadyCompleted.selector);
        escrow.attestMilestone(id, 0, "late");
    }

    function test_claim_releasesCorrectAmount() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        vm.prank(attestor);
        escrow.attestMilestone(id, 2, "");

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
        escrow.attestMilestone(id, 1, "");

        vm.expectEmit(true, true, false, true);
        emit MilestoneEscrow.Claimed(id, beneficiary, M2);

        vm.prank(beneficiary);
        escrow.claim(id);
    }

    function test_doubleClaimReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");

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
        escrow.attestMilestone(id, 0, "");

        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.NotBeneficiary.selector);
        escrow.claim(id);
    }

    function test_attest_anyOrder() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.attestMilestone(id, 2, "later-first");

        MilestoneEscrow.Milestone[] memory list = escrow.getMilestones(id);
        assertFalse(list[0].completed);
        assertFalse(list[1].completed);
        assertTrue(list[2].completed);
        assertEq(escrow.claimableAmount(id), M3);
    }

    function test_attest_twiceAfterCompleteReverts() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");

        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.AlreadyCompleted.selector);
        escrow.attestMilestone(id, 0, "");
    }

    function test_create_revertsOnBadInputs() public {
        string[] memory descriptions = new string[](1);
        descriptions[0] = "A";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = M1;

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        escrow.createCampaign(
            address(0), _one(attestor), 1, "T", "", deadline, 0, descriptions, amounts
        );

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        escrow.createCampaign(
            beneficiary, _one(address(0)), 1, "T", "", deadline, 0, descriptions, amounts
        );

        address[] memory emptyAtt = new address[](0);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.EmptyAttestors.selector);
        escrow.createCampaign(
            beneficiary, emptyAtt, 1, "T", "", deadline, 0, descriptions, amounts
        );

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.DeadlineInPast.selector);
        escrow.createCampaign(
            beneficiary, _one(attestor), 1, "T", "", uint64(block.timestamp), 0, descriptions, amounts
        );

        string[] memory emptyDesc = new string[](0);
        uint256[] memory emptyAmt = new uint256[](0);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.EmptyMilestones.selector);
        escrow.createCampaign(
            beneficiary, _one(attestor), 1, "T", "", deadline, 0, emptyDesc, emptyAmt
        );

        uint256[] memory two = new uint256[](2);
        two[0] = M1;
        two[1] = M2;
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.LengthMismatch.selector);
        escrow.createCampaign(
            beneficiary, _one(attestor), 1, "T", "", deadline, 0, descriptions, two
        );

        uint256[] memory zero = new uint256[](1);
        zero[0] = 0;
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ZeroAmount.selector);
        escrow.createCampaign(
            beneficiary, _one(attestor), 1, "T", "", deadline, 0, descriptions, zero
        );
    }

    function test_unknownCampaignReverts() public {
        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.attestMilestone(99, 0, "");

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.CampaignNotFound.selector);
        escrow.dispute(99, 0);

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
        escrow.attestMilestone(id, 3, "");

        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.InvalidIndex.selector);
        escrow.dispute(id, 3);
    }

    function test_constructorRejectsZeroUsdc() public {
        vm.expectRevert(MilestoneEscrow.ZeroAddress.selector);
        new MilestoneEscrow(address(0));
    }

    function test_claimAfterLaterCompletion() public {
        uint256 id = _createDefault();

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        vm.prank(beneficiary);
        escrow.claim(id);

        vm.prank(attestor);
        escrow.attestMilestone(id, 1, "");
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
        escrow.attestMilestone(id, 0, "done");

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
        escrow.attestMilestone(id, 0, "");
        vm.prank(attestor);
        escrow.attestMilestone(id, 1, "");
        vm.prank(attestor);
        escrow.attestMilestone(id, 2, "");

        vm.warp(uint256(deadline) + 1);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.NothingToReclaim.selector);
        escrow.reclaim(id);
    }

    function test_attest_afterReclaimReverts() public {
        uint256 id = _createDefault();
        vm.warp(uint256(deadline) + 1);
        vm.prank(sponsor);
        escrow.reclaim(id);

        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.AlreadyReclaimed.selector);
        escrow.attestMilestone(id, 0, "");
    }

    function test_attest_afterDeadlineBeforeReclaimOk() public {
        uint256 id = _createDefault();
        vm.warp(uint256(deadline) + 1);
        vm.prank(attestor);
        escrow.attestMilestone(id, 1, "late");
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

    // --- challenge window / dispute ---

    function test_challengeWindow_blocksClaimUntilElapsed() public {
        uint64 window = 1 days;
        uint256 id = _create(_one(attestor), 1, window);

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "ipfs://ev");

        assertEq(escrow.claimableAmount(id), 0);
        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.NothingToClaim.selector);
        escrow.claim(id);

        vm.warp(block.timestamp + window - 1);
        assertEq(escrow.claimableAmount(id), 0);

        vm.warp(block.timestamp + 1);
        assertEq(escrow.claimableAmount(id), M1);

        vm.prank(beneficiary);
        escrow.claim(id);
        assertEq(usdc.balanceOf(beneficiary), M1);
    }

    function test_challengeWindow_zeroIsImmediatelyClaimable() public {
        uint256 id = _createDefault();
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        assertEq(escrow.claimableAmount(id), M1);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ChallengeWindowClosed.selector);
        escrow.dispute(id, 0);
    }

    function test_dispute_bySponsorBlocksClaim() public {
        uint64 window = 1 hours;
        uint256 id = _create(_one(attestor), 1, window);

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");

        vm.expectEmit(true, true, true, true);
        emit MilestoneEscrow.MilestoneDisputed(id, 0, sponsor);
        vm.prank(sponsor);
        escrow.dispute(id, 0);

        assertTrue(escrow.getMilestones(id)[0].disputed);
        assertEq(escrow.claimableAmount(id), 0);

        vm.warp(block.timestamp + window + 1);
        assertEq(escrow.claimableAmount(id), 0);
        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.NothingToClaim.selector);
        escrow.claim(id);
    }

    function test_dispute_byAttestorOk() public {
        uint64 window = 1 hours;
        uint256 id = _create(_two(attestor, attestor2), 1, window);

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        vm.prank(attestor2);
        escrow.dispute(id, 0);
        assertTrue(escrow.getMilestones(id)[0].disputed);
    }

    function test_dispute_strangerReverts() public {
        uint64 window = 1 hours;
        uint256 id = _create(_one(attestor), 1, window);
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");

        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.NotDisputer.selector);
        escrow.dispute(id, 0);

        vm.prank(beneficiary);
        vm.expectRevert(MilestoneEscrow.NotDisputer.selector);
        escrow.dispute(id, 0);
    }

    function test_dispute_beforeCompleteReverts() public {
        uint256 id = _create(_one(attestor), 1, 1 hours);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.NotCompleted.selector);
        escrow.dispute(id, 0);
    }

    function test_dispute_afterWindowReverts() public {
        uint64 window = 1 hours;
        uint256 id = _create(_one(attestor), 1, window);
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        vm.warp(block.timestamp + window);
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.ChallengeWindowClosed.selector);
        escrow.dispute(id, 0);
    }

    function test_dispute_twiceReverts() public {
        uint64 window = 1 hours;
        uint256 id = _create(_one(attestor), 1, window);
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        vm.prank(sponsor);
        escrow.dispute(id, 0);
        vm.prank(attestor);
        vm.expectRevert(MilestoneEscrow.AlreadyDisputed.selector);
        escrow.dispute(id, 0);
    }

    function test_reclaim_includesDisputedAfterDeadline() public {
        uint64 window = 1 hours;
        uint256 id = _create(_one(attestor), 1, window);

        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");
        vm.prank(sponsor);
        escrow.dispute(id, 0);
        vm.prank(attestor);
        escrow.attestMilestone(id, 1, "");
        // mile 1 completed, not disputed — stays with beneficiary after window
        // mile 2 incomplete — reclaimable
        // mile 0 disputed — reclaimable after deadline

        vm.warp(uint256(deadline) + 1);
        assertEq(escrow.reclaimableAmount(id), M1 + M3);
        assertEq(escrow.claimableAmount(id), M2);

        uint256 beforeSponsor = usdc.balanceOf(sponsor);
        vm.prank(sponsor);
        escrow.reclaim(id);
        assertEq(usdc.balanceOf(sponsor), beforeSponsor + M1 + M3);

        vm.prank(beneficiary);
        escrow.claim(id);
        assertEq(usdc.balanceOf(beneficiary), M2);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_reclaim_doesNotTakeInWindowCompletedMiles() public {
        // Deadline (1h) is inside a longer challenge window (2d) so a just-completed
        // mile is still not claimable when the sponsor reclaims incompletes.
        uint64 window = 2 days;
        uint64 shortDeadline = uint64(block.timestamp + 1 hours);
        (string[] memory descriptions, uint256[] memory amounts) = _miles();
        vm.prank(sponsor);
        uint256 id = escrow.createCampaign(
            beneficiary,
            _one(attestor),
            1,
            "Ship MVP",
            "ipfs://brief",
            shortDeadline,
            window,
            descriptions,
            amounts
        );
        vm.prank(attestor);
        escrow.attestMilestone(id, 0, "");

        vm.warp(uint256(shortDeadline) + 1);
        assertEq(escrow.reclaimableAmount(id), M2 + M3);
        assertEq(escrow.claimableAmount(id), 0);

        vm.prank(sponsor);
        escrow.reclaim(id);

        vm.warp(block.timestamp + window);
        assertEq(escrow.claimableAmount(id), M1);
        vm.prank(beneficiary);
        escrow.claim(id);
        assertEq(usdc.balanceOf(beneficiary), M1);
    }

    function test_dispute_afterReclaimReverts() public {
        uint64 window = 30 days;
        uint256 id = _create(_one(attestor), 1, window);
        vm.warp(uint256(deadline) + 1);
        vm.prank(sponsor);
        escrow.reclaim(id);

        // Incomplete miles were reclaimed; cannot dispute an incomplete mile.
        vm.prank(sponsor);
        vm.expectRevert(MilestoneEscrow.NotCompleted.selector);
        escrow.dispute(id, 0);
    }

    function test_maxAttestorsThirtyTwoOk() public {
        (string[] memory descriptions, uint256[] memory amounts) = _miles();
        address[] memory many = new address[](32);
        for (uint256 i; i < 32; ++i) {
            many[i] = address(uint160(i + 1));
        }
        vm.prank(sponsor);
        uint256 id = escrow.createCampaign(
            beneficiary, many, 32, "Big", "", deadline, 0, descriptions, amounts
        );
        assertEq(escrow.getAttestors(id).length, 32);
        assertEq(escrow.getCampaign(id).quorum, 32);
    }
}
