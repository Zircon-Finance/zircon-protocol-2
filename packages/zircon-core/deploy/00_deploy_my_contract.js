module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    console.log("REMEMBER TO CHANGE THE BYTECODES IN THE CONTRACT FILES!");
    console.log("\n\n 📡 Deploying...\n");

    /// Deploy Energy
    let energyInstance = await deploy('ZirconEnergyFactory', {
        from: deployer,
        args: null,
        log: true
    });

    /// Deploy Factory
    let factoryInstance = await deploy('ZirconFactory', {
        from: deployer,
        args: [energyInstance.address],
        log: true
    });

    /// Deploy Pylon
    await deploy('ZirconPylonFactory', {
        from: deployer,
        args: [factoryInstance.address, energyInstance.address],
        log: true
    });
    console.log("REMEMBER TO CHANGE THE BYTECODES IN THE CONTRACT FILES!");

};
module.exports.tags = ['CoreFactories'];
