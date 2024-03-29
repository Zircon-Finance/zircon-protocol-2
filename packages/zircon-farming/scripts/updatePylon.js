
async function migrateMigrator() {
    // Deploy Pylon Router
    let psionicFactory = await ethers.getContractFactory('PsionicFarmFactory');
    let psionicInstance = psionicFactory.attach("0x97b2aE105DAFb7DC8a73c93e5f56d3f095D0DCF3")
    await psionicInstance.updatePylonRouter("0x385CC0c86DEf4dea78F6b3f0dBbfa3FB12FfecB5")
    let router = await psionicInstance.PYLON_ROUTER()
    console.log("Pylon Router: ", router)
}

migrateMigrator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
