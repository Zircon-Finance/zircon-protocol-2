
async function check() {
    // Deploy Pylon Router
    let psionicFactory = await ethers.getContractFactory('PsionicFarmInitializable');
    let psionicInstance = psionicFactory.attach("0x7CeEa7A00520F7f110314d177edE06EE9A3895d9")
    // await psionicInstance.updatePylonRouter("0x385CC0c86DEf4dea78F6b3f0dBbfa3FB12FfecB5")
    // let router = await psionicInstance.PYLON_ROUTER()
    console.log("End Block: ", (await psionicInstance.bonusEndBlock()).toString())
   
}

check()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
