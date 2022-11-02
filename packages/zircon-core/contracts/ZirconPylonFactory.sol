// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
pragma abicoder v2;
// import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
//import './ZirconPoolToken.sol';
import './ZirconPylon.sol';
import "./energy/interfaces/IZirconEnergyRevenue.sol";
import "./interfaces/IZirconPTFactory.sol";
import './energy/interfaces/IZirconEnergyFactory.sol';

contract ZirconPylonFactory is IZirconPylonFactory {
    mapping(address => mapping(address => address)) public override getPylon;
    address[] public override allPylons;
    address public override factory;
    address private ptFactory;
    address public override energyFactory;
    address private feeToSetter;
    address private migrator;
    bool public override paused;

    uint public override maximumPercentageSync;
    uint public override deltaGammaThreshold;
    uint public override deltaGammaMinFee;
    uint public override EMASamples;

    uint public override muUpdatePeriod;
    uint public override muChangeFactor;
    event PylonCreated(address indexed token0, address indexed token1, address poolToken0, address poolToken1, address pylon, address pair);

    constructor(address _factory, address _energyFactory, address _ptFactory, address _feeToSetter, address _migrator) {
        factory = _factory;
        energyFactory = _energyFactory;
        ptFactory = _ptFactory;
        feeToSetter = _feeToSetter;
        migrator = _migrator;

        // Starting Variables
        maximumPercentageSync = 10;
        deltaGammaThreshold = 4 * 1e16; // 4%
        deltaGammaMinFee = 100; // 1%
        EMASamples = 2; //Previous average is multiplied by this number, sum is divided by samples + 1

        muUpdatePeriod = 240; // number of blocks; 1 hour on Ethereum and Moonbeam/river
        muChangeFactor = 3; //Increases absolute gamma deviation factor to speed up mu change
//        liquidityFee = 30;
        paused = false;
    }

    // @dev modifiers are function for space purposes
    function onlyFeeToSetter() internal view{
        require(msg.sender == feeToSetter, 'ZPT: F');
    }

    function onlyMigrator() internal view{
        require(msg.sender == migrator, 'ZPT: F');
    }

    function allPylonsLength() external override view returns (uint) {
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

    // @notice Function to help with the migrartion of the pylons
    function addPylonCustomPT(address _pairAddress, address _tokenA, address _tokenB, address floatPTAddress, address anchorPTAddress) external override  returns (address pylonAddress)  {
        onlyMigrator();
        require(_tokenA != _tokenB, 'ZF: IA');
        require(getPylon[_tokenA][_tokenB] == address(0), 'ZF: PE');
        pylonAddress = createPylon(_tokenA, _tokenB, _pairAddress);

        configurePylon(_tokenA, _tokenB, floatPTAddress, anchorPTAddress, _pairAddress, pylonAddress);
    }

    // @notice Configuring pylon
    function configurePylon(address _tokenA, address _tokenB, address poolTokenA, address poolTokenB, address _pairAddress, address pylonAddress) private {
        address energyRev = IZirconEnergyFactory(energyFactory).getEnergyRevenue(_tokenA, _tokenB);
        address energy = IZirconEnergyFactory(energyFactory).createEnergy(pylonAddress, _pairAddress, _tokenA, _tokenB);
        IZirconPylon(pylonAddress).initialize(poolTokenA, poolTokenB, _tokenA, _tokenB, _pairAddress, factory, energy, energyRev);

        emit PylonCreated(_tokenA, _tokenB, poolTokenA, poolTokenB, pylonAddress, _pairAddress);

        getPylon[_tokenA][_tokenB] = pylonAddress;
        allPylons.push(pylonAddress);

    }

    // Adding PYLON
    // First Token is always the Float and the second one is the Anchor
    function addPylon(address _pairAddress, address _tokenA, address _tokenB) external override returns (address pylonAddress) {
        require(_tokenA != _tokenB, 'ZF: IA');
        require(getPylon[_tokenA][_tokenB] == address(0), 'ZF: PE');

        pylonAddress = createPylon(_tokenA, _tokenB, _pairAddress);
        address poolTokenA = IZirconPTFactory(ptFactory).createPTAddress(_tokenA, pylonAddress); // FLOAT
        address poolTokenB = IZirconPTFactory(ptFactory).createPTAddress(_tokenB, pylonAddress); // ANCHOR

        configurePylon(_tokenA, _tokenB, poolTokenA, poolTokenB, _pairAddress, pylonAddress);

        IZirconPoolToken(poolTokenA).initialize(_tokenA, _pairAddress, pylonAddress, false);
        IZirconPoolToken(poolTokenB).initialize(_tokenB, _pairAddress, pylonAddress, true);
    }

    function setFees(uint _maximumPercentageSync, uint _deltaGammaThreshold, uint _deltaGammaMinFee, uint _muUpdatePeriod, uint _muChangeFactor, uint _EMASamples) external override {
        onlyFeeToSetter();
        maximumPercentageSync = _maximumPercentageSync;
        deltaGammaThreshold = _deltaGammaThreshold;
        deltaGammaMinFee = _deltaGammaMinFee;
        muUpdatePeriod = _muUpdatePeriod;
        muChangeFactor = _muChangeFactor;
        EMASamples = _EMASamples;
    }

    function setMigrator(address _migrator) external override  {
        onlyMigrator();
        migrator = _migrator;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        onlyFeeToSetter();
        feeToSetter = _feeToSetter;
    }

    function migrateLiquidity(address _oldPylon, address _newPylon) external override {
        onlyMigrator();
        ZirconPylon(_oldPylon).migrateLiquidity(_newPylon);
    }

    function startPylon(address _pylon, uint _gamma, uint _vab, uint _anchorKFactor, bool _formulaSwitch) external override {
        onlyMigrator();
        ZirconPylon(_pylon).initMigratedPylon(_gamma, _vab, _anchorKFactor, _formulaSwitch);
    }


    function changeEnergyAddress(address _newEnergyRev, address _pylonAddress, address _pairAddress, address _tokenA, address _tokenB) external override returns (address energy){
        onlyMigrator();
        energy = IZirconEnergyFactory(energyFactory).getEnergy(_tokenA, _tokenB);
        if (energy == address(0)) {
            energy = IZirconEnergyFactory(energyFactory).createEnergy(_pylonAddress, _pairAddress, _tokenA, _tokenB);
        }
        ZirconPylon(_pylonAddress).changeEnergyAddress(energy, _newEnergyRev);
    }

    function setPaused(bool _paused) external override {
        onlyFeeToSetter();
        paused = _paused;
    }
//    function setLiquidityFee(uint _liquidityFee) external override {
//        onlyFeeToSetter();
//        liquidityFee = _liquidityFee;
//    }

    function changeEnergyFactoryAddress(address _newEnergyFactory) external override {
        onlyMigrator();
        energyFactory = _newEnergyFactory;
    }
}
