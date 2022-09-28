const { ethers } = require('hardhat');




async function script() {
    try{
        // let erc20 = await ethers.getContractFactory('ERC20')
        // let ierc20 = erc20.attach("0xaf3ca2e58f6dae9b3d653dadea3ffcc94a878541")
        // await ierc20.approve("0xB47fD62Fe0F5B71C88276D18464B39Ea53b7eD02", ethers.constants.MaxUint256)
        console.log("1")
        const pfi = await ethers.getContractFactory("PsionicFarmVault")
        console.log(pfi)
        const ts = pfi.attach("0xDeeAcA1abBd0c99a7B424Cd0da9A7d37dc279d1d")
        await ts.add("0x98878B06940aE243284CA214f92Bb71a2b032B8A")
        // let t = await ts.deposit("1000000000000000")
    }catch (e) {
        console.error(e)
    }

}

function deployFarm(masterInstance, lpAddress, rewardTokens) {
    await masterInstance.deployPool(
        lpAddress,
        rewardTokens,
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    let farmAddress = await masterInstance.callStatic.deployPool(
        lpAddress,
        rewardTokens,
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    console.log("Farm address: ", farmAddress, " for lp: ", lpAddress)
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
    deployFarm(masterInstance, "0x770AA7074297E465E823bf2F45194e926aF0D05d", ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"])
    deployFarm(masterInstance, "0xc50A53dc95e3875640f5f9c3C65643b984918c66", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x61DBB475DBb84Be23A0D555FA269754EDA88F5D1", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x72C46b87135EE3a1133522392bd8Ee318Cf3b9B2", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x17Bd5A512ac2906C89C37B3b863D69e418fBdaAa", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xB62D77084D5621053c4E04C1c64588F102738088", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xbDe1DbD3d1E080846eE153EF9EDAf708B98682f7", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xCD45fDA8CA4f988C285c2f2a387d22Bc8B9CcB66", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xBC026249fC2D6d636424ffa2e229d07f36a38Cb1", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x7fEe8716e13a00cD73889aCB76D46217DD7A6E3e", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x39c2edfdb8032bc166008180e1bb7eaa43af559d", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x464feca42bce8693858fdd0c9c4313fee7168966", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x804fde7ac41c40b6f743829a2e35336c91767271", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x464feca42bce8693858fdd0c9c4313fee7168966", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xe8eEf11C1eae85844d800Bc18Fe31D4FBC5C5c83", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xBB57187c7883d25a64a08640905376f4CeF6C1ef", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xe8eEf11C1eae85844d800Bc18Fe31D4FBC5C5c83", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x0c2887643e23Fbf4b3205E60492A5618eDdd4103", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xc3722E72a64c4Cab0308d72067bC07c7689b4F2F", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x6E9685c324Cdf126e5BF08F54573120A9c19E061", ["0x4545E94974AdACb82FC56BCf136B07943e152055","0x98878B06940aE243284CA214f92Bb71a2b032B8A"])
    deployFarm(masterInstance, "0x8170b304bddbc58ab6bf8b728a1aafd39abe2d89", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xd504F7aF75719a902aF20f88Bf9300D7b3Ae6705", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xe668120Df571bE7662a90f405C4490a8D5F7E777", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xAA695d11C7f5CD2f26bf225BA0Ea00A0C9779b25", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xad747801159496b5862e6Fa4331a9fe29852D7cb", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xAf430A6d5f43249A9e8197263e7C18BB53990aE7", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x28895C57bD25b03418BaDa484197Bd219958d61f", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0xD5789306c2CA0ea2B63722C56A030806fbD6735B", ["0x4545E94974AdACb82FC56BCf136B07943e152055"])
    deployFarm(masterInstance, "0x45614680bd415d2B52B599210fE837b6df0945cF", ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"])
    deployFarm(masterInstance, "0x58c44bA47370A79f3b2214658072610D1AAC3061", ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"])
}

script()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
