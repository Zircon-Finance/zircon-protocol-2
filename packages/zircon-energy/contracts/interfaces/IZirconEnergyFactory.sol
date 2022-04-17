pragma solidity =0.5.16;

interface IZirconEnergyFactory {

    // Events
    event EnergyCreated(address indexed pylon, address pair, address energy, address tokenA, address tokenB, uint);

    // Variables
    function allEnergies(uint p) external view returns (address);
    function getEnergy(address _tokenA, address _tokenB) external view returns (address pair);
    function allEnergiesLength() external view returns (uint);
    function energyCodeHash() external pure returns (bytes32);

    // Functions
    function createEnergy(address, address, address, address) external returns (address energy);
    function createEnergyRevenue(address _pair, address _tokenA, address _tokenB, address _pylonFactory) external returns (address energy);

}
