pragma solidity >=0.5.16;

interface IZirconPylonFactory {
    function maximumPercentageSync() external view returns (uint);

    function deltaGammaThreshold() external view returns (uint);
    function deltaGammaMinFee() external view returns (uint);
    function muUpdatePeriod() external view returns (uint);

    function allPylons(uint p) external view returns (address);
    function getPylon(address tokenA, address tokenB) external view returns (address pair);
    function factory() external view returns (address);
    function energyFactory() external view returns (address);
    event PylonCreated(address indexed token0, address indexed token1, address poolToken0, address poolToken1, address pylon, address pair);
    function allPylonsLength() external view returns (uint);
    function paused() external view returns (bool);
    // Adding Pylon
    // First Token is always the Float and the second one is the Anchor
    function addPylon(address _pairAddress, address _tokenA, address _tokenB) external returns (address pylonAddress);
    function addPylonCustomPT(address _pairAddress, address _tokenA, address _tokenB, address floatPTAddress, address anchorPTAddress) external returns (address pylonAddress);
    function setFeeToSetter(address) external;
    function setFees(uint _maximumPercentageSync, uint _deltaGammaThreshold, uint _deltaGammaMinFee) external;

    function changeEnergyAddress(address _newEnergy, address _pylonAddress) external;
    function migrateLiquidity(address _oldPylon, address _newPylon) external;
    function startPylon(address _pylon, uint _gamma, uint _vab) external;
}
