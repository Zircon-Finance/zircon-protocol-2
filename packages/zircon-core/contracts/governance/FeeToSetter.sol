pragma solidity ^0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
import '../energy/interfaces/IZIrconEnergyFactory.sol';
// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation
contract FeeToSetter {
    // immutables
    address public factory;
    uint public vestingEnd;
    address public feeTo;

    address public owner;
    modifier onlyOwner {
        require(msg.sender == owner, 'ZPT: FORBIDDEN');
        _;
    }

    constructor(address factory_, uint vestingEnd_, address owner_, address feeTo_) public {
        require(vestingEnd_ > block.timestamp, 'FeeToSetter::constructor: vesting must end after deployment');
        factory = factory_;
        vestingEnd = vestingEnd_;
        owner = owner_;
        feeTo = feeTo_;
    }

    // allows owner to change itself at any time
    function setOwner(address owner_) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }


    // allows owner to change feeToSetter after vesting
    function setFeeToSetter(address feeToSetter_) public  onlyOwner{
        require(block.timestamp >= vestingEnd, 'FeeToSetter::setFeeToSetter: not time yet');
        IZirconPylonFactory(factory).setFeeToSetter(feeToSetter_);
    }


    function setMaximumPercentageSync(uint _maximumPercentageSync) external onlyOwner {
        IZirconPylonFactory(factory).setMaximumPercentageSync(_maximumPercentageSync);
    }

    function setDeltaGammaThreshold(uint _deltaGammaThreshold) external onlyOwner {
        IZirconPylonFactory(factory).setDeltaGammaThreshold(_deltaGammaThreshold);
    }

    function setDeltaGammaMinFee(uint _deltaGammaMinFee) external onlyOwner {
        IZirconPylonFactory(factory).setDeltaGammaMinFee(_deltaGammaMinFee);
    }

    function setMinMaxFee(uint minFee, uint maxFee) external onlyOwner {
        IZIrconEnergyFactory(factory).setFee(minFee, maxFee);
    }
}
