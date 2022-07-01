pragma solidity ^0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation
contract FeeToSetter {
    // immutables
    address public factory;
    uint public vestingEnd;
    address public feeTo;

    address public owner;

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
    function setFeeToSetter(address feeToSetter_) public {
        require(block.timestamp >= vestingEnd, 'FeeToSetter::setFeeToSetter: not time yet');
        require(msg.sender == owner, 'FeeToSetter::setFeeToSetter: not allowed');
        IZirconPylonFactory(factory).setFeeToSetter(feeToSetter_);
    }


    function setMaximumPercentageSync(uint _maximumPercentageSync) external {
        require(msg.sender == owner, 'ZF: FORBIDDEN');
        IZirconPylonFactory(factory).setMaximumPercentageSync(_maximumPercentageSync);
    }

    function setDeltaGammaThreshold(uint _deltaGammaThreshold) external {
        require(msg.sender == owner, 'ZF: FORBIDDEN');
        IZirconPylonFactory(factory).setDeltaGammaThreshold(_deltaGammaThreshold);
    }
    function setDeltaGammaMinFee(uint _deltaGammaMinFee) external {
        require(msg.sender == owner, 'ZF: FORBIDDEN');
        IZirconPylonFactory(factory).setDeltaGammaMinFee(_deltaGammaMinFee);
    }
}
