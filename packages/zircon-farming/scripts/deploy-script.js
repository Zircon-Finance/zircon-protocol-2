const { ethers } = require('hardhat');

// Deploy function
async function deploy() {
    const [account] = await ethers.getSigners();
    let deployerAddress = account.address;
    console.log(`Deploying contracts using ${deployerAddress}`);
    let multicall = await ethers.getContractFactory('Multicall')
    let instance = await multicall.deploy();
    console.log("address", instance.address)


    // const zToken = await ethers.getContractFactory('ZirconToken');
    // let zInstance = await zToken.deploy()ok 
    // console.log("Zircon token", zInstance.address)
    //
    // const zFarm = await ethers.getContractFactory('ZirconFarm');
    // let zFarmInstance = await zFarm.deploy(zInstance.address)
    // console.log("Zircon Farm Token", zFarmInstance.address)
    //
    //
    // const farming = await ethers.getContractFactory('MasterChef');
    // const bNumber = ethers.provider.getBlockNumber()
    // let masterInstance = await farming.deploy(zInstance.address, zFarmInstance.address, 100, bNumber)
    // await zFarmInstance.transferOwnership(masterInstance.address)
    // await zInstance.transferOwnership(masterInstance.address)
    //
    // await zInstance.mint(masterInstance.address, 100)
    // console.log(bNumber)
    console.log(`MasterChef deployed to : ${masterInstance.address}`);
}

deploy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
