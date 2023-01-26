const CORE_DEPLOYED = require('../external_contracts/core_contracts.json')
const FARMING_DEPLOYED = require('../external_contracts/farming_contracts.json')
const { ethers, waffle } = require('hardhat');
const psionicFarmFactory = require('../core_contracts/abi/PsionicFarmFactory.json')
const WETH_ADDRESS = {
    '1287': "0xD909178CC99d318e4D46e7E66a972955859670E1",
    '1285': "0x98878B06940aE243284CA214f92Bb71a2b032B8A",
    '97': "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"
}

module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
    let chainId = await getChainId()
    let coreContracts = CORE_DEPLOYED[chainId.toString()][0].contracts
    let farmingContracts = FARMING_DEPLOYED[chainId.toString()][0].contracts

    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    // // Deploy Wrapped ETH
    let wrappedInstance = await deploy('WETH', {
        from: deployer,
        log: true
    });

    /// Deploy Factory
    let router = await deploy('ZirconRouter', {
        from: deployer,
        args: [coreContracts['ZirconFactory']['address'], coreContracts['ZirconPylonFactory']['address'], WETH_ADDRESS[chainId.toString()]],
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
        args: [coreContracts['ZirconFactory']['address'], coreContracts['ZirconPylonFactory']['address'], coreContracts['ZirconPTFactory']['address'], WETH_ADDRESS[chainId.toString()]],
        log: true
    });

    const psionicFactory = await ethers.getContractFactory(farmingContracts["PsionicFarmFactory"]['abi'], psionicFarmFactory['bytecode'])
    const psionicFarmingInstance = await psionicFactory.attach(farmingContracts["PsionicFarmFactory"]['address'])
    await psionicFarmingInstance.updatePylonRouter(pylonRouter.address)
};
module.exports.tags = ['ZirconPeripheral'];
