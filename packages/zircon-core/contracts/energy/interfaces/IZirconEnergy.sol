pragma solidity ^0.5.16;

interface IZirconEnergy {
    function initialize(address _pylon, address _pair, address _token0, address _token1, uint _insurancePerMille) external;
    function breakPiggybank(uint _requestedLiquidity) external returns (uint returnedLiquidity);
    function syncPylonFee() external;
    function syncPairFee() external;
}
