const { ethers } = require('hardhat');
const {expandTo18Decimals} = require("./utils");

exports.coreFixtures = async function coreFixtures(address) {

    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let factoryEnergyInstance = await factoryEnergy.deploy();
    let energy = await factoryEnergyInstance.createEnergy(
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161",
        "0xf5dd274285dC9243187b7a201239531e75fEAaa4",
        "0xC39F6F5Cfe3D89E8cBbF4a61593CaA84675aA070",
        "0x5ff31403A412e982Bd1eE870ca1c98490FfAc894")

    console.log(energy)
    return {
        factoryEnergyInstance
    }
}
