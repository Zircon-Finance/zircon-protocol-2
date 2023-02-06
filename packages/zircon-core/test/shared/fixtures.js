const { ethers } = require('hardhat');
const {expandTo18Decimals} = require("./utils");
const {LIB_ADDRESS} = require("../../scripts/constants");
let library = null;

exports.librarySetup = async function librarySetup() {
    // Deploying Library
    if (library !== null){
        return library
    }
    library = await (await ethers.getContractFactory('ZirconLibrary')).deploy();
    if (library.address !== LIB_ADDRESS[31337]) {
        console.error("UPDATE LIBRARY ADDRESS ON get-bytecodes.js -> 31337: ", library.address)
        throw new Error()
    }
    return library;
}

exports.coreFixtures = async function coreFixtures(library) {

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

    let tk0 = await tok.deploy('Token1', 'TOK1', 18);
    let tk1 = await tok.deploy('Token2', 'TOK2', 18);

    // Deploy Factory
    let factory = await ethers.getContractFactory('ZirconFactory');
    let factoryInstance = await factory.deploy(factoryEnergyInstance.address, feeToSetterInstance.address, migratorInstance.address);

    // Deploy Pool Token Factory
    let ptFactory = await ethers.getContractFactory('ZirconPTFactory');
    let ptFactoryInstance = await ptFactory.deploy(migratorInstance.address, feeToSetterInstance.address);

    // Deploying Pylon Factory
    let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory', {
        libraries: {
            ZirconLibrary: library.address,
        },
    });
    let factoryPylonInstance = await factoryPylon.deploy(
        factoryInstance.address,
        factoryEnergyInstance.address,
        ptFactoryInstance.address,
        feeToSetterInstance.address,
        migratorInstance.address);

    // Creating Pair
    await factoryInstance.createPair(tk0.address, tk1.address, factoryPylonInstance.address);
    let lpAddress = await factoryInstance.getPair(tk0.address, tk1.address)
    let pairContract = await ethers.getContractFactory("ZirconPair");
    let pair = await pairContract.attach(lpAddress);

    //initializing fee to setter

    await feeToSetterInstance.initialize(factoryInstance.address, factoryEnergyInstance.address, factoryPylonInstance.address);
    //await feeToSetterInstance.setFees(10, ethers.BigNumber.from("40000000000000000")  , 100, 240);
    await migratorInstance.initialize(factoryEnergyInstance.address, ptFactoryInstance.address, factoryPylonInstance.address, factoryInstance.address);

    // Sorting Tokens
    const token0Address = await pair.token0();
    let isFloatRes0 = tk0.address === token0Address
    let token0 = isFloatRes0 ? tk0 : tk1
    let token1 = !isFloatRes0 ? tk0 : tk1

    // Creating Pylon
    await factoryPylonInstance.addPylon(lpAddress, token0.address, token1.address);
    let pylonAddress = await factoryPylonInstance.getPylon(token0.address, token1.address)

    console.log("Lib:Address", library.address)
    let zPylon = await ethers.getContractFactory('ZirconPylon', {
        libraries: {
            ZirconLibrary: library.address,
        },
    });
    let poolTokenContract = await ethers.getContractFactory('ZirconPoolToken');
    let pylonInstance = await zPylon.attach(pylonAddress);
    let energyContract = await ethers.getContractFactory('ZirconEnergy')

    // Configuring Pool Tokens Anchor And Float
    let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address); // floatPoolTokenAddress();
    let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token1.address);

    let poolTokenInstance0 = await poolTokenContract.attach(poolAddress0);
    let poolTokenInstance1 = await poolTokenContract.attach(poolAddress1);

    [account, account2] = await ethers.getSigners();

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
        feeToSetterInstance,
        zirconPylonLibrary: library,
        account,
        account2,
        pylonContract: zPylon,
        pairContract,
        tokenContract: tok,
        poolTokenContract,
        isFloatRes0
    }
}

