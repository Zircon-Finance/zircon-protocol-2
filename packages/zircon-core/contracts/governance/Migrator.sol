pragma solidity ^0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
import '../interfaces/IZirconPTFactory.sol';
import '../interfaces/IZirconFactory.sol';
import '../interfaces/IZirconPylon.sol';
import '../energy/interfaces/IZirconEnergyFactory.sol';
import "hardhat/console.sol";

// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation

contract Migrator {
    // immutables
    address public owner;
    address public energyFactory;
    address public ptFactory;
    address public pylonFactory;
    address public pairFactory;
    modifier onlyOwner {
        require(msg.sender == owner, 'ZPT: FORBIDDEN');
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function initialize(address energyFactory_, address ptFactory_, address pylonFactory_, address pairFactory_) public onlyOwner {
        energyFactory = energyFactory_;
        ptFactory = ptFactory_;
        pylonFactory = pylonFactory_;
        pairFactory = pairFactory_;
    }

    function setMigrator(address migrator_) public onlyOwner {
        IZirconPylonFactory(pylonFactory).setMigrator(migrator_);
        IZirconEnergyFactory(energyFactory).setMigrator(migrator_);
        IZirconFactory(pairFactory).setMigrator(migrator_);
        IZirconPTFactory(ptFactory).setMigrator(migrator_);
    }

    // allows owner to change itself at any time
    function setOwner(address owner_) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }

    function migratePylon(address oldPylon, address newPylon, address tokenA,
        address tokenB, address pair, address newEnergy) private {
        IZirconEnergyFactory(energyFactory).migrateEnergyLiquidity(pair, tokenA, newEnergy);
        IZirconPTFactory(ptFactory).changePylonAddress(oldPylon, tokenA, tokenB, newPylon, pylonFactory);
        IZirconPylonFactory(pylonFactory).migrateLiquidity(oldPylon, newPylon);

    }

    function startNewPylon(address oldPylon, address newPylonFactory, address _pairAddress, address _tokenA, address _tokenB) external onlyOwner {
        address anchorAddress = IZirconPylon(oldPylon).anchorPoolTokenAddress();
        address floatAddress = IZirconPylon(oldPylon).floatPoolTokenAddress();

        address pylon = IZirconPylonFactory(newPylonFactory).addPylonCustomPT(_pairAddress, _tokenA, _tokenB, floatAddress, anchorAddress);
        address energy = IZirconPylon(pylon).energyAddress();
        uint gamma = IZirconPylon(oldPylon).gammaMulDecimals();
        uint vab = IZirconPylon(oldPylon).virtualAnchorBalance();

        migratePylon(oldPylon, pylon, _tokenA, _tokenB, _pairAddress, energy);
        IZirconPylonFactory(newPylonFactory).startPylon(pylon, gamma, vab);
    }

    function migrateEnergyRevenue(address pair, address oldEnergyRev, address _tokenA, address _tokenB, address _pylonFactory, address newEnergyFactory) external onlyOwner{
        IZirconFactory(pairFactory).changeEnergyFactoryAddress(newEnergyFactory);
        address newEnergy = IZirconFactory(pairFactory).changeEnergyRevAddress(pair, _tokenA, _tokenB, _pylonFactory);
        IZirconEnergyFactory(energyFactory).migrateEnergyRevenue(oldEnergyRev, newEnergy);
    }

    function updateFactories(address newEnergyFactory, address newPTFactory, address newPylonFactory, address newPairFactory) external onlyOwner{
        energyFactory = newEnergyFactory;
        ptFactory = newPTFactory;
        pylonFactory = newPylonFactory;
        pairFactory = newPairFactory;
    }

}