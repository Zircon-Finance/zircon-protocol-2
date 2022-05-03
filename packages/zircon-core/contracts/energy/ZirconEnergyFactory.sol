// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
import "./ZirconEnergy.sol";
import "./ZirconEnergyRevenue.sol";
import "./interfaces/IZirconEnergyFactory.sol";
import "./interfaces/IZirconEnergyRevenue.sol";

contract ZirconEnergyFactory is IZirconEnergyFactory{
    mapping(address => mapping(address => address)) public getEnergy;
    mapping(address => mapping(address => address)) public getEnergyRevenue;
    address[] public allEnergies;
    address[] public allEnergiesRevenue;

    event EnergyCreated(address indexed pair, address indexed energy, address tokenA, address tokenB, uint);

    constructor() public {}

    function allEnergiesLength() external view returns (uint) {
        return allEnergies.length;
    }

    function allEnergiesRevenueLength() external view returns (uint) {
        return allEnergiesRevenue.length;
    }

    function energyCodeHash() external pure returns (bytes32) {
        return keccak256(type(ZirconEnergy).creationCode);
    }
    function energyRevenueCodeHash() external pure returns (bytes32) {
        return keccak256(type(ZirconEnergy).creationCode);
    }

    function energyFor(address tokenA, address pair) internal returns (address energy) {
        energy = address(uint(keccak256(abi.encodePacked(
                hex'ff',
                address(this),
                keccak256(abi.encodePacked(tokenA, pair)),
                hex'70b59aaab68b848676659466c3d0dc4caa0e90d66d182fa9a16554970643f348' // init code hash
            ))));
    }

    function pylonFor(address tokenA, address tokenB, address pair, address pylonFactory) internal returns (address pylon) {
        console.log("pair address", pair);
        pylon = address(uint(keccak256(abi.encodePacked(
                hex'ff',
                pylonFactory,
                keccak256(abi.encodePacked(tokenA, tokenB, pair)),
                hex'eaa34be9dea5307ca9fb916abd42d5e428dc2b05df8b4870315a5b61d9fa5aac' // init code hash
            ))));
    }

    function createEnergyRev(address _pair, address _tokenA, address _tokenB, address _pylonFactory) external returns (address energy) {
        require(_tokenA != _tokenB, 'ZF: IDENTICAL_ADDRESS');
        require(_pair != address(0), 'ZE: ZERO_ADDRESS');
        (address token0, address token1) = _tokenA < _tokenB ? (_tokenA, _tokenB) : (_tokenB, _tokenA);
        require(getEnergyRevenue[token0][token1] == address(0), 'ZE: ENERGY_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(ZirconEnergyRevenue).creationCode;
        require(bytecode.length != 0, "Create2: bytecode length is zero");
        bytes32 salt = keccak256(abi.encodePacked(_pair, token0, token1));
        assembly {
            energy := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        require(energy != address(0), "Create2: Failed on deploy");
        address energy0 = energyFor(token0, _pair);
        address energy1 = energyFor(token1, _pair);
        address pylon0 = pylonFor(token0, token1, _pair, _pylonFactory);
        address pylon1 = pylonFor(token1, token0, _pair, _pylonFactory);
        IZirconEnergyRevenue(energy).initialize(_pair, token0, token1, energy0, energy1, pylon0, pylon1);
        getEnergyRevenue[token0][token1] = energy;
        allEnergiesRevenue.push(energy);
        emit EnergyCreated(_pair, energy, token0, token1, allEnergies.length);
    }


    function createEnergy(address _pylon, address _pair, address _tokenA, address _tokenB) external returns (address energy) {
        require(_tokenA != _tokenB, 'ZF: IDENTICAL_ADDRESS');
        require(_pylon != address(0) && _pair != address(0), 'ZE: ZERO_ADDRESS');
        require(getEnergy[_tokenA][_tokenB] == address(0), 'ZE: ENERGY_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(ZirconEnergy).creationCode;
        require(bytecode.length != 0, "Create2: bytecode length is zero");
        bytes32 salt = keccak256(abi.encodePacked(_pair, _tokenA));
        assembly {
            energy := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        require(energy != address(0), "Create2: Failed on deploy");
        IZirconEnergy(energy).initialize(_pylon, _pair, _tokenA, _tokenB, 100);
        getEnergy[_tokenA][_tokenB] = energy;
        allEnergies.push(energy);
        emit EnergyCreated(_pylon, _pair, energy, _tokenA, _tokenB, allEnergies.length);
    }

}
