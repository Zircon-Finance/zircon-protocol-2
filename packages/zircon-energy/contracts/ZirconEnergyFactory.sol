// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
import "./ZirconEnergy.sol";

contract ZirconEnergyFactory {
    mapping(address => address) public getEnergy;
    address[] public allEnergies;

    event EnergyCreated(address indexed pylon, address pair, address energy, uint);

    constructor() public {}

    function allEnergiesLength() external view returns (uint) {
        return allEnergies.length;
    }

    function energyCodeHash() external pure returns (bytes32) {
        return keccak256(type(ZirconEnergy).creationCode);
    }

    function createEnergy(address pylon, address pair) external returns (address energy) {
        require(pylon != address(0), 'ZE: ZERO_ADDRESS');
        require(getEnergy[pylon] == address(0), 'ZE: ENERGY_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(ZirconEnergy).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(pylon, pair));
        assembly {
            energy := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        ZirconEnergy(energy).initialize(pylon);
        getEnergy[pylon] = energy;
        allEnergies.push(energy);
        emit EnergyCreated(pylon, pair, energy, allEnergies.length);
    }
}
