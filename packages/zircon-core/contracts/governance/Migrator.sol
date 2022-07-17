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

    // allows owner to change itself at any time
    function setOwner(address owner_) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }

    // @notice allows to migrate pylon address to new pylon
    //    function migratePylon(address oldPylonA, address newPylonA, address oldPylonB, address newPylonB, address tokenA,
    //        address tokenB, address pylonFactory, address pair, address newEnergyA, address newEnergyB) public onlyOwner {
    //        // Changing Pylon Address on Energy
    //        //        IZirconEnergyFactory(energyFactory).changePylonAddress(oldPylonA, newPylonA, oldPylonB, newPylonB, pair, tokenA, tokenB);
    //
    //        IZirconEnergyFactory(energyFactory).migrateEnergyLiquidity(pair, tokenA, newEnergyA);
    //        IZirconEnergyFactory(energyFactory).migrateEnergyLiquidity(pair, tokenB, newEnergyB);
    //        //        IZirconEnergyFactory(energyFactory).migrateEnergyRevenue(pair, tokenA, tokenB, newEnergyB);
    //
    //        // Changing pylon address on Pool Tokens (Float/Anchor)
    //        IZirconPTFactory(ptFactory).changePylonAddress(oldPylonA, tokenA, tokenB, newPylonA, pylonFactory);
    //        IZirconPTFactory(ptFactory).changePylonAddress(oldPylonB, tokenB, tokenA, newPylonB, pylonFactory);
    //
    //        // Migrating Liquidity from Pylon to new Pylon
    //        IZirconPylonFactory(pylonFactory).migrateLiquidity(oldPylonA, newPylonA);
    //        IZirconPylonFactory(pylonFactory).migrateLiquidity(oldPylonB, newPylonB);
    //    }

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

    function migrateEnergyRevenue(address pair, address oldEnergyRev, address newEnergy) external onlyOwner{
        require(oldEnergyRev != newEnergy, 'ZE: IDENTICAL_ADDRESS');
        require(newEnergy != address(0), 'ZE: ZERO_ADDRESS');

        IZirconEnergyFactory(energyFactory).migrateEnergyRevenue(oldEnergyRev, newEnergy);
        IZirconFactory(pairFactory).changeEnergyRevAddress(newEnergy, pair);
    }

    function updateFactories(address newEnergyFactory, address newPTFactory, address newPylonFactory, address newPairFactory) external onlyOwner{
        energyFactory = newEnergyFactory;
        ptFactory = newPTFactory;
        pylonFactory = newPylonFactory;
        pairFactory = newPairFactory;
    }

}
