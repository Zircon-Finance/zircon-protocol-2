const { ethers } = require('hardhat');

// Add Pair Function
async function sendTokens() {

    try {
        let tokenContract = await ethers.getContractFactory('ZirconGammaToken');
        let token = tokenContract.attach("0x4545E94974AdACb82FC56BCf136B07943e152055")
        // await token.rescueTokens("0x4545E94974AdACb82FC56BCf136B07943e152055", "15000000000000000000000")
        // await pylon.addSyncLiquidityETH("0xe75F9ae61926FF1d27d16403C938b4cd15c756d5", true,
        //     "0xb19A851346772e3d88929b09A709191A4707126f", "0x0000000000000000000000000000000000000000", 1655803912, {value: "1000000000000000"})
        await token.mint("0x1BffbD4A935C8a9d74aF330d6b50864e9A4c7bD2", "40000000000000000000000000")
    }catch (e) {
        console.log(e)
    }
    // await factoryPylonInstance.addPylon(lpAddress, token0.address, token1.address);

    // let pRouterInstance = await pylonRouterContract.deploy(factoryInstance.address, factoryPylonInstance.address, wethInstance.address)
}

sendTokens()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
