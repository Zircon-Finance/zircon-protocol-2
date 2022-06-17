const { ethers } = require('hardhat');
const {expandTo18Decimals} = require("./utils");

exports.coreFixtures = async function coreFixtures(address) {

    // Deploying Factory
    let psionicFactoryContract = await ethers.getContractFactory('PsionicFarmFactory');
    let psionicFactory = await psionicFactoryContract.deploy();

    // Deploying Tokens
    let tok = await ethers.getContractFactory('Token');
    let tk0 = await tok.deploy('Token1', 'TOK1');
    let tk1 = await tok.deploy('Token2', 'TOK2');
    let tk2 = await tok.deploy('LP Token', 'LPT');

    // Deploying Pool
    let farmAddress = await psionicFactory.callStatic.deployPool(
        tk2.address,
        [tk0.address, tk1.address],
        0,
        100,
        0,
        0,
        address
    )
    await psionicFactory.deployPool(
        tk2.address,
        [tk0.address, tk1.address],
        0,
        100,
        0,
        0,
        address
    )

    let psionicFarm = await ethers.getContractFactory("PsionicFarmInitializable");
    psionicFarm.attach(farmAddress);

    return {
        psionicFarm
    }
}
