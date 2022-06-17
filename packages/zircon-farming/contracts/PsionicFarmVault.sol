// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PsionicFarmVault is ERC20, Ownable, ReentrancyGuard {

    // Array that contains the reward tokens
    address[] public rewardTokens;

    // Whether it is initialized
    bool public isInitialized;

    // Address of the Psionic Factory
    address public PSIONIC_FACTORY;

    // transfering tokens
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    constructor() ERC20("Psionic", "PT") {
        PSIONIC_FACTORY = msg.sender;
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2: TRANSFER_FAILED');
    }

    /*
     *   @notice: Initialize the contract
     *   @param _tokens: array of tokens
     *   @param _initialSupply: supply to mint initially
     *   @param _farm: Farm Address
    */
    function initialize(
        address[] memory _tokens,
        uint _initialSupply,
        address _farm
    )  external  {
        require(!isInitialized, "Already initialized");
        require(msg.sender == PSIONIC_FACTORY, "Not factory");

        // Make this contract initialized
        isInitialized = true;

        // Saving tokens
        rewardTokens = _tokens;

        // Minting initial Supply to Psionic Farm
        _mint(_farm, _initialSupply);

        // Transfer ownership to the admin address who becomes owner of the contract
        transferOwnership(_farm);
    }

    /*
    *   @notice Mints amount of tokens to the owner
    *   @param _amount: of tokens to mint
    */
    function adjust(uint _amount, bool shouldMint) external onlyOwner nonReentrant {
        if (shouldMint) {
            _mint(address(owner()), _amount);
        } else {
            _burn(address(owner()), _amount);
        }
    }

    /*
    *   @notice Burn Function to withdraw tokens
    *   @param _to: the address to send the rewards token
    */
    function burn(address _to, uint _liquidity) external onlyOwner nonReentrant {
        require(_liquidity > 0, "PFV: Not enough");

        address[] memory tokensToWithdraw = rewardTokens;
        uint tokenLength = tokensToWithdraw.length;
        uint ts = totalSupply();

        for (uint256 i = 0; i < tokenLength; i++) {
            address token = tokensToWithdraw[i];
            uint balance = ERC20(token).balanceOf(address(this));
            uint amount = balance * (_liquidity)/ts;
            _safeTransfer(token, _to, amount);
        }

        _burn(owner(), _liquidity);
    }

}
