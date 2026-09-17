// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MilestoneEscrow
/// @notice Sponsor locks USDC against ordered milestones. An attestor marks
///         milestones complete. The beneficiary claims released USDC.
/// @dev Milestone completion is **any-order**: the attestor may complete index N
///      before index N-1. Ordered descriptions still communicate intended sequence
///      to humans; the contract does not enforce that sequence. Chosen so a late
///      independent workstream is not blocked by an earlier unfinished one.
contract MilestoneEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Campaign {
        address sponsor;
        address beneficiary;
        address attestor;
        uint256 milestoneCount;
        uint256 createdAt;
    }

    struct Milestone {
        string description;
        uint256 amount;
        bool completed;
        bool claimed;
    }

    IERC20 public immutable usdc;
    uint256 public campaignCount;

    mapping(uint256 campaignId => Campaign) public campaigns;
    mapping(uint256 campaignId => mapping(uint256 index => Milestone)) public milestones;

    error ZeroAddress();
    error LengthMismatch();
    error EmptyMilestones();
    error ZeroAmount();
    error CampaignNotFound();
    error InvalidIndex();
    error NotAttestor();
    error NotBeneficiary();
    error AlreadyCompleted();
    error NothingToClaim();

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed sponsor,
        address indexed beneficiary,
        address attestor,
        uint256 totalAmount
    );
    event MilestoneCompleted(uint256 indexed campaignId, uint256 indexed index);
    event Claimed(uint256 indexed campaignId, address indexed beneficiary, uint256 amount);

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    /// @notice Create a campaign and pull `sum(amounts)` USDC from the sponsor.
    /// @dev Caller must `approve` this contract for the total first.
    function createCampaign(
        address beneficiary,
        address attestor,
        string[] calldata descriptions,
        uint256[] calldata amounts
    ) external nonReentrant returns (uint256 campaignId) {
        if (beneficiary == address(0) || attestor == address(0)) revert ZeroAddress();
        if (descriptions.length != amounts.length) revert LengthMismatch();
        if (descriptions.length == 0) revert EmptyMilestones();

        uint256 total;
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
            attestor: attestor,
            milestoneCount: len,
            createdAt: block.timestamp
        });

        for (uint256 i; i < len; ++i) {
            milestones[campaignId][i] = Milestone({
                description: descriptions[i],
                amount: amounts[i],
                completed: false,
                claimed: false
            });
        }

        usdc.safeTransferFrom(msg.sender, address(this), total);
        emit CampaignCreated(campaignId, msg.sender, beneficiary, attestor, total);
    }

    /// @notice Mark a milestone complete. Any-order: index need not be sequential.
    function completeMilestone(uint256 campaignId, uint256 index) external {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        if (msg.sender != campaign.attestor) revert NotAttestor();
        if (index >= campaign.milestoneCount) revert InvalidIndex();

        Milestone storage milestone = milestones[campaignId][index];
        if (milestone.completed) revert AlreadyCompleted();

        milestone.completed = true;
        emit MilestoneCompleted(campaignId, index);
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

    function getCampaign(uint256 campaignId)
        external
        view
        returns (
            address sponsor,
            address beneficiary,
            address attestor,
            uint256 milestoneCount,
            uint256 createdAt,
            uint256 claimable
        )
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        return (
            campaign.sponsor,
            campaign.beneficiary,
            campaign.attestor,
            campaign.milestoneCount,
            campaign.createdAt,
            _peekClaimable(campaignId, campaign.milestoneCount)
        );
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

    function _peekClaimable(uint256 campaignId, uint256 len) internal view returns (uint256 payout) {
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (milestone.completed && !milestone.claimed) {
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
}
