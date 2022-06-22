// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";


interface IPsionicFarm {

    function PSIONIC_FACTORY() external view returns (address);
    function userLimit() external view returns (bool);
    function isInitialized() external view returns (bool);
    function accTokenPerShare() external view returns (uint256);
    function bonusEndBlock() external view returns (uint256);
    function startBlock() external view returns (uint256);
    function lastRewardBlock() external view returns (uint256);
    function poolLimitPerUser() external view returns (uint256);
    function numberBlocksForUserLimit() external view returns (uint256);
    function rewardPerBlock() external view returns (uint256);
    function PRECISION_FACTOR() external view returns (uint256);
    function rewardToken() external view returns (IERC20Metadata);
    function stakedToken() external view returns (IERC20Metadata);

    /*
     * @notice Initialize the contract
     * @param _stakedToken: staked token address
     * @param _rewardToken: reward token address
     * @param _rewardPerBlock: reward per block (in rewardToken)
     * @param _startBlock: start block
     * @param _bonusEndBlock: end block
     * @param _poolLimitPerUser: pool limit per user in stakedToken (if any, else 0)
     * @param _numberBlocksForUserLimit: block numbers available for user limit (after start block)
     * @param _admin: admin address with ownership
     */
    function initialize(
        IERC20Metadata _stakedToken,
        IERC20Metadata _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock,
        uint256 _poolLimitPerUser,
        uint256 _numberBlocksForUserLimit,
        address _admin
    ) external;

    /*
     * @notice Deposit staked tokens and collect reward tokens (if any)
     * @param _amount: amount to withdraw (in rewardToken)
     */
    function deposit(uint256 _amount) external;

    /*
     * @notice Withdraw staked tokens and collect reward tokens
     * @param _amount: amount to withdraw (in rewardToken)
     */
    function withdraw(uint256 _amount) external;

    /*
     * @notice Withdraw staked tokens without caring about rewards rewards
     * @dev Needs to be for emergency.
     */
    function emergencyWithdraw() external;

    /*
     * @notice Stop rewards
     * @dev Only callable by owner. Needs to be for emergency.
     */
    function emergencyRewardWithdraw(uint256 _amount) external;

    /**
     * @notice Allows the owner to recover tokens sent to the contract by mistake
     * @param _token: token address
     * @dev Callable by owner
     */
    function recoverToken(address _token) external;

    /*
     * @notice Stop rewards
     * @dev Only callable by owner
     */
    function stopReward() external;

    /*
     * @notice Update pool limit per user
     * @dev Only callable by owner.
     * @param _userLimit: whether the limit remains forced
     * @param _poolLimitPerUser: new pool limit per user
     */
    function updatePoolLimitPerUser(bool _userLimit, uint256 _poolLimitPerUser) external;

    /*
     * @notice Update reward per block
     * @dev Only callable by owner.
     * @param _rewardPerBlock: the reward per block
     */
    function updateRewardPerBlock(uint256 _rewardPerBlock) external;
    /**
     * @notice It allows the admin to update start and end blocks
     * @dev This function is only callable by owner.
     * @param _startBlock: the new start block
     * @param _bonusEndBlock: the new end block
     */
    function updateStartAndEndBlocks(uint256 _startBlock, uint256 _bonusEndBlock) external;

    /*
     * @notice View function to see pending reward on frontend.
     * @param _user: user address
     * @return Pending reward for a given user
     */
    function pendingReward(address _user) external view returns (uint256);

    /*
     * @notice Return user limit is set or zero.
     */
    function hasUserLimit() external view returns (bool);

}
