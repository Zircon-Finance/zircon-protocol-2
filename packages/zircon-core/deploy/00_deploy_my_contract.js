module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

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
};
module.exports.tags = ['CoreFactories'];
