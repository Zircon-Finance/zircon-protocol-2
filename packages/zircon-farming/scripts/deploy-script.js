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
    await masterInstance.deployPool(
        "0x770AA7074297E465E823bf2F45194e926aF0D05d",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0xc50A53dc95e3875640f5f9c3C65643b984918c66",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0x61DBB475DBb84Be23A0D555FA269754EDA88F5D1",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0x72C46b87135EE3a1133522392bd8Ee318Cf3b9B2",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0x17Bd5A512ac2906C89C37B3b863D69e418fBdaAa",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0xB62D77084D5621053c4E04C1c64588F102738088",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0xbDe1DbD3d1E080846eE153EF9EDAf708B98682f7",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0xCD45fDA8CA4f988C285c2f2a387d22Bc8B9CcB66",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0xBC026249fC2D6d636424ffa2e229d07f36a38Cb1",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0x7fEe8716e13a00cD73889aCB76D46217DD7A6E3e",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0x39c2edfdb8032bc166008180e1bb7eaa43af559d",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0x464feca42bce8693858fdd0c9c4313fee7168966",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0x804fde7ac41c40b6f743829a2e35336c91767271",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0xe8eEf11C1eae85844d800Bc18Fe31D4FBC5C5c83",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0xBB57187c7883d25a64a08640905376f4CeF6C1ef",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0x0c2887643e23Fbf4b3205E60492A5618eDdd4103",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0xc3722E72a64c4Cab0308d72067bC07c7689b4F2F",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0x8170b304bddbc58ab6bf8b728a1aafd39abe2d89",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0x6E9685c324Cdf126e5BF08F54573120A9c19E061",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0x45614680bd415d2B52B599210fE837b6df0945cF",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0x58c44bA47370A79f3b2214658072610D1AAC3061",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0xD5789306c2CA0ea2B63722C56A030806fbD6735B",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0xd504F7aF75719a902aF20f88Bf9300D7b3Ae6705",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0xe668120Df571bE7662a90f405C4490a8D5F7E777",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0xAA695d11C7f5CD2f26bf225BA0Ea00A0C9779b25",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0xad747801159496b5862e6Fa4331a9fe29852D7cb",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    await masterInstance.deployPool(
        "0xAf430A6d5f43249A9e8197263e7C18BB53990aE7",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    await masterInstance.deployPool(
        "0x28895C57bD25b03418BaDa484197Bd219958d61f",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    let farmAddress = await masterInstance.callStatic.deployPool(
        "0x770AA7074297E465E823bf2F45194e926aF0D05d",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress)
    let farmAddress2 = await masterInstance.callStatic.deployPool(
        "0xc50A53dc95e3875640f5f9c3C65643b984918c66",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress2)

    let farmAddress3 = await masterInstance.callStatic.deployPool(
        "0x61DBB475DBb84Be23A0D555FA269754EDA88F5D1",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress3)

    let farmAddress4 = await masterInstance.callStatic.deployPool(
        "0x72C46b87135EE3a1133522392bd8Ee318Cf3b9B2",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress4)

    let farmAddress27 = await masterInstance.callStatic.deployPool(
        "0x17Bd5A512ac2906C89C37B3b863D69e418fBdaAa",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress27)

    let farmAddress5 = await masterInstance.callStatic.deployPool(
        "0xB62D77084D5621053c4E04C1c64588F102738088",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress5)

    let farmAddress6 = await masterInstance.callStatic.deployPool(
        "0xbDe1DbD3d1E080846eE153EF9EDAf708B98682f7",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress6)

    let farmAddress7 = await masterInstance.callStatic.deployPool(
        "0xCD45fDA8CA4f988C285c2f2a387d22Bc8B9CcB66",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress7)

    let farmAddress8 = await masterInstance.callStatic.deployPool(
        "0xBC026249fC2D6d636424ffa2e229d07f36a38Cb1",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress8)

    let farmAddress9 = await masterInstance.callStatic.deployPool(
        "0x7fEe8716e13a00cD73889aCB76D46217DD7A6E3e",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress9)

    let farmAddress10 = await masterInstance.callStatic.deployPool(
        "0x39c2edfdb8032bc166008180e1bb7eaa43af559d",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress10)

    let farmAddress28 = await masterInstance.callStatic.deployPool(
        "0x464feca42bce8693858fdd0c9c4313fee7168966",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress28)

    let farmAddress11 = await masterInstance.callStatic.deployPool(
        "0x804fde7ac41c40b6f743829a2e35336c91767271",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress11)


    let farmAddress12 = await masterInstance.callStatic.deployPool(
        "0xe8eEf11C1eae85844d800Bc18Fe31D4FBC5C5c83",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress12)


    let farmAddress13 = await masterInstance.callStatic.deployPool(
        "0xBB57187c7883d25a64a08640905376f4CeF6C1ef",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress13)


    let farmAddress14 = await masterInstance.callStatic.deployPool(
        "0x0c2887643e23Fbf4b3205E60492A5618eDdd4103",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress14)


    let farmAddress15 = await masterInstance.callStatic.deployPool(
        "0xc3722E72a64c4Cab0308d72067bC07c7689b4F2F",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress15)

    let farmAddress16 = await masterInstance.callStatic.deployPool(
        "0x8170b304bddbc58ab6bf8b728a1aafd39abe2d89",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress16)

    let farmAddress17 = await masterInstance.callStatic.deployPool(
        "0x6E9685c324Cdf126e5BF08F54573120A9c19E061",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress17)

    let farmAddress18 = await masterInstance.callStatic.deployPool(
        "0x45614680bd415d2B52B599210fE837b6df0945cF",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress18)

    let farmAddress19 = await masterInstance.callStatic.deployPool(
        "0x58c44bA47370A79f3b2214658072610D1AAC3061",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878B06940aE243284CA214f92Bb71a2b032B8A"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress19)

    let farmAddress20 = await masterInstance.callStatic.deployPool(
        "0xD5789306c2CA0ea2B63722C56A030806fbD6735B",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress20)

    let farmAddress21 = await masterInstance.callStatic.deployPool(
        "0xd504F7aF75719a902aF20f88Bf9300D7b3Ae6705",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress21)

    let farmAddress22 = await masterInstance.callStatic.deployPool(
        "0xe668120Df571bE7662a90f405C4490a8D5F7E777",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress22)

    let farmAddress23 = await masterInstance.callStatic.deployPool(
        "0xAA695d11C7f5CD2f26bf225BA0Ea00A0C9779b25",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress23)

    let farmAddress24 = await masterInstance.callStatic.deployPool(
        "0xad747801159496b5862e6Fa4331a9fe29852D7cb",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress24)

    let farmAddress25 = await masterInstance.callStatic.deployPool(
        "0xAf430A6d5f43249A9e8197263e7C18BB53990aE7",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    console.log(farmAddress25)

    let farmAddress26 = await masterInstance.callStatic.deployPool(
        "0x28895C57bD25b03418BaDa484197Bd219958d61f",
        ["0x4545E94974AdACb82FC56BCf136B07943e152055"],
        bNumber,
        bNumber + 196000,
        0,
        0,
        "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")

    console.log(farmAddress26)




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

    // console.log(farmAddress)
    // console.log(farmAddress2)
    // console.log(farmAddress3)
    // console.log(vaultAddress2)
    // console.log(farmAddress3)
    // console.log(farmAddress4)
}

script()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
