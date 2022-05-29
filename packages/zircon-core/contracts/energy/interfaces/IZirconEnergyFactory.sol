pragma solidity =0.5.16;

interface IZirconEnergyFactory {

    // Variables
    function allEnergies(uint p) external view returns (address);
    function getEnergy(address _tokenA, address _tokenB) external view returns (address pair);
    function allEnergiesLength() external view returns (uint);
    function energyCodeHash() external pure returns (bytes32);

    // Functions
    function createEnergy(address, address, address, address) external returns (address energy);
    function createEnergyRev(address, address, address, address) external returns (address energy);

}
