pragma solidity ^0.5.16;
import '../interfaces/IZirconPylonFactory.sol';
import '../interfaces/IZirconPTFactory.sol';
import '../interfaces/IZirconFactory.sol';
import '../energy/interfaces/IZirconEnergyFactory.sol';
// this contract serves as feeToSetter, allowing owner to manage fees in the context of a specific feeTo implementation

contract Migrator {
    // immutables
    address public owner;
    address public energyFactory;
    address public ptFactory;
    address public pylonFactory;
    modifier onlyOwner {
        require(msg.sender == owner, 'ZPT: FORBIDDEN');
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function initialize(address energyFactory_, address ptFactory_, address pylonFactory_) public onlyOwner {
        energyFactory = energyFactory_;
        ptFactory = ptFactory_;
        pylonFactory = pylonFactory_;
    }

    // allows owner to change itself at any time
    function setOwner(address owner_) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');
        owner = owner_;
    }

    // @notice allows to migrate pylon address to new pylon
    function changePylonAddress(address oldPylonA, address newPylonA, address oldPylonB, address newPylonB, address tokenA, address tokenB, address pylonFactory, address pair) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');

        // Changing Pylon Address on Energy
        IZirconEnergyFactory(energyFactory).changePylonAddress(oldPylonA, newPylonA, oldPylonB, newPylonB, pair, tokenA, tokenB);

        // Changing pylon address on Pool Tokens (Float/Anchor)
        IZirconPTFactory(ptFactory).changePylonAddress(oldPylonA, tokenA, tokenB, newPylonA, pylonFactory);
        IZirconPTFactory(ptFactory).changePylonAddress(oldPylonB, tokenB, tokenA, newPylonB, pylonFactory);

        // Migrating Liquidity from Pylon to new Pylon
        IZirconPylonFactory(pylonFactory).migrateLiquidity(oldPylonA, newPylonA);
        IZirconPylonFactory(pylonFactory).migrateLiquidity(oldPylonB, newPylonB);
    }


    // @notice allows to migrate energy address to new address
    function changeEnergyAddress(address pylonAddress, address oldEnergyAddress, address newEnergyAddress) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');

        // Changing Energy Address on Pylon
        IZirconPylonFactory(pylonFactory).changeEnergyAddress(oldEnergyAddress, pylonAddress);

        // Migrating Liquidity from Energy to new Energy
        IZirconEnergyFactory(ptFactory).migrateEnergyLiquidity(oldEnergyAddress, newEnergyAddress);
    }


    // @notice allows to migrate energy rev address to new address
    function changeEnergyRevAddress(address pairAddress, address oldEnergyRevAddress, address newEnergyRevAddress) public {
        require(msg.sender == owner, 'FeeToSetter::setOwner: not allowed');

        // Changing Energy Address on Pylon
        IZirconFactory(pylonFactory).changeEnergyRevAddress(newEnergyRevAddress, pairAddress);

        // Migrating Liquidity from Energy to new Energy
        IZirconEnergyFactory(ptFactory).migrateEnergyRevenue(oldEnergyRevAddress, newEnergyRevAddress);
    }

}
