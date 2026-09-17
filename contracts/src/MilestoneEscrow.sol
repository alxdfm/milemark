// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MilestoneEscrow
/// @notice Onchain USDC escrow for titled campaigns with ordered milestones,
///         N-of-M attestor quorum, and a light post-completion challenge window.
/// @dev v3 ABI. **Incompatible with v2** (`0xdECB21Fd8e835490E5B9Fc26469cE4Cca1F94207`)
///      and v1 (`0x72b474DB34268281CD10db655cc1517C33973049`). Deploy a new address.
///
///      Completion is **any-order**: index N may complete before N-1.
///      Ordered descriptions are for humans; the contract does not enforce sequence.
///
///      Evidence policy: the **first non-empty** `evidenceURI` written for a mile
///      is sticky. Later attestors may still attest; empty strings never overwrite
///      a stored URI; a later URI does not replace an earlier non-empty one.
///
///      Duplicate attestors are skipped at create. Unique set size is capped at
///      `MAX_ATTESTORS`. `1 <= quorum <= unique attestor count`.
///
///      This contract is not upgradeable. Token is assumed 6-decimal USDC.
///
/// @custom:invariants
///      1. A mile is `completed` iff `attestationCount >= quorum` (set once).
///      2. Each attestor may attest a given mile at most once (`hasAttested`).
///      3. Claimable iff `completed && !claimed && !disputed && !reclaimed`
///         && `block.timestamp >= completedAt + challengeWindow`.
///         `challengeWindow == 0` ⇒ claimable in the same timestamp as completion.
///      4. Dispute is allowed only by the sponsor or a listed attestor, only while
///         the mile is completed, not yet disputed, and still inside the window.
///         Dispute is sticky: no onchain resolution. Disputed miles are never claimable.
///      5. After `block.timestamp > deadline`, the sponsor may reclaim amounts still
///         locked on miles that are **not** completed-and-undisputed (i.e. incomplete
///         or disputed). Completed, undisputed, unclaimed amounts stay with the
///         beneficiary even if the challenge window has not yet elapsed — they
///         become claimable when the window closes (or immediately if window is 0).
///      6. Completions/attests/disputes do not move tokens. Only `claim` / `reclaim`
///         / `createCampaign` transfer USDC. ReentrancyGuard on those three.
///      7. `completed` and `reclaimed` are mutually exclusive after a successful
///         reclaim of that index (`attest` reverts `AlreadyReclaimed`).
contract MilestoneEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Upper bound on unique attestors per campaign (bitmap-friendly).
    uint256 public constant MAX_ATTESTORS = 32;

    /// @notice Stored campaign metadata. `sponsor == address(0)` means unused id.
    struct Campaign {
        address sponsor;
        address beneficiary;
        uint64 deadline;
        uint64 challengeWindow;
        uint8 quorum;
        uint256 milestoneCount;
        uint256 createdAt;
        string title;
        string briefURI;
    }

    /// @notice One funded mile.
    /// @dev `completed` latches true when `attestationCount` first reaches quorum.
    ///      `disputed` latches true via `dispute` during the challenge window.
    struct Milestone {
        string description;
        string evidenceURI;
        uint256 amount;
        uint64 completedAt;
        uint8 attestationCount;
        bool completed;
        bool claimed;
        bool reclaimed;
        bool disputed;
    }

    /// @notice Packed read model used by the UI (includes live claimable math).
    struct CampaignView {
        address sponsor;
        address beneficiary;
        string title;
        string briefURI;
        uint64 deadline;
        uint64 challengeWindow;
        uint8 quorum;
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
    /// @notice campaignId => account => whether the account may attest miles.
    mapping(uint256 campaignId => mapping(address account => bool)) public isAttestor;
    /// @notice campaignId => mile index => attestor => already attested.
    mapping(uint256 campaignId => mapping(uint256 index => mapping(address account => bool))) public
        hasAttested;
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
    /// @notice Unique attestor count exceeds `MAX_ATTESTORS`.
    error TooManyAttestors();
    /// @notice `quorum == 0` or `quorum > unique attestor count`.
    error InvalidQuorum();
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
    /// @notice Caller is neither the sponsor nor a listed attestor.
    error NotDisputer();
    /// @notice Mile has not reached quorum yet.
    error NotCompleted();
    /// @notice Caller already attested this mile.
    error AlreadyAttested();
    /// @notice Mile already reached quorum.
    error AlreadyCompleted();
    /// @notice Mile was already disputed during its challenge window.
    error AlreadyDisputed();
    /// @notice Mile was already reclaimed after the deadline.
    error AlreadyReclaimed();
    /// @notice Dispute attempted after `completedAt + challengeWindow`.
    error ChallengeWindowClosed();
    /// @notice Claim called with no completed-undisputed-unclaimed amounts whose window elapsed.
    error NothingToClaim();
    /// @notice Reclaim called with no incomplete/disputed unreclaimed amounts.
    error NothingToReclaim();
    /// @notice Reclaim called while `block.timestamp <= deadline`.
    error DeadlineNotPassed();

    /// @notice A campaign was created and `totalAmount` USDC pulled from the sponsor.
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed sponsor,
        address indexed beneficiary,
        uint256 totalAmount,
        uint64 deadline,
        uint8 quorum,
        uint64 challengeWindow
    );
    /// @notice An attestor recorded a vote toward quorum. `attestationCount` is post-increment.
    event MilestoneAttested(
        uint256 indexed campaignId,
        uint256 indexed index,
        address indexed attestor,
        string evidenceURI,
        uint8 attestationCount,
        uint8 quorum
    );
    /// @notice Quorum reached. `attestor` is the caller who tipped the count.
    ///         `evidenceURI` is the stored (first non-empty) URI.
    event MilestoneCompleted(
        uint256 indexed campaignId,
        uint256 indexed index,
        address indexed attestor,
        string evidenceURI
    );
    /// @notice Sponsor or attestor disputed a completed mile during its challenge window.
    event MilestoneDisputed(
        uint256 indexed campaignId, uint256 indexed index, address indexed disputer
    );
    /// @notice Beneficiary withdrew the sum of claimable, previously unclaimed miles.
    event Claimed(uint256 indexed campaignId, address indexed beneficiary, uint256 amount);
    /// @notice Sponsor withdrew USDC still locked on incomplete or disputed miles after the deadline.
    event Reclaimed(uint256 indexed campaignId, address indexed sponsor, uint256 amount);

    /// @param usdc_ Circle USDC (or MockERC20 in tests). Must be non-zero.
    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    /// @notice Create a campaign and pull `sum(amounts)` USDC from the sponsor.
    /// @dev Caller must `approve` this contract for the total first.
    ///      `attestors` is an N-of-M set: each listed address may attest once per mile.
    ///      The mile completes when `attestationCount >= quorum`.
    /// @param beneficiary Recipient of completed-mile claims. Not zero.
    /// @param attestors Unique set after skipping duplicates. Zero addresses revert.
    /// @param quorum Number of distinct attestors required per mile.
    ///        Must satisfy `1 <= quorum <= unique(attestors).length`.
    /// @param title Human title stored onchain.
    /// @param briefURI Optional https / ipfs pointer to a longer brief.
    /// @param deadline Unix seconds; must be strictly greater than `block.timestamp`.
    /// @param challengeWindow Seconds after completion during which `dispute` is allowed.
    ///        `0` disables the window (claimable immediately — useful for tests and demos).
    /// @param descriptions Parallel to `amounts`. Empty array reverts.
    /// @param amounts USDC base units per mile. Each must be > 0.
    /// @return campaignId Newly assigned id (`campaignCount` before increment).
    function createCampaign(
        address beneficiary,
        address[] calldata attestors,
        uint8 quorum,
        string calldata title,
        string calldata briefURI,
        uint64 deadline,
        uint64 challengeWindow,
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
            challengeWindow: challengeWindow,
            quorum: quorum,
            milestoneCount: len,
            createdAt: block.timestamp,
            title: title,
            briefURI: briefURI
        });

        uint256 unique = _setAttestors(campaignId, attestors);
        if (quorum == 0 || quorum > unique) revert InvalidQuorum();

        for (uint256 i; i < len; ++i) {
            milestones[campaignId][i] = Milestone({
                description: descriptions[i],
                evidenceURI: "",
                amount: amounts[i],
                completedAt: 0,
                attestationCount: 0,
                completed: false,
                claimed: false,
                reclaimed: false,
                disputed: false
            });
        }

        usdc.safeTransferFrom(msg.sender, address(this), total);
        emit CampaignCreated(
            campaignId, msg.sender, beneficiary, total, deadline, quorum, challengeWindow
        );
    }

    /// @notice Record an attestor vote on a milestone. Completes the mile when quorum is hit.
    /// @dev Any-order. Empty evidence is valid. First non-empty URI wins.
    ///      After quorum the mile cannot be attested further (`AlreadyCompleted`).
    /// @param campaignId Existing campaign.
    /// @param index Mile index in `[0, milestoneCount)`.
    /// @param evidenceURI Optional https / ipfs pointer; empty string is valid.
    function attestMilestone(uint256 campaignId, uint256 index, string calldata evidenceURI)
        external
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        if (!isAttestor[campaignId][msg.sender]) revert NotAttestor();
        if (index >= campaign.milestoneCount) revert InvalidIndex();

        Milestone storage milestone = milestones[campaignId][index];
        if (milestone.reclaimed) revert AlreadyReclaimed();
        if (milestone.completed) revert AlreadyCompleted();
        if (hasAttested[campaignId][index][msg.sender]) revert AlreadyAttested();

        hasAttested[campaignId][index][msg.sender] = true;
        uint8 count;
        unchecked {
            count = milestone.attestationCount + 1;
        }
        milestone.attestationCount = count;

        if (bytes(milestone.evidenceURI).length == 0 && bytes(evidenceURI).length != 0) {
            milestone.evidenceURI = evidenceURI;
        }

        emit MilestoneAttested(
            campaignId, index, msg.sender, evidenceURI, count, campaign.quorum
        );

        if (count >= campaign.quorum) {
            milestone.completed = true;
            milestone.completedAt = uint64(block.timestamp);
            emit MilestoneCompleted(campaignId, index, msg.sender, milestone.evidenceURI);
        }
    }

    /// @notice Sponsor or any listed attestor disputes a completed mile during its window.
    /// @dev Sticky: there is no onchain resolution. The mile is never claimable afterwards.
    ///      After the campaign deadline the sponsor may reclaim its amount.
    /// @param campaignId Existing campaign.
    /// @param index Mile index in `[0, milestoneCount)`.
    function dispute(uint256 campaignId, uint256 index) external {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        if (msg.sender != campaign.sponsor && !isAttestor[campaignId][msg.sender]) {
            revert NotDisputer();
        }
        if (index >= campaign.milestoneCount) revert InvalidIndex();

        Milestone storage milestone = milestones[campaignId][index];
        if (!milestone.completed) revert NotCompleted();
        if (milestone.disputed) revert AlreadyDisputed();
        if (milestone.reclaimed) revert AlreadyReclaimed();
        if (block.timestamp >= uint256(milestone.completedAt) + uint256(campaign.challengeWindow)) {
            revert ChallengeWindowClosed();
        }

        milestone.disputed = true;
        emit MilestoneDisputed(campaignId, index, msg.sender);
    }

    /// @notice Beneficiary withdraws the sum of claimable, unclaimed milestones.
    /// @dev A mile is claimable after its challenge window with no dispute.
    /// @param campaignId Existing campaign.
    function claim(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        if (msg.sender != campaign.beneficiary) revert NotBeneficiary();

        uint256 payout = _collectClaimable(campaignId, campaign);
        if (payout == 0) revert NothingToClaim();

        usdc.safeTransfer(campaign.beneficiary, payout);
        emit Claimed(campaignId, campaign.beneficiary, payout);
    }

    /// @notice After the deadline, sponsor pulls USDC still locked on incomplete or disputed miles.
    /// @dev Completed-and-undisputed amounts stay claimable by the beneficiary (after the window).
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
        view_.challengeWindow = campaign.challengeWindow;
        view_.quorum = campaign.quorum;
        view_.milestoneCount = campaign.milestoneCount;
        view_.createdAt = campaign.createdAt;
        view_.claimable = _peekClaimable(campaignId, campaign);
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

    /// @notice Distinct attestors who have already attested `index`, in attestor-list order.
    /// @param campaignId Existing campaign.
    /// @param index Mile index in `[0, milestoneCount)`.
    function attestedBy(uint256 campaignId, uint256 index)
        external
        view
        returns (address[] memory list)
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        if (index >= campaign.milestoneCount) revert InvalidIndex();

        address[] storage attestors = _attestors[campaignId];
        uint256 n = attestors.length;
        uint256 count;
        for (uint256 i; i < n; ++i) {
            if (hasAttested[campaignId][index][attestors[i]]) ++count;
        }
        list = new address[](count);
        uint256 w;
        for (uint256 i; i < n; ++i) {
            address account = attestors[i];
            if (hasAttested[campaignId][index][account]) {
                list[w] = account;
                unchecked {
                    ++w;
                }
            }
        }
    }

    /// @notice Whether `account` has already attested each mile. Parallel to `getMilestones`.
    /// @param campaignId Existing campaign.
    /// @param account Any address (zero returns all-false).
    function hasAttestedAll(uint256 campaignId, address account)
        external
        view
        returns (bool[] memory flags)
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        uint256 len = campaign.milestoneCount;
        flags = new bool[](len);
        if (account == address(0)) return flags;
        for (uint256 i; i < len; ++i) {
            flags[i] = hasAttested[campaignId][i][account];
        }
    }

    /// @notice Sum of completed, undisputed, unclaimed milestone amounts whose window elapsed.
    /// @param campaignId Existing campaign.
    function claimableAmount(uint256 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        return _peekClaimable(campaignId, campaign);
    }

    /// @notice Sum still locked on incomplete or disputed miles if the deadline has passed; else 0.
    /// @param campaignId Existing campaign.
    function reclaimableAmount(uint256 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.sponsor == address(0)) revert CampaignNotFound();
        return _peekReclaimable(campaignId, campaign);
    }

    /// @dev Dedupes attestors; zero addresses revert; empty unique set reverts.
    ///      Returns the unique count for quorum checks.
    function _setAttestors(uint256 campaignId, address[] calldata attestors)
        internal
        returns (uint256 unique)
    {
        uint256 n = attestors.length;
        for (uint256 i; i < n; ++i) {
            address account = attestors[i];
            if (account == address(0)) revert ZeroAddress();
            if (isAttestor[campaignId][account]) continue;
            isAttestor[campaignId][account] = true;
            _attestors[campaignId].push(account);
        }
        unique = _attestors[campaignId].length;
        if (unique == 0) revert EmptyAttestors();
        if (unique > MAX_ATTESTORS) revert TooManyAttestors();
    }

    /// @dev Completed && !claimed && !disputed && window elapsed.
    function _isClaimable(Milestone storage milestone, Campaign storage campaign)
        internal
        view
        returns (bool)
    {
        if (!milestone.completed || milestone.claimed || milestone.disputed || milestone.reclaimed) {
            return false;
        }
        return block.timestamp >= uint256(milestone.completedAt) + uint256(campaign.challengeWindow);
    }

    /// @dev Incomplete or disputed, not yet claimed/reclaimed.
    function _isReclaimable(Milestone storage milestone) internal view returns (bool) {
        if (milestone.claimed || milestone.reclaimed) return false;
        return !milestone.completed || milestone.disputed;
    }

    function _peekClaimable(uint256 campaignId, Campaign storage campaign)
        internal
        view
        returns (uint256 payout)
    {
        uint256 len = campaign.milestoneCount;
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (_isClaimable(milestone, campaign)) {
                payout += milestone.amount;
            }
        }
    }

    /// @dev 0 until deadline passes; then incomplete or disputed, unreclaimed.
    function _peekReclaimable(uint256 campaignId, Campaign storage campaign)
        internal
        view
        returns (uint256 payout)
    {
        if (block.timestamp <= campaign.deadline) return 0;
        uint256 len = campaign.milestoneCount;
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (_isReclaimable(milestone)) {
                payout += milestone.amount;
            }
        }
    }

    /// @dev Marks matching miles claimed and returns the payout.
    function _collectClaimable(uint256 campaignId, Campaign storage campaign)
        internal
        returns (uint256 payout)
    {
        uint256 len = campaign.milestoneCount;
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (_isClaimable(milestone, campaign)) {
                milestone.claimed = true;
                payout += milestone.amount;
            }
        }
    }

    /// @dev Marks matching miles reclaimed and returns the payout.
    function _collectReclaimable(uint256 campaignId, uint256 len) internal returns (uint256 payout) {
        for (uint256 i; i < len; ++i) {
            Milestone storage milestone = milestones[campaignId][i];
            if (_isReclaimable(milestone)) {
                milestone.reclaimed = true;
                payout += milestone.amount;
            }
        }
    }
}
