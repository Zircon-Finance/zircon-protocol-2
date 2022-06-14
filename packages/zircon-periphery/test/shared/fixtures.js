const { ethers, waffle } = require('hardhat');
const {expandTo18Decimals} = require("./utils");
const zirconFactory = require('../../core_contracts/abi/ZirconFactory.json')
const zirconPylonFactory = require('../../core_contracts/abi/ZirconPylonFactory.json')
const zirconEnergyFactory = require('../../core_contracts/abi/ZirconEnergyFactory.json')
const zirconPair = require('../../core_contracts/abi/ZirconPair.json')
const zirconPylon = require('../../core_contracts/abi/ZirconPylon.json')
const zirconPoolToken = require('../../core_contracts/abi/ZirconPoolToken.json')
const OVERRIDES = {
    gasLimit: 9999999
}
exports.coreFixtures = async function coreFixtures(address, signer) {

    // Deploying Random ERC20
    let tok0 = await ethers.getContractFactory('Token');
    let tk0 = await tok0.deploy('Token1', 'TOK1');
    let tok1 = await ethers.getContractFactory('Token');
    let tk1 = await tok1.deploy('Token2', 'TOK2');

    // Deploying Energy
    let factoryEnergy = await ethers.getContractFactory(zirconEnergyFactory['abi'], zirconEnergyFactory['bytecode'])
    let factoryEnergyInstance = await factoryEnergy.deploy();

    // Deploying Factory
    const factory = await ethers.getContractFactory(zirconFactory['abi'], zirconFactory['bytecode'])
    let factoryInstance = await factory.deploy(factoryEnergyInstance.address)

    // Deploying Pylon Factory
    const pylonFactory = await ethers.getContractFactory(zirconPylonFactory['abi'], zirconPylonFactory['bytecode'])
    let factoryPylonInstance = await pylonFactory.deploy(factoryInstance.address, factoryEnergyInstance.address)

    // Deploying a Pair
    await factoryInstance.createPair(tk0.address, tk1.address, factoryPylonInstance.address, OVERRIDES);

    let pairAddress = await factoryInstance.getPair(tk0.address, tk1.address)
    let pairContract = await ethers.getContractFactory(zirconPair['abi'], zirconPair['bytecode'])
    let pair = await pairContract.attach(pairAddress);

    // Getting Right order for tokens
    const token0Address = await pair.token0();
    let token0 = tk0.address === token0Address ? tk0 : tk1
    let token1 = tk1.address === token0Address ? tk0 : tk1

    // Deploying a pylon
    await factoryPylonInstance.addPylon(pairAddress, token0.address, token1.address, OVERRIDES);
    let pylonAddress = await factoryPylonInstance.getPylon(token0.address, token1.address)
    let pylonContract = await ethers.getContractFactory(zirconPylon['abi'], zirconPylon['bytecode'])
    let pylonInstance = await pylonContract.attach(pylonAddress);

    // Pool Tokens Instances
    let poolAddress0 = await pylonInstance.floatPoolTokenAddress();
    let poolAddress1 = await pylonInstance.anchorPoolTokenAddress();
    let poolTokenContract = await ethers.getContractFactory(zirconPoolToken['abi'], zirconPoolToken['bytecode'])
    let poolTokenInstance0 = poolTokenContract.attach(poolAddress0);
    let poolTokenInstance1 = poolTokenContract.attach(poolAddress1);

    // Deploying Wrapped Ethereum
    let WETH = await ethers.getContractFactory('WETH');
    const WETHInstance = await WETH.deploy()

    // Deployinf Peripheral Lib and Pylon Router
    let peripheralLibrary = await (await ethers.getContractFactory('ZirconPeripheralLibrary')).deploy();
    let pylonRouterContract = await ethers.getContractFactory('ZirconPylonRouter', {
        libraries: {
            ZirconPeripheralLibrary: peripheralLibrary.address,
        },
    });
    let routerInstance = await pylonRouterContract.deploy(factoryInstance.address, factoryPylonInstance.address, WETHInstance.address)

    // Some console for the hashs
    console.log("REMEMBER TO UPDATE THE KECCAK IN THE PERIPHERAL LIB AND IN THE UNISWAP LIB")
    console.log("keccak256 bytecode pairContract", ethers.utils.keccak256(zirconPair["bytecode"]))
    console.log("keccak256 bytecode pylon", ethers.utils.keccak256(zirconPylon["bytecode"]))

    return {
        factoryInstance,
        pylonInstance,
        poolTokenInstance0,
        poolTokenInstance1,
        factoryPylonInstance,
        token0,
        token1,
        pair,
        routerInstance,
        WETHInstance,
        pairContract,
        poolTokenContract,
        pylonContract
    }
}
