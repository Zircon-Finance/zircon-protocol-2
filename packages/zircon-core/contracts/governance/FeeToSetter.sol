pragma solidity ^0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
import '../interfaces/IZirconFactory.sol';
import '../energy/interfaces/IZirconEnergyFactory.sol';
import 'hardhat/console.sol';

// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation
contract FeeToSetter {
    // immutables
    address public factory;
    address public energyFactory;
    address public pylonFactory;
    address public owner;

    modifier onlyOwner {
        require(msg.sender == owner, 'ZPT: FORBIDDEN');
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function initialize(address factory_, address energyFactory_, address pylonFactory_) public onlyOwner {
        factory = factory_;
        energyFactory = energyFactory_;
        pylonFactory = pylonFactory_;
    }

    // allows owner to change itself at any time
    function setOwner(address owner_) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }

    // allows owner to change feeToSetter after vesting
    function setFeeToSetter(address feeToSetter_) public onlyOwner {
        IZirconPylonFactory(pylonFactory).setFeeToSetter(feeToSetter_);
        IZirconEnergyFactory(energyFactory).setFeeToSetter(feeToSetter_);
//        IZirconFactory(factory).setFeeToSetter(feeToSetter_);
    }

    function setFees(uint _maximumPercentageSync, uint _deltaGammaTreshold, uint _deltaGammaMinFee, uint _muUpdatePeriod) external onlyOwner {
        console.log("Setting fees");
        IZirconPylonFactory(pylonFactory).setFees(_maximumPercentageSync, _deltaGammaTreshold, _deltaGammaMinFee, _muUpdatePeriod);
    }


    function setMinMaxFee(uint112 minFee, uint112 maxFee) external onlyOwner {
        IZirconEnergyFactory(energyFactory).setFee(minFee, maxFee);
    }
}
