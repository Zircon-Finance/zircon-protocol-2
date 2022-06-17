pragma solidity >=0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract Token is ERC20 {

    uint256 public MINTED_AMOUNT = 5 ether;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) public {
        _mint(msg.sender, 1000000000000000000000000);
    }

    function mintTokens() public {
        // Mints the defined amount of tokens for the caller
        _mint(msg.sender, MINTED_AMOUNT);
    }

}
