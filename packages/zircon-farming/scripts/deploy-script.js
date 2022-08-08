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
    const masterInstance = farming.attach("0xa83447201013d6D7Fa3b7b951E0AF07bC3c2E450")

    let farmAddress = await masterInstance.callStatic.deployPool(
        "0x95FF05b0c45fE642fe0A21BA8A66cE54635Ff141",
        ["0x37822de108AFFdd5cDCFDaAa2E32756Da284DB85", "0xed13B028697febd70f34cf9a9E280a8f1E98FD29"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    await masterInstance.deployPool(
        "0x95FF05b0c45fE642fe0A21BA8A66cE54635Ff141",
        ["0x37822de108AFFdd5cDCFDaAa2E32756Da284DB85", "0xed13B028697febd70f34cf9a9E280a8f1E98FD29"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    let farmAddress2 = await masterInstance.callStatic.deployPool(
        "0xC8D67ef36391ae8C08928ca5BFD6d8cF02C077B8",
        ["0x37822de108AFFdd5cDCFDaAa2E32756Da284DB85", "0xed13B028697febd70f34cf9a9E280a8f1E98FD29"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    await masterInstance.deployPool(
        "0xC8D67ef36391ae8C08928ca5BFD6d8cF02C077B8",
        ["0x37822de108AFFdd5cDCFDaAa2E32756Da284DB85", "0xed13B028697febd70f34cf9a9E280a8f1E98FD29"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    let farmAddress3 = await masterInstance.callStatic.deployPool(
        "0x0d176f03892811101c1e38cda0E060c721928AFB",
        ["0x1FC56B105c4F0A1a8038c2b429932B122f6B631f", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    await masterInstance.deployPool(
        "0x0d176f03892811101c1e38cda0E060c721928AFB",
        ["0x1FC56B105c4F0A1a8038c2b429932B122f6B631f", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    let farmAddress4 = await masterInstance.callStatic.deployPool(
        "0xbe1aa00dA54733862C07DdD2A1CdE5C48a7dE7f0",
        ["0x1FC56B105c4F0A1a8038c2b429932B122f6B631f", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5"],
        bNumber,
        bNumber + 10000,
        0,
        0,
        "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    await masterInstance.deployPool(
        "0xbe1aa00dA54733862C07DdD2A1CdE5C48a7dE7f0",
        ["0x1FC56B105c4F0A1a8038c2b429932B122f6B631f", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5"],
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

deploy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
