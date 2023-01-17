
async function addTokenToFarm() {
    // Deploy Pylon Router
    let psionicVault = await ethers.getContractFactory('PsionicFarmVault');
    //FLoat movr/ksm
    let psionicInstance = psionicVault.attach("0x7a817daBC34d9f809983A674fB6cACF449FdFceD")
    //Stable movr/ksm
    let psionicInstance2 = psionicVault.attach("0x0d31b37225F5505cf3038985492546f52dF5f99d")
    // await psionicInstance.updatePylonRouter("0x189DbefB2283E9B91b66841f566820dd320C6b13")
    let result1 = await psionicInstance.add("0x98878B06940aE243284CA214f92Bb71a2b032B8A");
    let result2 = await psionicInstance2.add("0x98878B06940aE243284CA214f92Bb71a2b032B8A");
    console.log("Call result: ", result1, result2)
}

addTokenToFarm()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
