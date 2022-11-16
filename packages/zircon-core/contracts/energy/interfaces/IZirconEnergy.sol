pragma solidity =0.5.16;

interface IZirconEnergy {
    function initialize(address _pylon, address _pair, address _token0, address _token1) external;
//    function breakPiggybank(uint _requestedLiquidity) external returns (uint returnedLiquidity);
//    function syncPylonFee() external;
//    function syncPairFee() external;
    function getFeeByGamma(uint gammaMulDecimals) external view returns (uint amount);
    function registerFee() external;
    function syncReserve() external;
    function migrateLiquidity(address newEnergy) external;
    function _updateMu(uint muUpdatePeriod, uint muChangeFactor, uint muBlockNumber, uint muMulDecimals, uint gammaMulDecimals, uint muOldGamma) view external returns (uint mu);
    function handleOmegaSlashing(uint ptu, uint omegaMulDecimals, uint fee, bool isFloatReserve0, address _to) external returns (uint retPTU, uint amount);
}
