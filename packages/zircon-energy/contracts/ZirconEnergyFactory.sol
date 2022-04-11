// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
import "./ZirconEnergy.sol";

contract ZirconEnergyFactory {
    mapping(address => mapping(address => address)) public getEnergy;
    address[] public allEnergies;

    event EnergyCreated(address indexed pylon0, address indexed pylon1, address pair, address energy, uint);

    constructor() public {}

    function allEnergiesLength() external view returns (uint) {
        return allEnergies.length;
    }

    function energyCodeHash() external pure returns (bytes32) {
        return keccak256(type(ZirconEnergy).creationCode);
    }

    function createEnergy(address pylonA, address pylonB, address pair) external returns (address energy) {
        require(pylonA != pylonB, 'ZE: IDENTICAL_ADDRESSES');
        (address pylon0, address pylon1) = pylonA < pylonB ? (pylonA, pylonB) : (pylonB, pylonA);
        require(pylon0 != address(0), 'ZE: ZERO_ADDRESS');
        require(getEnergy[pylon0][pylon1] == address(0), 'ZE: ENERGY_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(ZirconEnergy).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(pylon0, pylon1, pair));
        assembly {
            energy := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        ZirconEnergy(energy).initialize(pylon0, pylon1);
        getEnergy[pylon0][pylon1] = energy;
        getEnergy[pylon1][pylon0] = energy; // populate mapping in the reverse direction
        allEnergies.push(energy);
        emit EnergyCreated(pylon0, pylon1, pair, energy, allEnergies.length);
    }
}
