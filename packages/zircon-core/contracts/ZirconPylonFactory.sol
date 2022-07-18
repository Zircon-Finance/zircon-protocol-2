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
    address public migrator;
    bool public paused;

    uint public maximumPercentageSync;
    uint public deltaGammaThreshold;
    uint public deltaGammaMinFee;
    uint public muUpdatePeriod;

    modifier onlyFeeToSetter {
        require(msg.sender == feeToSetter, 'ZPT: F');
        _;
    }

    modifier onlyMigrator {
        require(msg.sender == migrator, 'ZPT: F');
        _;
    }

    //bytes4 private constant CREATE = bytes4(keccak256(bytes('createEnergy(address,address,address,address)')));
    event PylonCreated(address indexed token0, address indexed token1, address poolToken0, address poolToken1, address pylon, address pair);

    constructor(address _factory, address _energyFactory, address _ptFactory, address _feeToSetter, address _migrator) public {
        factory = _factory;
        energyFactory = _energyFactory;
        ptFactory = _ptFactory;
        feeToSetter = _feeToSetter;
        migrator = _migrator;

        // Starting Variables
        maximumPercentageSync = 10;
        deltaGammaThreshold = 4 * 1e16; // 4%
        deltaGammaMinFee = 100; // 1%
        muUpdatePeriod = 240; // number of blocks; 1 hour on Ethereum and Moonbeam/river
        paused = false;
    }

    function allPylonsLength() external view returns (uint) {
        return allPylons.length;
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
   }

    function addPylonCustomPT(address _pairAddress, address _tokenA, address _tokenB, address floatPTAddress, address anchorPTAddress) external onlyMigrator returns (address pylonAddress)  {
        require(_tokenA != _tokenB, 'ZF: IA');
        require(getPylon[_tokenA][_tokenB] == address(0), 'ZF: PE');
        pylonAddress = createPylon(_tokenA, _tokenB, _pairAddress);

        configurePylon(_tokenA, _tokenB, floatPTAddress, anchorPTAddress, _pairAddress, pylonAddress);
    }

    function configurePylon(address _tokenA, address _tokenB, address poolTokenA, address poolTokenB, address _pairAddress, address pylonAddress) private {
        address energy = createEnergy(pylonAddress, _pairAddress, _tokenA, _tokenB);

        IZirconPylon(pylonAddress).initialize(poolTokenA, poolTokenB, _tokenA, _tokenB, _pairAddress, factory, energy);

        emit PylonCreated(_tokenA, _tokenB, poolTokenA, poolTokenB, pylonAddress, _pairAddress);

        getPylon[_tokenA][_tokenB] = pylonAddress;
        allPylons.push(pylonAddress);

    }

    // Adding PYLON
    // First Token is always the Float and the second one is the Anchor
    function addPylon(address _pairAddress, address _tokenA, address _tokenB) external returns (address pylonAddress) {
        require(_tokenA != _tokenB, 'ZF: IA');
        require(getPylon[_tokenA][_tokenB] == address(0), 'ZF: PE');

        pylonAddress = createPylon(_tokenA, _tokenB, _pairAddress);
        address poolTokenA = IZirconPTFactory(ptFactory).createPTAddress(_tokenA, pylonAddress); // FLOAT
        address poolTokenB = IZirconPTFactory(ptFactory).createPTAddress(_tokenB, pylonAddress); // ANCHOR

        configurePylon(_tokenA, _tokenB, poolTokenA, poolTokenB, _pairAddress, pylonAddress);

        IZirconPoolToken(poolTokenA).initialize(_tokenA, _pairAddress, pylonAddress, false);
        IZirconPoolToken(poolTokenB).initialize(_tokenB, _pairAddress, pylonAddress, true);
    }

    function setFees(uint _maximumPercentageSync, uint _deltaGammaThreshold, uint _deltaGammaMinFee, uint _muUpdatePeriod) external onlyFeeToSetter{
        maximumPercentageSync = _maximumPercentageSync;
        deltaGammaThreshold = _deltaGammaThreshold;
        deltaGammaMinFee = _deltaGammaMinFee;
        muUpdatePeriod = _muUpdatePeriod;
    }

    function setFeeToSetter(address _feeToSetter) external onlyFeeToSetter {
        feeToSetter = _feeToSetter;
    }

    function migrateLiquidity(address _oldPylon, address _newPylon) external onlyMigrator {
        ZirconPylon(_oldPylon).migrateLiquidity(_newPylon);
    }

    function startPylon(address _pylon, uint _gamma, uint _vab) external onlyMigrator {
        ZirconPylon(_pylon).initMigratedPylon(_gamma, _vab);
    }

    function changeEnergyAddress(address _newEnergy, address _pylonAddress) external onlyMigrator {
        ZirconPylon(_pylonAddress).changeEnergyAddress(_newEnergy);
    }

    function pausePylon(bool _paused) external onlyFeeToSetter{
        paused = _paused;
    }
}
