pragma solidity =0.5.16;

interface IZirconEnergyFactory {
    // Events
    event EnergyCreated(address indexed pylon, address pair, address energy, address tokenA, address tokenB, uint);
    // Variables
    function allEnergies(uint p) external view returns (address);
    function getEnergy(address pylon) external view returns (address pair);
    function allEnergiesLength() external view returns (uint);
    function energyCodeHash() external pure returns (bytes32);
    // Functions
    function createEnergy(address _pylon, address _pair, address _tokenA, address _tokenB) external returns (address energy);
}
