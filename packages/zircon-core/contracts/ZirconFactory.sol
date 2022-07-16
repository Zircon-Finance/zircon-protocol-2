// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
import './ZirconPair.sol';
import './energy/interfaces/IZirconEnergyFactory.sol';
import "./energy/interfaces/IZirconEnergyRevenue.sol";

contract ZirconFactory is IZirconFactory {
    address public energyFactory;
    bytes4 private constant CREATE = bytes4(keccak256(bytes('createEnergyRev(address,address,address,address)')));

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _energyFactory) public {
        energyFactory = _energyFactory;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function pairCodeHash() external pure returns (bytes32) {
        return keccak256(type(ZirconPair).creationCode);
    }

    function createEnergy( address _pairAddress, address _tokenA, address _tokenB, address _pylonFactory) private returns (address energy){
        energy = IZirconEnergyFactory(energyFactory).createEnergyRev(_pairAddress, _tokenA, _tokenB, _pylonFactory);
    }

    function createPair(address tokenA, address tokenB, address _pylonFactory) external returns (address pair) {
        require(tokenA != tokenB, 'ZF: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'ZF: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'ZF: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(ZirconPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        address energyRev = createEnergy(pair, token0, token1, _pylonFactory);
        IZirconPair(pair).initialize(token0, token1, energyRev);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

}
