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
    const masterInstance = farming.attach("0x97b2aE105DAFb7DC8a73c93e5f56d3f095D0DCF3")

    let farmAddress = await masterInstance.callStatic.deployPool(
        "0xa22451B59d48eB0Ab6A7350A68c2Ceb542FceEd8",
        ["0x98878B06940aE243284CA214f92Bb71a2b032B8A", "0x3516a7588C2E6FFA66C9507eF51853eb85d76e5B"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0xa22451B59d48eB0Ab6A7350A68c2Ceb542FceEd8",
        ["0x98878B06940aE243284CA214f92Bb71a2b032B8A", "0x3516a7588C2E6FFA66C9507eF51853eb85d76e5B"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    // await masterInstance.deployPool(
    //     "0x6430E849699AFd0F948A9156e31Ec4E0aEDA596a",
    //     ["0xD909178CC99d318e4D46e7E66a972955859670E1"],
    //     bNumber,
    //     bNumber + 10000,
    //     0,
    //     0,
    //     "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    //
    // let farmAddress2 = await masterInstance.callStatic.deployPool(
    //     "0x6430E849699AFd0F948A9156e31Ec4E0aEDA596a",
    //     ["0xD909178CC99d318e4D46e7E66a972955859670E1"],
    //     bNumber,
    //     bNumber + 10000,
    //     0,
    //     0,
    //     "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    //
    // await masterInstance.deployPool(
    //     "0x0996Ad15Ae0436384c920deD146c736934eD9850",
    //     ["0x08B40414525687731C23F430CEBb424b332b3d35"],
    //     bNumber,
    //     bNumber + 10000,
    //     0,
    //     0,
    //     "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    //
    // let farmAddress3 = await masterInstance.callStatic.deployPool(
    //     "0x0996Ad15Ae0436384c920deD146c736934eD9850",
    //     ["0x08B40414525687731C23F430CEBb424b332b3d35"],
    //     bNumber,
    //     bNumber + 10000,
    //     0,
    //     0,
    //     "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    // await masterInstance.deployPool(
    //     "0x0d176f03892811101c1e38cda0E060c721928AFB",
    //     ["0x1FC56B105c4F0A1a8038c2b429932B122f6B631f", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5"],
    //     bNumber,
    //     bNumber + 10000,
    //     0,
    //     0,
    //     "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    // let farmAddress4 = await masterInstance.callStatic.deployPool(
    //     "0xbe1aa00dA54733862C07DdD2A1CdE5C48a7dE7f0",
    //     ["0x1FC56B105c4F0A1a8038c2b429932B122f6B631f", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5"],
    //     bNumber,
    //     bNumber + 10000,
    //     0,
    //     0,
    //     "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    // await masterInstance.deployPool(
    //     "0xbe1aa00dA54733862C07DdD2A1CdE5C48a7dE7f0",
    //     ["0x1FC56B105c4F0A1a8038c2b429932B122f6B631f", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5"],
    //     bNumber,
    //     bNumber + 10000,
    //     0,
    //     0,
    //     "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    // await zFarmInstance.transferOwnership(masterInstance.address)
    // await zInstance.transferOwnership(masterInstance.address)

    // await zInstance.mint(masterInstance.address, 100)
    // console.log("1")
    // const farmingInstance = await ethers.getContractFactory('PsionicFarmInitializable');
    // let farm = farmingInstance.attach(farmAddress)
    // let farm2 = farmingInstance.attach(farmAddress2)
    //
    // const vaultAddress = await farm.psionicVault()
    // const vaultAddress2 = await farm2.psionicVault()

    console.log(farmAddress)
    // console.log(farmAddress2)
    // console.log(farmAddress3)
    // console.log(vaultAddress2)
    // console.log(farmAddress3)
    // console.log(farmAddress4)
}

deploy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
