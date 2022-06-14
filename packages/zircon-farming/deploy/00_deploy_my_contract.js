module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    /// Deploy Psionic Farm Factory
    let wrappedInstance = await deploy('PsionicFarmFactory', {
        from: deployer,
        log: true
    });
};
module.exports.tags = ['ZirconPeripheral'];
