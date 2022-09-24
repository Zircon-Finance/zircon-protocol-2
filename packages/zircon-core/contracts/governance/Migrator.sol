pragma solidity =0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
import '../interfaces/IZirconPTFactory.sol';
import '../interfaces/IZirconFactory.sol';
import '../interfaces/IZirconPylon.sol';
import '../interfaces/IZirconPoolToken.sol';
import '../energy/interfaces/IZirconEnergyFactory.sol';
//import "hardhat/console.sol";

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
        require(energyFactory_ != address(0), 'ZPT: FORBIDDEN');
        require(ptFactory_ != address(0), 'ZPT: FORBIDDEN');
        require(pylonFactory_ != address(0), 'ZPT: FORBIDDEN');
        require(pairFactory_ != address(0), 'ZPT: FORBIDDEN');
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
        require(owner_ != address(0), 'ZPT: Address zero');
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }

    function migrate(address newPylonFactory, address newEnergyFactory, address _tokenA, address _tokenB) external onlyOwner {

        // Obtaining old addresses from the old factories
        address pair = IZirconFactory(pairFactory).getPair(_tokenA, _tokenB);
        address oldPylon = IZirconPylonFactory(pylonFactory).getPylon(_tokenA, _tokenB);

        // Obtaining old PT addresses from the pt factory
        address anchorAddress = IZirconPTFactory(ptFactory).getPoolToken(oldPylon, _tokenB);
        address floatAddress = IZirconPTFactory(ptFactory).getPoolToken(oldPylon, _tokenA);

        // Obtaining Old Energies Address
        address oldEnergyRev = IZirconEnergyFactory(energyFactory).getEnergyRevenue(_tokenA, _tokenB);
        address oldEnergy = IZirconEnergyFactory(energyFactory).getEnergy(_tokenA, _tokenB);

        // Migrating Factory to new Energy Factory
        IZirconFactory(pairFactory).changeEnergyFactoryAddress(newEnergyFactory);

        // Creating new energy revenue address
        address newEnergyRev = IZirconFactory(pairFactory).changeEnergyRevAddress(pair, _tokenA, _tokenB, newPylonFactory);
        require(newEnergyRev != address(0), 'Energy Rev does not exist');

        // Migrating Liquidity to new energy Revenue
        IZirconEnergyFactory(energyFactory).migrateEnergyRevenue(oldEnergyRev, newEnergyRev);
        IZirconEnergyFactory(newEnergyFactory).migrateEnergyRevenueFees(oldEnergyRev, newEnergyRev);

        // Creating New Pylon with old PT Tokens
        address newPylonAddress = IZirconPylonFactory(newPylonFactory).addPylonCustomPT(pair, _tokenA, _tokenB, floatAddress, anchorAddress);
        require(newPylonAddress != address(0), 'Pylon does not exist');

        // Getting New Energy
        address newEnergy = IZirconEnergyFactory(newEnergyFactory).getEnergy(_tokenA, _tokenB);
        require(newEnergy != address(0), 'Energy does not exist');


        // Communicating Changes on PT Factory
        IZirconPTFactory(ptFactory).changePylonAddress(oldPylon, _tokenA, _tokenB, newPylonAddress, pylonFactory);

        // Just a little check here, how knows ?
//        address ptPylon = IZirconPoolToken(anchorAddress).pylon();
//        address ptPylon2 = IZirconPoolToken(floatAddress).pylon();
//        require(ptPylon == newPylonAddress && ptPylon2 == newPylonAddress, 'PT Pylon does not match');

        // Migrating Pylon Liquidity
        IZirconPylonFactory(pylonFactory).migrateLiquidity(oldPylon, newPylonAddress);

        // Communicating new Pylon Variables
        IZirconPylonFactory(newPylonFactory).startPylon(newPylonAddress,
            IZirconPylon(oldPylon).gammaMulDecimals(),
            IZirconPylon(oldPylon).virtualAnchorBalance(),
            IZirconPylon(oldPylon).anchorKFactor(),
            IZirconPylon(oldPylon).formulaSwitch());

        // Migrating Energy Liquidity
        IZirconEnergyFactory(energyFactory).migrateEnergy(oldEnergy, newEnergy);

        //IZirconPylonFactory(newPylonFactory).changeEnergyAddress(newEnergyRev, _pylonAddress, _pairAddress, _tokenA, _tokenB);
    }
