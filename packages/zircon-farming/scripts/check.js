const { ethers } = require('hardhat');

async function check() {
    // Deploy Pylon Router
    let psionicFactory = await ethers.getContractFactory('PsionicFarmInitializable');
    let psionicInstance = psionicFactory.attach("0xf26d1b3214388C17bDC4d20b3C2dE88310B0370E")
    await psionicInstance.recoverToken("0x4545E94974AdACb82FC56BCf136B07943e152055")
    // let router = await psionicInstance.PYLON_ROUTER()
    // console.log("End Block: ", (await psionicInstance.bonusEndBlock()).toString())
}

check()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
