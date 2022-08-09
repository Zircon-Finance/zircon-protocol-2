const CORE_DEPLOYED = require('../external_contracts/core_contracts.json')
const FARMING_DEPLOYED = require('../external_contracts/farming_contracts.json')
const { ethers, waffle } = require('hardhat');

module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
    let chainId = await getChainId()
    let coreContracts = CORE_DEPLOYED[chainId][0].contracts
    let farmingContracts = FARMING_DEPLOYED[chainId][0].contracts

    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    // Deploy Wrapped ETH
    let wrappedInstance = await deploy('WETH', {
        from: deployer,
        log: true
    });

    /// Deploy Factory
    let router = await deploy('ZirconRouter', {
        from: deployer,
        args: [coreContracts["ZirconFactory"]["address"], coreContracts["ZirconPylonFactory"]["address"], wrappedInstance.address],
        log: true
    });


    /// Deploy Peripheral Lib
    let peripheralLibrary = await deploy('ZirconPeripheralLibrary', {
        from: deployer,
        args: null,
        log: true
    });

    /// Deploy Pylon Router
    let pylonRouter = await deploy('ZirconPylonRouter', {
        from: deployer,
        libraries: {ZirconPeripheralLibrary: peripheralLibrary.address},
        args: [coreContracts["ZirconFactory"]["address"], coreContracts["ZirconPylonFactory"]["address"], wrappedInstance.address],
        log: true
    });

    const psionicFactory = await ethers.getContractFactory(farmingContracts["PsionicFarmFactory"]['abi'], farmingContracts["PsionicFarmFactory"]['bytecode'])
    const psionicFarmingInstance = await psionicFactory.attach(farmingContracts["PsionicFarmFactory"]['address'])
    await psionicFarmingInstance.updatePylonRouter(pylonRouter.address)
};
module.exports.tags = ['ZirconPeripheral'];
