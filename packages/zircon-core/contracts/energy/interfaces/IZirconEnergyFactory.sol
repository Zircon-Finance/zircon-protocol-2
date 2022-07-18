pragma solidity =0.5.16;

interface IZirconEnergyFactory {

    // Variables
    function allEnergies(uint p) external view returns (address);
    function insurancePerMille() external view returns (uint);
    function getEnergy(address _tokenA, address _tokenB) external view returns (address pair);
    function allEnergiesLength() external view returns (uint);
    function feeToSetter() external pure returns (address);
    function setMigrator(address _migrator) external;
    function setFeeToSetter(address _feeToSetter) external;
    function setInsurancePerMille(uint _insurancePerMille) external;

    // Functions
    function createEnergy(address, address, address, address) external returns (address energy);
    function createEnergyRev(address, address, address, address) external returns (address energy);
    function setFee(uint112 _minPylonFee, uint112 _maxPylonFee) external;
    function getMinMaxFee() external view returns (uint112 minFee, uint112 maxFee);

    function migrateEnergyLiquidity(address pair, address token, address newEnergy) external;
    function migrateEnergyRevenue(address oldEnergy, address newEnergy) external;
}
