pragma solidity ^0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
import '../interfaces/IZirconPTFactory.sol';
import '../energy/interfaces/IZirconEnergyFactory.sol';
// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation

contract Migrator {

    // immutables

    address public owner;
    address public energyFactory;
    address public ptFactory;
    modifier onlyOwner {
        require(msg.sender == owner, 'ZPT: FORBIDDEN');
        _;
    }

    constructor(address factory_, address ptFactory_) public {
        energyFactory = factory_;
        ptFactory = ptFactory_;
    }

    // allows owner to change itself at any time
    function setOwner(address owner_) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }

    // allows owner to change itself at any time
    function changePylonAddress(address oldPylonA, address newPylonA, address oldPylonB, address newPylonB, address tokenA, address tokenB, address pylonFactory, address pair) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');

        IZirconEnergyFactory(energyFactory).changePylonAddress(oldPylonA, newPylonA, oldPylonB, newPylonB, pair, tokenA, tokenB);

        IZirconPTFactory(ptFactory).changePylonAddress(oldPylonA, tokenA, tokenB, newPylonA, pylonFactory);
        IZirconPTFactory(ptFactory).changePylonAddress(oldPylonB, tokenB, tokenA, newPylonB, pylonFactory);
    }

}
