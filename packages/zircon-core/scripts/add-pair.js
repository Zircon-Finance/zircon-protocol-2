const { ethers } = require('hardhat');



async function ptTest() {
    let ptFactory = await ethers.getContractFactory('ZirconPTFactory')
    let ea = await ptFactory.attach("0x09A57DcdBaFEf048ac5D749f297d014a41b39C88")
    let eaA = await ea.getPoolToken( "0x82413D05710CD45C256b491bDe1c1a5B9303eb62", "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82")
    let eaB = await ea.getPoolToken( "0x82413D05710CD45C256b491bDe1c1a5B9303eb62", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56")

    console.log("pts: ", eaA.toString(), eaB.toString())
}

async function eaTest() {
    let energyFactory = await ethers.getContractFactory('ZirconEnergyFactory')
    let ea = await energyFactory.attach("0xe2522E34d2eDAbEd507A8b975ae8d7bf4CBe40ff")
    let eaA = await ea.getEnergy( "0x82413D05710CD45C256b491bDe1c1a5B9303eb62", "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82")
    let eaB = await ea.getEnergy( "0x82413D05710CD45C256b491bDe1c1a5B9303eb62", "0x98dc2d3bc896fe0971e135b02b2b6831c839f0fe")

    console.log("balances: ", eaA.toString())
}

async function test() {
    let erc20 = await ethers.getContractFactory('ERC20')
    let erc20Token = await erc20.attach("0x08B40414525687731C23F430CEBb424b332b3d35")
    let balance = await erc20Token.balanceOf("0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    let erc20Token2 = await erc20.attach("0x08B40414525687731C23F430CEBb424b332b3d35")
    let balance2 = await erc20Token2.balanceOf("0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    console.log("balances: ", balance.toString(), balance2.toString())
}

// Add Pair Function
async function addPair() {
    // Deploy Pylon Router
    // let peripheralLibrary = await (await ethers.getContractFactory('ZirconPeripheralLibrary')).attach("")
    // deploy tokens
    let factory = await ethers.getContractFactory('ZirconFactory');
    let factoryInstance = await factory.attach("0xC325D108cb7270c55dde8668Bd34997C10739847");

    // let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    // let factoryEnergyInstance = await factoryEnergy.deploy();
    let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory');
    let factoryPylonInstance = await factoryPylon.attach("0x5ff31403A412e982Bd1eE870ca1c98490FfAc894");

    // Deploy Tokens
    let tok0 = await ethers.getContractFactory('Token');
    let tk0 = await tok0.attach("0x53bF3fA280d8fa915F503f182fE602cd310EB39D");
    let tok1 = await ethers.getContractFactory('Token');
    let tk1 = await tok1.attach("0xf5dd274285dC9243187b7a201239531e75fEAaa4");

    //await factoryInstance.createPair(tk0.address, tk1.address);
    let lpAddress = await factoryInstance.getPair(tk0.address, tk1.address)
    let pairContract = await ethers.getContractFactory("ZirconPair");
    let pair = await pairContract.attach(lpAddress);

    const token0Address = await pair.token0();
    let token0 = tk0.address === token0Address ? tk0 : tk1
    let token1 = tk1.address === token0Address ? tk0 : tk1

    await factoryPylonInstance.addPylon(lpAddress, token0.address, token1.address);
    // let pylonAddress = await factoryPylonInstance.getPylon(token0.address, token1.address)
    //
    // let pylonRouterContract = await ethers.getContractFactory('ZirconPylonRouter');
    // pylonRouterContract.attach("0x292993357d974fA1a4aa6e37305D5F266B399f99")
    // await factoryPylonInstance.addPylon(lpAddress, token0.address, token1.address);

    // let pRouterInstance = await pylonRouterContract.deploy(factoryInstance.address, factoryPylonInstance.address, wethInstance.address)
}

ptTest()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
