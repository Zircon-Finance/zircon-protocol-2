// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./PsionicFarmInitializable.sol";
import "./PsionicFarmVault.sol";

contract PsionicFarmFactory is Ownable {
    event NewPsionicFarmContract(address indexed psionicFarm);
    constructor() {}
    /*
     * @notice Deploy the pool
     * @param _stakedToken: staked token address
     * @param _rewardToken: reward token address
     * @param _rewardPerBlock: reward per block (in rewardToken)
     * @param _startBlock: start block
     * @param _endBlock: end block
     * @param _poolLimitPerUser: pool limit per user in stakedToken (if any, else 0)
     * @param _numberBlocksForUserLimit: block numbers available for user limit (after start block)
     * @param _admin: admin address with ownership
     * @return address of new psionicFarm contract
     */
    function deployPool(
        IERC20Metadata _stakedToken,
        address[] memory rewardTokens,
        uint256 _startBlock,
        uint256 _bonusEndBlock,
        uint256 _poolLimitPerUser,
        uint256 _numberBlocksForUserLimit,
        address _admin
    ) external onlyOwner returns (address psionicFarmAddress){
        require(_stakedToken.totalSupply() >= 0);
        require(_bonusEndBlock > _startBlock);

        address psionicVault;
        bytes memory bytecodeVault = type(PsionicFarmVault).creationCode;
        bytes32 saltVault = keccak256(abi.encodePacked(_stakedToken, _startBlock));

        assembly {
            psionicVault := create2(0, add(bytecodeVault, 32), mload(bytecodeVault), saltVault)
        }

        bytes memory bytecode = type(PsionicFarmInitializable).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_stakedToken, psionicVault, _startBlock));

        assembly {
            psionicFarmAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        PsionicFarmVault(psionicVault).initialize(
            rewardTokens,
            _bonusEndBlock-_startBlock,
            psionicFarmAddress
        );

        PsionicFarmInitializable(psionicFarmAddress).initialize(
            _stakedToken,
            IERC20Metadata(psionicVault),
            _startBlock,
            _bonusEndBlock,
            _poolLimitPerUser,
            _numberBlocksForUserLimit,
            _admin
        );

        emit NewPsionicFarmContract(psionicFarmAddress);
    }
}
