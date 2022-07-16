pragma solidity ^0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
import '../energy/interfaces/IZirconEnergyFactory.sol';
// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation

contract PylonMigrator {

    // immutables
    address public factory;
    uint public vestingEnd;
    address public feeTo;

    address public owner;
    modifier onlyOwner {
        require(msg.sender == owner, 'ZPT: FORBIDDEN');
        _;
    }

    constructor(address factory_) public {
        factory = factory_;
    }

    // allows owner to change itself at any time
    function setOwner(address owner_) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }



}
