const { ethers } = require('hardhat');



async function script() {
    const erc20 = await ethers.getContractAt("IERC20Metadata", "0xC9Eb4433B8a053b0ed3bf8de419C0f58b37b6eD1" )
    // let lp = await erc20.attach("0xC9Eb4433B8a053b0ed3bf8de419C0f58b37b6eD1");
    const ts = await erc20.decimals()

    console.log(ts)
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


    const farming = await ethers.getContractFactory('PsionicFarmFactory');
    const bNumber = await ethers.provider.getBlockNumber()
    let masterInstance = await farming.deploy()
    // IERC20Metadata _stakedToken,
    //     IERC20Metadata _rewardToken,
    //     uint256 _rewardPerBlock,
    //     uint256 _startBlock,
    //     uint256 _bonusEndBlock,
    //     uint256 _poolLimitPerUser,
    //     uint256 _numberBlocksForUserLimit,
    //     address _admin
    let farmAddress = await masterInstance.deployPool("0x88b236730bBf3761fc9f78356eaA9ec28514975a", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5" ,100, bNumber, bNumber, 100, 100, "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")
    // await zFarmInstance.transferOwnership(masterInstance.address)
    // await zInstance.transferOwnership(masterInstance.address)

    // await zInstance.mint(masterInstance.address, 100)
    console.log(bNumber)
    console.log(`MasterChef deployed to : ${masterInstance.address}`);
    console.log(farmAddress);
}

script()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
