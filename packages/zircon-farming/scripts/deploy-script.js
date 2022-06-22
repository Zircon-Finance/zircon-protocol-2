const { ethers } = require('hardhat');



async function script() {
    try{
        let erc20 = await ethers.getContractFactory('ERC20')
        let ierc20 = erc20.attach("0xaf3ca2e58f6dae9b3d653dadea3ffcc94a878541")
        await ierc20.approve("0xB47fD62Fe0F5B71C88276D18464B39Ea53b7eD02", ethers.constants.MaxUint256)
        console.log("approved...")
        const pfi = await ethers.getContractAt("PsionicFarmInitializable" )
        const ts = pfi.attach("0xB47fD62Fe0F5B71C88276D18464B39Ea53b7eD02")

        let t = await ts.deposit("1000000000000000")
    }catch (e) {
        console.error(e)
    }

}

// Deploy function
async function deploy() {
    // const [account] = await ethers.getSigners();
    // let deployerAddress = account.address;
    // console.log(`Deploying contracts using ${deployerAddress}`);
    // let multicall = await ethers.getContractFactory('Multicall')
    // let instance = await multicall.deploy();
    // console.log("address", instance.address)

    // const zToken = await ethers.getContractFactory('ZirconToken');
    // let zInstance = await zToken.deploy()ok
    // console.log("Zircon token", zInstance.address)
    //
    // const zFarm = await ethers.getContractFactory('ZirconFarm');
    // let zFarmInstance = await zFarm.deploy(zInstance.address)
    // console.log("Zircon Farm Token", zFarmInstance.address)

    const bNumber = await ethers.provider.getBlockNumber()
    const farming = await ethers.getContractFactory('PsionicFarmFactory');
    const masterInstance = farming.attach("0xF640Fb705c9Ce966ae1775a111D93e739dc8DD03")

    let farmAddress = await masterInstance.callStatic.deployPool(
        "0xaf3ca2e58f6dae9b3d653dadea3ffcc94a878541",
        ["0x08B40414525687731C23F430CEBb424b332b3d35", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    await masterInstance.deployPool(
        "0xaf3ca2e58f6dae9b3d653dadea3ffcc94a878541",
        ["0x08B40414525687731C23F430CEBb424b332b3d35", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    let farmAddress2 = await masterInstance.callStatic.deployPool(
        "0x317533a7c471cffc1b23045cc74378e0d9b8f7c5",
        ["0x08B40414525687731C23F430CEBb424b332b3d35", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    await masterInstance.deployPool(
        "0x317533a7c471cffc1b23045cc74378e0d9b8f7c5",
        ["0x08B40414525687731C23F430CEBb424b332b3d35", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    let farmAddress3 = await masterInstance.callStatic.deployPool(
        "0xBC6dAA950fF110B8b6526C77c5a74591f11dbd97",
        ["0x08B40414525687731C23F430CEBb424b332b3d35", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    await masterInstance.deployPool(
        "0xBC6dAA950fF110B8b6526C77c5a74591f11dbd97",
        ["0x08B40414525687731C23F430CEBb424b332b3d35", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    let farmAddress4 = await masterInstance.callStatic.deployPool(
        "0x4c55Dde762f2E1bf1df8e76c1901799bcc629EF8",
        ["0x08B40414525687731C23F430CEBb424b332b3d35", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    await masterInstance.deployPool(
        "0x4c55Dde762f2E1bf1df8e76c1901799bcc629EF8",
        ["0x08B40414525687731C23F430CEBb424b332b3d35", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    // await zFarmInstance.transferOwnership(masterInstance.address)
    // await zInstance.transferOwnership(masterInstance.address)

    // await zInstance.mint(masterInstance.address, 100)
    console.log(farmAddress)
    console.log(farmAddress2)
    console.log(farmAddress3)
    console.log(farmAddress4)
}

script()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
