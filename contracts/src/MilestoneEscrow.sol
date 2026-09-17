// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MilestoneEscrow
/// @notice Sponsor locks USDC against ordered milestones. Any member of an
///         attestor set may mark a mile complete (1-of-n). The beneficiary
///         claims released USDC. After the deadline the sponsor reclaims
///         amounts still locked on incomplete miles.
/// @dev Completion is **any-order**: index N may complete before N-1.
///      Ordered descriptions are for humans; the contract does not enforce
///      sequence. Chosen so an independent workstream is not blocked.
contract MilestoneEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Campaign {
        address sponsor;
        address beneficiary;
        uint64 deadline;
        uint256 milestoneCount;
        uint256 createdAt;
        string title;
        string briefURI;
    }

    struct Milestone {
        string description;
        string evidenceURI;
        uint256 amount;
        bool completed;
        bool claimed;
        bool reclaimed;
    }

    struct CampaignView {
        address sponsor;
        address beneficiary;
        string title;
        string briefURI;
        uint64 deadline;
        uint256 milestoneCount;
        uint256 createdAt;
        uint256 claimable;
        uint256 reclaimable;
    }

    IERC20 public immutable usdc;
    uint256 public campaignCount;

    mapping(uint256 campaignId => Campaign) public campaigns;
    mapping(uint256 campaignId => mapping(uint256 index => Milestone)) public milestones;
    mapping(uint256 campaignId => mapping(address account => bool)) public isAttestor;
    mapping(uint256 campaignId => address[]) internal _attestors;

    error ZeroAddress();
    error LengthMismatch();
    error EmptyMilestones();
    error EmptyAttestors();
    error ZeroAmount();
    error DeadlineInPast();
    error CampaignNotFound();
    error InvalidIndex();
    error NotAttestor();
    error NotBeneficiary();
    error NotSponsor();
    error AlreadyCompleted();
    error AlreadyReclaimed();
    error NothingToClaim();
    error NothingToReclaim();
    error DeadlineNotPassed();

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed sponsor,
        address indexed beneficiary,
        uint256 totalAmount,
        uint64 deadline
    );
    event MilestoneCompleted(
        uint256 indexed campaignId,
        uint256 indexed index,
        address indexed attestor,
        string evidenceURI
    );
    event Claimed(uint256 indexed campaignId, address indexed beneficiary, uint256 amount);
    event Reclaimed(uint256 indexed campaignId, address indexed sponsor, uint256 amount);

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    /// @notice Create a campaign and pull `sum(amounts)` USDC from the sponsor.
    /// @dev Caller must `approve` this contract for the total first.
    ///      `attestors` is a 1-of-n set: any listed address may complete.
    function createCampaign(
        address beneficiary,
        address[] calldata attestors,
        string calldata title,
        string calldata briefURI,
        uint64 deadline,
        string[] calldata descriptions,
        uint256[] calldata amounts
    ) external nonReentrant returns (uint256 campaignId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (attestors.length == 0) revert EmptyAttestors();
        if (deadline <= block.timestamp) revert DeadlineInPast();
        if (descriptions.length != amounts.length) revert LengthMismatch();
        if (descriptions.length == 0) revert EmptyMilestones();

        uint256 total = 0;
        uint256 len = amounts.length;
        for (uint256 i; i < len; ++i) {
            if (amounts[i] == 0) revert ZeroAmount();
            total += amounts[i];
        }

        campaignId = campaignCount;
        unchecked {
            campaignCount = campaignId + 1;
        }

        campaigns[campaignId] = Campaign({
            sponsor: msg.sender,
            beneficiary: beneficiary,
            deadline: deadline,
            milestoneCount: len,
            createdAt: block.timestamp,
            title: title,
            briefURI: briefURI
        });

        _setAttestors(campaignId, attestors);

        for (uint256 i; i < len; ++i) {
            milestones[campaignId][i] = Milestone({
                description: descriptions[i],
                evidenceURI: "",
                amount: amounts[i],
                completed: false,
                claimed: false,
                reclaimed: false
            });
        }

        usdc.safeTransferFrom(msg.sender, address(this), total);
        emit CampaignCreated(campaignId, msg.sender, beneficiary, total, deadline);
    }

    /// @notice Mark a milestone complete with optional evidence URI. Any-order.
    function completeMilestone(uint256 campaignId, uint256 index, string calldata evidenceURI)
        external
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        if (!isAttestor[campaignId][msg.sender]) revert NotAttestor();
        if (index >= campaign.milestoneCount) revert InvalidIndex();

        Milestone storage milestone = milestones[campaignId][index];
        if (milestone.reclaimed) revert AlreadyReclaimed();
        if (milestone.completed) revert AlreadyCompleted();

        milestone.completed = true;
        milestone.evidenceURI = evidenceURI;
        emit MilestoneCompleted(campaignId, index, msg.sender, evidenceURI);
    }

    /// @notice Beneficiary withdraws the sum of completed, unclaimed milestones.
    function claim(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        if (msg.sender != campaign.beneficiary) revert NotBeneficiary();

        uint256 payout = _collectClaimable(campaignId, campaign.milestoneCount);
        if (payout == 0) revert NothingToClaim();

        usdc.safeTransfer(campaign.beneficiary, payout);
        emit Claimed(campaignId, campaign.beneficiary, payout);
    }

    /// @notice After the deadline, sponsor pulls USDC still locked on incomplete miles.
    /// @dev Completed-but-unclaimed amounts stay claimable by the beneficiary.
    function reclaim(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        if (msg.sender != campaign.sponsor) revert NotSponsor();
        if (block.timestamp <= campaign.deadline) revert DeadlineNotPassed();

        uint256 payout = _collectReclaimable(campaignId, campaign.milestoneCount);
        if (payout == 0) revert NothingToReclaim();

        usdc.safeTransfer(campaign.sponsor, payout);
        emit Reclaimed(campaignId, campaign.sponsor, payout);
    }

    function getCampaign(uint256 campaignId) external view returns (CampaignView memory view_) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        view_.sponsor = campaign.sponsor;
        view_.beneficiary = campaign.beneficiary;
        view_.title = campaign.title;
        view_.briefURI = campaign.briefURI;
        view_.deadline = campaign.deadline;
        view_.milestoneCount = campaign.milestoneCount;
        view_.createdAt = campaign.createdAt;
        view_.claimable = _peekClaimable(campaignId, campaign.milestoneCount);
        view_.reclaimable = _peekReclaimable(campaignId, campaign);
    }

    function getAttestors(uint256 campaignId) external view returns (address[] memory) {
        if (campaigns[campaignId].sponsor == address(0)) revert CampaignNotFound();
        return _attestors[campaignId];
    }

    function getMilestones(uint256 campaignId) external view returns (Milestone[] memory list) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        uint256 len = campaign.milestoneCount;
        list = new Milestone[](len);
        for (uint256 i; i < len; ++i) {
            list[i] = milestones[campaignId][i];
        }
    }

    function claimableAmount(uint256 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        return _peekClaimable(campaignId, campaign.milestoneCount);
    }

    function reclaimableAmount(uint256 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        return _peekReclaimable(campaignId, campaign);
    }

    function _setAttestors(uint256 campaignId, address[] calldata attestors) internal {
        uint256 n = attestors.length;
        for (uint256 i; i < n; ++i) {
            address account = attestors[i];
            if (account == address(0)) revert ZeroAddress();
            if (isAttestor[campaignId][account]) continue;
            isAttestor[campaignId][account] = true;
            _attestors[campaignId].push(account);
        }
        if (_attestors[campaignId].length == 0) revert EmptyAttestors();
    }

    function _peekClaimable(uint256 campaignId, uint256 len) internal view returns (uint256 payout) {
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (milestone.completed && !milestone.claimed) {
                payout += milestone.amount;
            }
        }
    }

    function _peekReclaimable(uint256 campaignId, Campaign storage campaign)
        internal
        view
        returns (uint256 payout)
    {
        if (block.timestamp <= campaign.deadline) return 0;
        uint256 len = campaign.milestoneCount;
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (!milestone.completed && !milestone.reclaimed) {
                payout += milestone.amount;
            }
        }
    }

    function _collectClaimable(uint256 campaignId, uint256 len) internal returns (uint256 payout) {
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (milestone.completed && !milestone.claimed) {
                milestone.claimed = true;
                payout += milestone.amount;
            }
        }
    }

    function _collectReclaimable(uint256 campaignId, uint256 len) internal returns (uint256 payout) {
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (!milestone.completed && !milestone.reclaimed) {
                milestone.reclaimed = true;
                payout += milestone.amount;
            }
        }
    }
}
