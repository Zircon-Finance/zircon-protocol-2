const { ethers } = require('hardhat');
const {expandTo18Decimals} = require("./utils");

exports.coreFixtures = async function coreFixtures(address) {

    // Deploy feeToSetter contract
    let feeToSetter = await ethers.getContractFactory('FeeToSetter');
    let feeToSetterInstance = await feeToSetter.deploy();

    // Deploy Migrator contract
    let migrator = await ethers.getContractFactory('Migrator');
    let migratorInstance = await migrator.deploy();

    // ZirconEnergyFactory
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let factoryEnergyInstance = await factoryEnergy.deploy(feeToSetterInstance.address, migratorInstance.address);

    // Deploy Tokens
    let tok = await ethers.getContractFactory('Token');
    let tk0 = await tok.deploy('Token1', 'TOK1');
    let tk1 = await tok.deploy('Token2', 'TOK2');

    // Deploy Factory
    let factory = await ethers.getContractFactory('ZirconFactory');
    let factoryInstance = await factory.deploy(factoryEnergyInstance.address, migratorInstance.address, feeToSetterInstance.address);

    // Deploy Pool Token Factory
    let ptFactory = await ethers.getContractFactory('ZirconPTFactory');
    let ptFactoryInstance = await ptFactory.deploy(migratorInstance.address, feeToSetterInstance.address);

    // Deploying Pylon Factory
    let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory');
    let factoryPylonInstance = await factoryPylon.deploy(factoryInstance.address, factoryEnergyInstance.address, ptFactoryInstance.address, feeToSetterInstance.address, migratorInstance.address);

    // Creating Pair
    await factoryInstance.createPair(tk0.address, tk1.address, factoryPylonInstance.address);
    let lpAddress = await factoryInstance.getPair(tk0.address, tk1.address)
    let pairContract = await ethers.getContractFactory("ZirconPair");
    let pair = await pairContract.attach(lpAddress);

    //initializing fee to setter

    await feeToSetterInstance.initialize(factoryInstance.address, factoryEnergyInstance.address, factoryPylonInstance.address);
    await feeToSetterInstance.setFees(10, ethers.BigNumber.from("40000000000000000")  , 100, 240);
    await migratorInstance.initialize(factoryEnergyInstance.address, ptFactoryInstance.address, factoryPylonInstance.address, factoryInstance.address);

    // Sorting Tokens
    const token0Address = await pair.token0();
    let token0 = tk0.address === token0Address ? tk0 : tk1
    let token1 = tk1.address === token0Address ? tk0 : tk1

    // Creating Pylon
    await factoryPylonInstance.addPylon(lpAddress, token0.address, token1.address);
    let pylonAddress = await factoryPylonInstance.getPylon(token0.address, token1.address)

    let zPylon = await ethers.getContractFactory('ZirconPylon');
    let poolToken1 = await ethers.getContractFactory('ZirconPoolToken');
    let poolToken2 = await ethers.getContractFactory('ZirconPoolToken');
    let pylonInstance = await zPylon.attach(pylonAddress);

    let energyContract = await ethers.getContractFactory('ZirconEnergy')

    // Configuring Pool Tokens Anchor And Float
    let poolAddress0 = await pylonInstance.floatPoolTokenAddress();
    let poolAddress1 = await pylonInstance.anchorPoolTokenAddress();
    let poolTokenInstance0 = poolToken1.attach(poolAddress0);
    let poolTokenInstance1 = poolToken2.attach(poolAddress1);

    return {
        factoryInstance,
        pylonInstance,
        poolTokenInstance0,
        poolTokenInstance1,
        factoryPylonInstance,
        token0,
        token1,
        pair,
        migratorInstance,
        factoryEnergyInstance,
        ptFactoryInstance,
        feeToSetterInstance
    }
}
