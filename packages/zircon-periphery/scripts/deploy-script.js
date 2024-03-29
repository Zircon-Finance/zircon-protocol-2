const { ethers } = require('hardhat');

async function pylonFactoryChack() {
    // Deploy Pylon Router
    let peripheralLibrary = await (await ethers.getContractFactory('ZirconPeripheralLibrary')).deploy();
    let pylonRouterContract = await ethers.getContractFactory('ZirconPylonRouter', {
        libraries: {
            ZirconPeripheralLibrary: peripheralLibrary.address,
        },
    });
    let pRouterInstance = pylonRouterContract.attach("0xC5Cc92B016e6fd1838a3bE4F0Fb26D1dDfc060Cf")
    let pFactory = await pRouterInstance.pylonFactory();
        //await pylonRouterContract.deploy("0x7EC6289EAF48Ed7E474aB6C9f400d068F8869397", "0x846C5f92311Eb8719b04Af075b43A3157857D6F8", "0xC0B897E2598f5a1Aa18fd1927cC7b72Ec74e2B1B")
    console.log(`PylonFactory : ${pFactory}`);

}

async function deployPylonRouter() {
    // Deploy Pylon Router
    let peripheralLibrary = await (await ethers.getContractFactory('ZirconPeripheralLibrary')).deploy();
    let pylonRouterContract = await ethers.getContractFactory('ZirconPylonRouter', {
        libraries: {
            ZirconPeripheralLibrary: peripheralLibrary.address,
        },
    });
    let pRouterInstance = await pylonRouterContract.deploy("0x7EC6289EAF48Ed7E474aB6C9f400d068F8869397", "0x846C5f92311Eb8719b04Af075b43A3157857D6F8", "0xC0B897E2598f5a1Aa18fd1927cC7b72Ec74e2B1B")
    console.log(`Pylon Router deployed to: ${pRouterInstance.address}`);

}
// Deploy function
async function deploy() {
    const [account] = await ethers.getSigners();
    let deployerAddress = account.address;
    console.log(`Deploying contracts using ${deployerAddress}`);

    //Deploy WETH
    const weth = await ethers.getContractFactory('WETH');
    const wethInstance = await weth.deploy();

    console.log(`WETH deployed to : ${wethInstance.address}`);

    //Deploy Factory
    const factory = await ethers.getContractFactory('ZirconFactory');
    const factoryInstance = await factory.deploy(deployerAddress);

    console.log(`Factory deployed to : ${factoryInstance.address}`);

    //Deploy Router passing Factory Address and WETH Address
    const router = await ethers.getContractFactory('ZirconRouter');
    const routerInstance = await router.deploy(
        factoryInstance.address,
        wethInstance.address
    );
    await routerInstance.deployed();

    console.log(`Router V02 deployed to :  ${routerInstance.address}`);

    //Deploy Multicall (needed for Interface)
    const multicall = await ethers.getContractFactory('Multicall');
    const multicallInstance = await multicall.deploy();
    await multicallInstance.deployed();

    console.log(`Multicall deployed to : ${multicallInstance.address}`);

    //Deploy Tokens
    const tok1 = await ethers.getContractFactory('Token');
    const tok1Instance = await tok1.deploy('Token1', 'TOK1');

    console.log(`Token1 deployed to : ${tok1Instance.address}`);

    const tok2 = await ethers.getContractFactory('Token');
    const tok2Instance = await tok2.deploy('Token2', 'TOK2');

    console.log(`Token2 deployed to : ${tok2Instance.address}`);

    // Deploy Energy
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let factoryEnergyInstance = await factoryEnergy.deploy();
    console.log("energy", factoryEnergyInstance.address)

    // Deploy Pylon Factory
    const pylonFactory = await ethers.getContractFactory('ZirconPylonFactory');
    let factoryPylonInstance = await pylonFactory.deploy(factoryInstance.address, factoryEnergyInstance.address);
    console.log(`Pylon Factory deployed to : ${factoryPylonInstance.address}`);
    // Deploy Pylon Router
    let peripheralLibrary = await (await ethers.getContractFactory('ZirconPeripheralLibrary')).deploy();
    let pylonRouterContract = await ethers.getContractFactory('ZirconPylonRouter', {
        libraries: {
            ZirconPeripheralLibrary: peripheralLibrary.address,
        },
    });
    let pRouterInstance = await pylonRouterContract.deploy(factoryInstance.address, factoryPylonInstance.address, wethInstance.address)

    console.log(`Pylon Router deployed to : ${pRouterInstance.address}`);

}

pylonFactoryChack()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
