const { ethers } = require('hardhat');

async function check() {
    // Deploy Pylon Router
    let psionicFactory = await ethers.getContractFactory('PsionicFarmInitializable');
    let psionicInstance = psionicFactory.attach("0xA6AE0Ed76eeD0add628A16BA39cAa1b492d61ac1")
    await psionicInstance.recoverToken("0x98878B06940aE243284CA214f92Bb71a2b032B8A")
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
