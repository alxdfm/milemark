// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MilestoneEscrow
/// @notice Onchain USDC escrow for titled campaigns with ordered milestones.
///         A sponsor locks funds, a 1-of-n attestor set releases miles, the
///         beneficiary claims completed amounts, and the sponsor reclaims
///         incomplete miles after the deadline.
/// @dev v2 ABI. Completion is **any-order**: index N may complete before N-1.
///      Ordered descriptions are for humans; the contract does not enforce
///      sequence so an independent workstream is not blocked.
///      Empty `evidenceURI` is allowed. Duplicate attestors are skipped.
///      This contract is not upgradeable. Token is assumed 6-decimal USDC.
/// @custom:security ReentrancyGuard on create / claim / reclaim. Completions
///                  do not move tokens. Do not point frontends at obsolete v1
///                  `0x72b474DB34268281CD10db655cc1517C33973049`.
contract MilestoneEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Stored campaign metadata. `sponsor == address(0)` means unused id.
    struct Campaign {
        address sponsor;
        address beneficiary;
        uint64 deadline;
        uint256 milestoneCount;
        uint256 createdAt;
        string title;
        string briefURI;
    }

    /// @notice One funded mile. `reclaimed` and `completed` are mutually exclusive
    ///         after a successful reclaim of that index.
    struct Milestone {
        string description;
        string evidenceURI;
        uint256 amount;
        bool completed;
        bool claimed;
        bool reclaimed;
    }

    /// @notice Packed read model used by the UI (includes live claimable math).
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

    /// @notice Settlement token. Immutable after deploy.
    IERC20 public immutable usdc;

    /// @notice Next campaign id (also the count of created campaigns).
    uint256 public campaignCount;

    /// @notice campaignId => campaign metadata.
    mapping(uint256 campaignId => Campaign) public campaigns;
    /// @notice campaignId => mile index => milestone.
    mapping(uint256 campaignId => mapping(uint256 index => Milestone)) public milestones;
    /// @notice campaignId => account => whether the account may complete miles.
    mapping(uint256 campaignId => mapping(address account => bool)) public isAttestor;
    /// @notice campaignId => attestor list in insert order (duplicates omitted).
    mapping(uint256 campaignId => address[]) internal _attestors;

    /// @notice Zero address passed where a real account or token is required.
    error ZeroAddress();
    /// @notice `descriptions.length != amounts.length`.
    error LengthMismatch();
    /// @notice Campaign created with zero milestones.
    error EmptyMilestones();
    /// @notice No usable attestors after zero-address / empty-input checks.
    error EmptyAttestors();
    /// @notice A milestone amount was zero.
    error ZeroAmount();
    /// @notice Deadline was not strictly in the future at create time.
    error DeadlineInPast();
    /// @notice `campaignId` was never created.
    error CampaignNotFound();
    /// @notice Milestone index is out of range for the campaign.
    error InvalidIndex();
    /// @notice Caller is not in the campaign attestor set.
    error NotAttestor();
    /// @notice Caller is not the campaign beneficiary.
    error NotBeneficiary();
    /// @notice Caller is not the campaign sponsor.
    error NotSponsor();
    /// @notice Mile was already marked complete.
    error AlreadyCompleted();
    /// @notice Mile was already reclaimed after the deadline.
    error AlreadyReclaimed();
    /// @notice Claim called with no completed-unclaimed amounts.
    error NothingToClaim();
    /// @notice Reclaim called with no incomplete-unreclaimed amounts.
    error NothingToReclaim();
    /// @notice Reclaim called while `block.timestamp <= deadline`.
    error DeadlineNotPassed();

    /// @notice A campaign was created and `totalAmount` USDC pulled from the sponsor.
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed sponsor,
        address indexed beneficiary,
        uint256 totalAmount,
        uint64 deadline
    );
    /// @notice An attestor marked a mile complete (any-order). `evidenceURI` may be empty.
    event MilestoneCompleted(
        uint256 indexed campaignId,
        uint256 indexed index,
        address indexed attestor,
        string evidenceURI
    );
    /// @notice Beneficiary withdrew the sum of completed, previously unclaimed miles.
    event Claimed(uint256 indexed campaignId, address indexed beneficiary, uint256 amount);
    /// @notice Sponsor withdrew USDC still locked on incomplete miles after the deadline.
    event Reclaimed(uint256 indexed campaignId, address indexed sponsor, uint256 amount);

    /// @param usdc_ Circle USDC (or MockERC20 in tests). Must be non-zero.
    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    /// @notice Create a campaign and pull `sum(amounts)` USDC from the sponsor.
    /// @dev Caller must `approve` this contract for the total first.
    ///      `attestors` is a 1-of-n set: any listed address may complete.
    /// @param beneficiary Recipient of completed-mile claims. Not zero.
    /// @param attestors 1-of-n set. Zero addresses revert; duplicates are skipped.
    /// @param title Human title stored onchain.
    /// @param briefURI Optional https / ipfs pointer to a longer brief.
    /// @param deadline Unix seconds; must be strictly greater than `block.timestamp`.
    /// @param descriptions Parallel to `amounts`. Empty array reverts.
    /// @param amounts USDC base units per mile. Each must be > 0.
    /// @return campaignId Newly assigned id (`campaignCount` before increment).
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
    /// @param campaignId Existing campaign.
    /// @param index Mile index in `[0, milestoneCount)`.
    /// @param evidenceURI Optional https / ipfs pointer; empty string is valid.
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
    /// @param campaignId Existing campaign.
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
    /// @param campaignId Existing campaign.
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

    /// @notice Packed campaign view including live claimable / reclaimable.
    /// @param campaignId Existing campaign.
    /// @return view_ Read model for the UI. Reverts `CampaignNotFound` if unused.
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

    /// @notice Attestor set in insert order (duplicates omitted at create).
    /// @param campaignId Existing campaign.
    function getAttestors(uint256 campaignId) external view returns (address[] memory) {
        if (campaigns[campaignId].sponsor == address(0)) revert CampaignNotFound();
        return _attestors[campaignId];
    }

    /// @notice All milestones for a campaign, index-stable.
    /// @param campaignId Existing campaign.
    function getMilestones(uint256 campaignId) external view returns (Milestone[] memory list) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        uint256 len = campaign.milestoneCount;
        list = new Milestone[](len);
        for (uint256 i; i < len; ++i) {
            list[i] = milestones[campaignId][i];
        }
    }

    /// @notice Sum of completed, unclaimed milestone amounts.
    /// @param campaignId Existing campaign.
    function claimableAmount(uint256 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        return _peekClaimable(campaignId, campaign.milestoneCount);
    }

    /// @notice Sum still locked on incomplete miles if the deadline has passed; else 0.
    /// @param campaignId Existing campaign.
    function reclaimableAmount(uint256 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        return _peekReclaimable(campaignId, campaign);
    }

    /// @dev Dedupes attestors; zero addresses revert; empty unique set reverts.
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

    /// @dev Completed && !claimed.
    function _peekClaimable(uint256 campaignId, uint256 len) internal view returns (uint256 payout) {
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (milestone.completed && !milestone.claimed) {
                payout += milestone.amount;
            }
        }
    }

    /// @dev 0 until deadline passes; then incomplete && !reclaimed.
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

    /// @dev Marks matching miles claimed and returns the payout.
    function _collectClaimable(uint256 campaignId, uint256 len) internal returns (uint256 payout) {
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (milestone.completed && !milestone.claimed) {
                milestone.claimed = true;
                payout += milestone.amount;
            }
        }
    }

    /// @dev Marks matching miles reclaimed and returns the payout.
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
