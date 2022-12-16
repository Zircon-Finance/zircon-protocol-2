const { ethers } = require('hardhat');

async function check() {
    // Deploy Pylon Router
    let psionicFactory = await ethers.getContractFactory('PsionicFarmFactory');
    let psionicInstance = psionicFactory.attach("0x97b2aE105DAFb7DC8a73c93e5f56d3f095D0DCF3")
    await psionicInstance.updatePylonRouter("0x7c8512f2ef02CBD11E5Cd6F4D690733d3f138d69")
    // await psionicInstance.recoverToken("0x4545E94974AdACb82FC56BCf136B07943e152055")
    // let router = await psionicInstance.PYLON_ROUTER()
    // console.log("End Block: ", (await psionicInstance.bonusEndBlock()).toString())
}

check()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
