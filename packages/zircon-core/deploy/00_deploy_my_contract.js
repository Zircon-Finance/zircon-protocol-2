
const FEE_TO_SETTER_ADDRESS = "0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce";
const MIGRATOR_ADDRESS = "0x7276DCC889c92234B0d2D2562DD9fD0E94d24248";
const FACTORY = "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd";
const PT_FACTORY = "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    console.log("REMEMBER TO CHANGE THE BYTECODES IN THE CONTRACT FILES!");
    console.log("\n\n 📡 Deploying...\n");

    /// Migrator
    // let migrator = await deploy('Migrator', {
    //     from: deployer,
    //     args: null,
    //     log: true
    // });
    //
    // /// Fee to setter
    // let feeToSetter = await deploy('FeeToSetter', {
    //     from: deployer,
    //     args: null,
    //     log: true
    // });

    // Deploy Energy
    let energyInstance = await deploy('ZirconEnergyFactory', {
        from: deployer,
        args: [FEE_TO_SETTER_ADDRESS, MIGRATOR_ADDRESS],
        log: true
    });
    /// Deploy Energy
    // let ptFactoryInstance = await deploy('ZirconPTFactory', {
    //     from: deployer,
    //     args: [migrator.address, feeToSetter.address],
    //     log: true
    // });
    //
    /// Deploy Factory
    // let factoryInstance = await deploy('ZirconFactory', {
    //     from: deployer,
    //     args: [energyInstance.address, feeToSetter.address, migrator.address],
    //     log: true
    // });

    /// Deploy Pylon

    let factoryPylonInstance = await deploy('ZirconPylonFactory', {
        from: deployer,
        args: [
            FACTORY,
            energyInstance.address,
            PT_FACTORY,
            FEE_TO_SETTER_ADDRESS,
            MIGRATOR_ADDRESS],
        log: true
    });

    // await feeToSetter.initialize(factoryInstance.address, energyInstance.address, factoryPylonInstance.address);
    // await migrator.initialize(energyInstance.address, ptFactoryInstance.address, factoryPylonInstance.address, factoryInstance.address);

    console.log("REMEMBER TO CHANGE THE BYTECODES IN THE CONTRACT FILES!");

};
module.exports.tags = ['CoreFactories'];
