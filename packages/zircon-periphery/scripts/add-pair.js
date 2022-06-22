const { ethers } = require('hardhat');

// Add Pair Function
async function addPair() {
    // Deploy Pylon Router
    // let peripheralLibrary = await (await ethers.getContractFactory('ZirconPeripheralLibrary')).attach("")
    // deploy tokens
    // let factory = await ethers.getContractFactory('ZirconFactory');
    // let factoryInstance = await factory.attach("0xC325D108cb7270c55dde8668Bd34997C10739847");

    // let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    // let factoryEnergyInstance = await factoryEnergy.deploy();
    // let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory');
    // let factoryPylonInstance = await factoryPylon.attach("0x5ff31403A412e982Bd1eE870ca1c98490FfAc894");
    //
    // // Deploy Tokens
    // let tok0 = await ethers.getContractFactory('Token');
    // let tk0 = await tok0.attach("0x53bF3fA280d8fa915F503f182fE602cd310EB39D");
    // let tok1 = await ethers.getContractFactory('Token');
    // let tk1 = await tok1.attach("0xf5dd274285dC9243187b7a201239531e75fEAaa4");
    //
    // //await factoryInstance.createPair(tk0.address, tk1.address);
    // let lpAddress = await factoryInstance.getPair(tk0.address, tk1.address)
    // let pairContract = await ethers.getContractFactory("ZirconPair");
    // let pair = await pairContract.attach(lpAddress);
    //
    // const token0Address = await pair.token0();
    // let token0 = tk0.address === token0Address ? tk0 : tk1
    // let token1 = tk1.address === token0Address ? tk0 : tk1
    //
    // await factoryPylonInstance.addPylon(lpAddress, token0.address, token1.address);
    // let pylonAddress = await factoryPylonInstance.getPylon(token0.address, token1.address)
    //
    try {
        let pylonRouterContract = await ethers.getContractFactory('ZirconPylonRouter', {
            libraries: {
                ZirconPeripheralLibrary: "0x0706c19C72eB1B0a37BcF5AB44C5870074fEdfD8",
            },
        });
        let pylon = pylonRouterContract.attach("0x5DD608D9d7537B439741996556fE4928569e9407")
        await pylon.addSyncLiquidityETH("0xe75F9ae61926FF1d27d16403C938b4cd15c756d5", true,
            "0xb19A851346772e3d88929b09A709191A4707126f", "0x0000000000000000000000000000000000000000", 1655803912, {value: "1000000000000000"})

    }catch (e) {
        console.log(e)
    }
    // await factoryPylonInstance.addPylon(lpAddress, token0.address, token1.address);

    // let pRouterInstance = await pylonRouterContract.deploy(factoryInstance.address, factoryPylonInstance.address, wethInstance.address)
}

addPair()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
