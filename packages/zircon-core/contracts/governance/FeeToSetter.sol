pragma solidity ^0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
import '../energy/interfaces/IZirconEnergyFactory.sol';
// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation
contract FeeToSetter {
    // immutables
    address public factory;
    address public energyFactory;
    uint public vestingEnd;
    address public feeTo;

    address public owner;
    modifier onlyOwner {
        require(msg.sender == owner, 'ZPT: FORBIDDEN');
        _;
    }

    constructor() public {
        owner = msg.sender;
    }
    function initialize(address factory_, address energyFactory_, uint vestingEnd_) public onlyOwner {
        //require(vestingEnd_ > block.timestamp, 'FeeToSetter::initialize: vesting must end after deployment');
        //TODO: fix deployment params before reenabling this
        factory = factory_;
        vestingEnd = vestingEnd_;
        energyFactory = energyFactory_;
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

    function setMinMaxFee(uint112 minFee, uint112 maxFee) external onlyOwner {
        IZirconEnergyFactory(energyFactory).setFee(minFee, maxFee);
    }
}
