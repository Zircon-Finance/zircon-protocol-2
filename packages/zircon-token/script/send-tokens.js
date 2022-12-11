const { ethers } = require('hardhat');

// Add Pair Function
async function sendTokens() {

    try {
        let tokenContract = await ethers.getContractFactory('ZirconGammaToken');
        let token = tokenContract.attach("0x4545E94974AdACb82FC56BCf136B07943e152055")
        let allowance = await token.allowance("0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5", "0xa3DA1408B04C88c6AAC2b408D51e8AA3f3702cb0")
        console.log(allowance.toString())
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
