// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
// import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
//import './ZirconPoolToken.sol';
import './ZirconPylon.sol';
import "./energy/interfaces/IZirconEnergyRevenue.sol";
import "./interfaces/IZirconPTFactory.sol";
import './energy/interfaces/IZirconEnergyFactory.sol';

contract ZirconPylonFactory is IZirconPylonFactory {
    mapping(address => mapping(address => address)) public getPylon;
    address[] public allPylons;
    address public factory;
    address public ptFactory;
    address public energyFactory;
    address public feeToSetter;

    uint public maximumPercentageSync;

    uint public deltaGammaThreshold;
    uint public deltaGammaMinFee;

    uint public muUpdatePeriod;

    modifier onlyFeeToSetter {
        require(msg.sender == feeToSetter, 'ZPT: FORBIDDEN');
        _;
    }
    //bytes4 private constant CREATE = bytes4(keccak256(bytes('createEnergy(address,address,address,address)')));
    event PylonCreated(address indexed token0, address indexed token1, address poolToken0, address poolToken1, address pylon, address pair);
    constructor(address _factory, address _energyFactory, address _ptFactory, address _feeToSetter) public {
        factory = _factory;
        energyFactory = _energyFactory;
        ptFactory = _ptFactory;
        feeToSetter = _feeToSetter;
        // Starting Variables
        maximumPercentageSync = 10;
        deltaGammaThreshold = 4 * 1e16; // 4%
        deltaGammaMinFee = 1500; // 15%
        muUpdatePeriod = 240; // number of blocks; 1 hour on Ethereum and Moonbeam/river
    }

    function allPylonsLength() external view returns (uint) {
        return allPylons.length;
    }

    function pylonCodeHash() external pure returns (bytes32) {
        return keccak256(type(ZirconPylon).creationCode);
    }

//    function createTokenAddress(address _token, address pylonAddress) private returns (address poolToken) {
//        // Creating Token
//        bytes memory bytecode = type(ZirconPoolToken).creationCode;
//        bytes32 salt = keccak256(abi.encodePacked(_token, pylonAddress));
//        assembly {
//            poolToken := create2(0, add(bytecode, 32), mload(bytecode), salt)
//        }
//    }

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

        //(bool success, bytes memory data) = energyFactory.call(abi.encodeWithSelector(CREATE, _pylonAddress, _pairAddress, _tokenA, _tokenB));
        //require(success && (data.length == 0 || abi.decode(data, (bool))), 'ZP: ENERGY_FAILED_CREATION');
    }

    // Adding PYLON
    // First Token is always the Float and the second one is the Anchor
    function addPylon(address _pairAddress, address _tokenA, address _tokenB) external returns (address pylonAddress) {
        require(_tokenA != _tokenB, 'ZF: IDENTICAL_ADDRESSES');
        require(getPylon[_tokenA][_tokenB] == address(0), 'ZF: PYLON_EXISTS');

        pylonAddress = createPylon(_tokenA, _tokenB, _pairAddress);
        address poolTokenA = IZirconPTFactory(ptFactory).createPTAddress(_tokenA, pylonAddress); // FLOAT
        address poolTokenB = IZirconPTFactory(ptFactory).createPTAddress(_tokenB, pylonAddress); // ANCHOR

        address energy = createEnergy(pylonAddress, _pairAddress, _tokenA, _tokenB);

        IZirconPylon(pylonAddress).initialize(poolTokenA, poolTokenB, _tokenA, _tokenB, _pairAddress, factory, energy);

        IZirconPoolToken(poolTokenA).initialize(_tokenA, _pairAddress, pylonAddress, false);
        IZirconPoolToken(poolTokenB).initialize(_tokenB, _pairAddress, pylonAddress, true);

        emit PylonCreated(_tokenA, _tokenB, poolTokenA, poolTokenB, pylonAddress, _pairAddress);

        getPylon[_tokenA][_tokenB] = pylonAddress;
        allPylons.push(pylonAddress);
    }

    function setMaximumPercentageSync(uint _maximumPercentageSync) external onlyFeeToSetter{
        maximumPercentageSync = _maximumPercentageSync;
    }

    function setDeltaGammaThreshold(uint _deltaGammaThreshold) external onlyFeeToSetter{
        deltaGammaThreshold = _deltaGammaThreshold;
    }
    function setDeltaGammaMinFee(uint _deltaGammaMinFee) external onlyFeeToSetter{
        deltaGammaMinFee = _deltaGammaMinFee;
    }

    function setFeeToSetter(address _feeToSetter) external onlyFeeToSetter {
        feeToSetter = _feeToSetter;
    }

    //    function setMigrator(address _migrator) external {
    //        require(msg.sender == feeToSetter, 'ZF: FORBIDDEN');
    //        migrator = _migrator;
    //    }
}
