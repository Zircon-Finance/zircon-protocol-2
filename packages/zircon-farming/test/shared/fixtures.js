const { ethers } = require('hardhat');
const {expandTo18Decimals} = require("./utils");

exports.coreFixtures = async function coreFixtures(address, startBlock, endBlock, limits) {

    // Deploying Factory
    let psionicFactoryContract = await ethers.getContractFactory('PsionicFarmFactory');
    let psionicFactory = await psionicFactoryContract.deploy();

    // Deploying Tokens
    let tok = await ethers.getContractFactory('Token');
    let tk0 = await tok.deploy('Token1', 'TOK1');
    let tk1 = await tok.deploy('Token2', 'TOK2');
    let tk2 = await tok.deploy('LP Token', 'LPT');

    // Deploying Pool
    let addresses = await psionicFactory.callStatic.deployPool(
        tk2.address,
        [tk0.address, tk1.address],
        startBlock,
        endBlock,
        limits[0],
        limits[1],
        address
    )

    await psionicFactory.deployPool(
        tk2.address,
        [tk0.address, tk1.address],
        startBlock,
        endBlock,
        limits[0],
        limits[1],
        address
    )

    let psionicFarmContract = await ethers.getContractFactory("PsionicFarmInitializable");
    let psionicFarm = psionicFarmContract.attach(addresses[0]);

    let psionicVaultContract = await ethers.getContractFactory("PsionicFarmVault");
    let psionicVault = psionicVaultContract.attach(addresses[1]);

    await tk0.transfer(addresses[1], expandTo18Decimals(10))
    await tk1.transfer(addresses[1], expandTo18Decimals(20))

    return {
        psionicFarm,
        tk0,
        tk1,
        tk2,
        psionicFactory,
        psionicVault
    }
}
