// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
//import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import './ZirconPoolToken.sol';
import './ZirconPylon.sol';
import "./energy/interfaces/IZirconEnergyRevenue.sol";
import './energy/interfaces/IZirconEnergyFactory.sol';

contract ZirconPylonFactory is IZirconPylonFactory {
    mapping(address => mapping(address => address)) public getPylon;
    address[] public allPylons;
    address public factory;
    address public energyFactory;

    uint public maximumPercentageSync;
    uint public dynamicFeePercentage;
    bytes4 private constant CREATE = bytes4(keccak256(bytes('createEnergy(address,address,address,address)')));

    event PylonCreated(address indexed token0, address indexed token1, address poolToken0, address poolToken1, address pylon, address pair);

    constructor(address _factory, address _energyFactory) public {
        factory = _factory;
        energyFactory = _energyFactory;
        maximumPercentageSync = 10;
        dynamicFeePercentage = 5;
    }

    function allPylonsLength() external view returns (uint) {
        return allPylons.length;
    }

    function pylonCodeHash() external pure returns (bytes32) {
        return keccak256(type(ZirconPylon).creationCode);
    }

    function createTokenAddress(address _token, address pylonAddress) private returns (address poolToken) {
        // Creating Token
        bytes memory bytecode = type(ZirconPoolToken).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_token, pylonAddress));
        assembly {
            poolToken := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
    }

    function createPylon( address _tokenA, address _tokenB, address _pair) private returns (address pylon) {
        // Creating Token
        bytes memory bytecode = type(ZirconPylon).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_tokenA, _tokenB, _pair));
        assembly {
            pylon := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
    }
    function createEnergy(address _pylonAddress, address _pairAddress, address _tokenA, address _tokenB) private returns (address energy){
        energy = IZirconEnergyFactory(energyFactory).createEnergy( _pylonAddress, _pairAddress, _tokenA, _tokenB);
        //energyRev = IZirconEnergyFactory(energyFactory).createEnergyRev(_pairAddress, _tokenA, _tokenB, address(this));

        //        (bool success, bytes memory data) = energyFactory.call(abi.encodeWithSelector(CREATE, _pylonAddress, _pairAddress, _tokenA, _tokenB));
//        require(success && (data.length == 0 || abi.decode(data, (bool))), 'ZP: ENERGY_FAILED_CREATION');
    }

    // Adding Pylon
    // First Token is always the Float and the second one is the Anchor
    function addPylon(address _pairAddress, address _tokenA, address _tokenB) external returns (address pylonAddress) {
        require(_tokenA != _tokenB, 'ZF: IDENTICAL_ADDRESSES');
        require(getPylon[_tokenA][_tokenB] == address(0), 'ZF: PYLON_EXISTS');
        console.log(block.number);

        pylonAddress = createPylon(_tokenA, _tokenB, _pairAddress);
        address poolTokenA = createTokenAddress(_tokenA, pylonAddress); // Float
        address poolTokenB = createTokenAddress(_tokenB, pylonAddress); // Anchor
        console.log(energyFactory);

        address energy = createEnergy(pylonAddress, _pairAddress, _tokenA, _tokenB);

        IZirconPylon(pylonAddress).initialize(poolTokenA, poolTokenB, _tokenA, _tokenB, _pairAddress, factory, energy);

        ZirconPoolToken(poolTokenA).initialize(_tokenA, _pairAddress, pylonAddress, false);
        ZirconPoolToken(poolTokenB).initialize(_tokenB, _pairAddress, pylonAddress, true);

        emit PylonCreated(_tokenA, _tokenB, poolTokenA, poolTokenB, pylonAddress, _pairAddress);


        getPylon[_tokenA][_tokenB] = pylonAddress;
        allPylons.push(pylonAddress);
    }
}
