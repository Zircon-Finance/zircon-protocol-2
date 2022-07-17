pragma solidity =0.5.16;

interface IZirconEnergyFactory {

    // Variables
    function allEnergies(uint p) external view returns (address);
    function getEnergy(address _tokenA, address _tokenB) external view returns (address pair);
    function allEnergiesLength() external view returns (uint);
    function feeToSetter() external pure returns (address);

    // Functions
    function createEnergy(address, address, address, address) external returns (address energy);
    function createEnergyRev(address, address, address, address) external returns (address energy);
    function setFee(uint112 _minPylonFee, uint112 _maxPylonFee) external;
    function getMinMaxFee() external view returns (uint112 minFee, uint112 maxFee);
    function changePylonAddress(address oldPylonA, address newPylonA, address oldPylonB, address newPylonB, address pair, address tokenA, address tokenB) external;

    function migrateEnergyLiquidity(address oldEnergy, address newEnergy) external;

    function migrateEnergyRevenue(address oldEnergy, address newEnergy) external;
}