//
//    function migratePylon(address oldPylon, address newPylon, address tokenA,
//        address tokenB, address pair, address newEnergy) private {
//
//        IZirconEnergyFactory(energyFactory).migrateEnergyLiquidity(pair, tokenA, newEnergy);
//        IZirconPTFactory(ptFactory).changePylonAddress(oldPylon, tokenA, tokenB, newPylon, pylonFactory);
//        IZirconPylonFactory(pylonFactory).migrateLiquidity(oldPylon, newPylon);
//
//    }
//
//    function startNewPylon(address oldPylon, address newPylonFactory, address _pairAddress, address _tokenA, address _tokenB) external onlyOwner {
//        require(newPylonFactory != address(0), 'ZPT: Address zero');
//        require(_pairAddress != address(0), 'ZPT: Address zero');
//        require(_tokenA != address(0), 'ZPT: Address zero');
//        require(_tokenB != address(0), 'ZPT: Address zero');
//
//        address anchorAddress = IZirconPTFactory(ptFactory).getPoolToken(oldPylon, _tokenB); // IZirconPylon(oldPylon).anchorPoolTokenAddress();
//        address floatAddress = IZirconPTFactory(ptFactory).getPoolToken(oldPylon, _tokenA); //IZirconPylon(oldPylon).floatPoolTokenAddress();
//
//        address pylon = IZirconPylonFactory(newPylonFactory).addPylonCustomPT(_pairAddress, _tokenA, _tokenB, floatAddress, anchorAddress);
//        address energy = IZirconEnergyFactory(energyFactory).getEnergy(_tokenA, _tokenB); //IZirconPylon(pylon).energyAddress();
//        uint gamma = IZirconPylon(oldPylon).gammaMulDecimals();
//        uint vab = IZirconPylon(oldPylon).virtualAnchorBalance();
//        uint akf = IZirconPylon(oldPylon).anchorKFactor();
//        bool fs = IZirconPylon(oldPylon).formulaSwitch();
//
//        migratePylon(oldPylon, pylon, _tokenA, _tokenB, _pairAddress, energy);
//        IZirconPylonFactory(newPylonFactory).startPylon(pylon, gamma, vab, akf, fs);
//    }
//
//    function migrateEnergyRevenue(address pair, address oldEnergyRev, address _tokenA, address _tokenB, address _pylonFactory, address newEnergyFactory) external onlyOwner{
//        require(oldEnergyRev != address(0), 'ZPT: Address zero');
//        require(_tokenA != address(0), 'ZPT: Address zero');
//        require(_tokenB != address(0), 'ZPT: Address zero');
//        require(_pylonFactory != address(0), 'ZPT: Address zero');
//        require(newEnergyFactory != address(0), 'ZPT: Address zero');
//
//        IZirconPylonFactory(pylonFactory).changeEnergyFactoryAddress(newEnergyFactory);
//        IZirconFactory(pairFactory).changeEnergyFactoryAddress(newEnergyFactory);
//
//        address newEnergy = IZirconFactory(pairFactory).changeEnergyRevAddress(pair, _tokenA, _tokenB, _pylonFactory);
//        IZirconEnergyFactory(energyFactory).migrateEnergyRevenue(oldEnergyRev, newEnergy);
//        IZirconEnergyFactory(newEnergyFactory).migrateEnergyRevenueFees(oldEnergyRev, newEnergy);
//
//        IZirconPylonFactory(pylonFactory).changeEnergyFactoryAddress(energyFactory);
//    }
//
//    function updateFactories(address newEnergyFactory, address newPTFactory, address newPylonFactory, address newPairFactory) external onlyOwner{
//        require(newEnergyFactory != address(0), 'ZPT: Address zero');
//        require(newPTFactory != address(0), 'ZPT: Address zero');
//        require(newPylonFactory != address(0), 'ZPT: Address zero');
//        require(newPairFactory != address(0), 'ZPT: Address zero');
//        energyFactory = newEnergyFactory;
//        ptFactory = newPTFactory;
//        pylonFactory = newPylonFactory;
//        pairFactory = newPairFactory;
//    }

//    function updateEnergyOnPylon(address oldEnergy,address newEnergyRev, address _pylonAddress, address _pairAddress, address _tokenA, address _tokenB, address newPylonFactory) external onlyOwner{
//        require(newEnergyRev != address(0), 'ZPT: Address zero');
//        address newEnergy = IZirconPylonFactory(newPylonFactory).changeEnergyAddress(newEnergyRev, _pylonAddress, _pairAddress, _tokenA, _tokenB);
//        IZirconEnergyFactory(energyFactory).migrateEnergy(oldEnergy, newEnergy);
//    }

    function changeEnergyFactoryAddress(address newEnergyFactoryAddress) external onlyOwner {
        IZirconPylonFactory(pylonFactory).changeEnergyFactoryAddress(newEnergyFactoryAddress);
        IZirconFactory(pairFactory).changeEnergyFactoryAddress(newEnergyFactoryAddress);
    }

}
