module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    console.log("REMEMBER TO CHANGE THE BYTECODES IN THE CONTRACT FILES!");
    console.log("\n\n 📡 Deploying...\n");

    /// Migrator
    let migrator = await deploy('Migrator', {
        from: deployer,
        args: null,
        log: true
    });

    /// Fee to setter
    let feeToSetter = await deploy('FeeToSetter', {
        from: deployer,
        args: null,
        log: true
    });

    /// Deploy Energy
    let energyInstance = await deploy('ZirconEnergyFactory', {
        from: deployer,
        args: [feeToSetter.address, migrator.address],
        log: true
    });
    /// Deploy Energy
    let ptFactoryInstance = await deploy('ZirconPTFactory', {
        from: deployer,
        args: [migrator.address, feeToSetter.address],
        log: true
    });

    /// Deploy Factory
    let factoryInstance = await deploy('ZirconFactory', {
        from: deployer,
        args: [energyInstance.address, feeToSetter.address, migrator.address],
        log: true
    });

    /// Deploy Pylon
    let factoryPylonInstance = await deploy('ZirconPylonFactory', {
        from: deployer,
        args: [factoryInstance.address, energyInstance.address, ptFactoryInstance.address, feeToSetter.address, migrator.address],
        log: true
    });


    // await feeToSetter.initialize(factoryInstance.address, energyInstance.address, factoryPylonInstance.address);
    console.log(energyInstance.address, ptFactoryInstance.address, factoryPylonInstance.address, factoryInstance.address);

    console.log("REMEMBER TO CHANGE THE BYTECODES IN THE CONTRACT FILES!");

};
module.exports.tags = ['CoreFactories'];
