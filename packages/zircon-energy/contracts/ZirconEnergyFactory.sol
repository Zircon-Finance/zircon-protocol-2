// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
import "./ZirconEnergy.sol";
import "./interfaces/IZirconEnergyFactory.sol";
import "zircon-protocol/contracts/core/ZirconPair.sol";

contract ZirconEnergyFactory is IZirconEnergyFactory{
    mapping(address => address) public getEnergy;
    address[] public allEnergies;

    event EnergyCreated(address indexed pylon, address pair, address energy, address tokenA, address tokenB, uint);

    constructor() public {}

    function allEnergiesLength() external view returns (uint) {
        return allEnergies.length;
    }

    function energyCodeHash() external pure returns (bytes32) {
        return keccak256(type(ZirconEnergy).creationCode);
    }

    function createEnergy(address _pylon, address _pair, address _tokenA, address _tokenB) external returns (address energy) {
        require(_tokenA != _tokenB, 'ZF: IDENTICAL_ADDRESS');
        require(_pylon != address(0) && _pair != address(0), 'ZE: ZERO_ADDRESS');
        require(getEnergy[_pylon] == address(0), 'ZE: ENERGY_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(ZirconEnergy).creationCode;
        require(bytecode.length != 0, "Create2: bytecode length is zero");
        bytes32 salt = keccak256(abi.encodePacked(_pair, _tokenA));
        assembly {
            energy := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        console.log("energy", energy);

        require(energy != address(0), "Create2: Failed on deploy");
        IZirconEnergy(energy).initialize(_pylon, _pair, _tokenA, _tokenB, 100);
        getEnergy[_pylon] = energy;
        allEnergies.push(energy);
        emit EnergyCreated(_pylon, _pair, energy, _tokenA, _tokenB, allEnergies.length);
    }
}
