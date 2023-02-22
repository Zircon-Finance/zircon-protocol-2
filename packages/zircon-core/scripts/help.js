const { ethers } = require('hardhat');

async function tokenDeploy() {
    const tokenContract = await ethers.getContractFactory("Token");
    const newToken = await tokenContract.deploy("ZRGTEST Token", "ZRGT", 18);
}

async function changeOwner() {
    const fts = await ethers.getContractFactory("FeeToSetter");
    let ftsInstance = await fts.attach("0xBF25a32FeBeC8f104eB6685c95011Ae793F3753e")
    await (await ftsInstance.initialize("0x510D9BEcBd3C7E89d9d48dB51e99Ae5B72c27226", "0xE6336ED822977ddc6C98459F0ADa1397e6F7649f", "0xE6336ED822977ddc6C98459F0ADa1397e6F7649f")).wait()
    await(await ftsInstance.setFeeToSetter("0xb2054c950C0AE9e5b570EB217A6023e530878B75")).wait()
    console.log("fts", await ftsInstance.feeToSetter())
}

async function helloBugs() {
    let migrator = await ethers.getContractFactory('Migrator');
    let migratorInstance = await migrator.attach("0x6B4e731b587250ab717128a02409d0F2f6a6ae7F")
    const energyFactory = await ethers.getContractFactory('ZirconEnergyFactory');
    const energyInstance = energyFactory.attach("0x2b0B3E7B54C3C551A09b01536a52F1DcD1c20405")
    // await(await migratorInstance.setEnergyMigrator("0x6B4e731b587250ab717128a02409d0F2f6a6ae7F")).wait()
    // await energyInstance.setMigrator("0x6B4e731b587250ab717128a02409d0F2f6a6ae7F")


    console.log("dio", await energyInstance.migrator())
    // await(await migratorInstance.initialize("0x2b0B3E7B54C3C551A09b01536a52F1DcD1c20405", "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54", "0xD424f1312D870d16D2526Ef4e87dDbcd6ca28d2f", "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd")).wait()
    // console.log("initialized")
    //
    //
    // console.log("migrator setted")
    //
    // await energyInstance.migrateEnergy("0x86AeA4e1Cf5067Df3e900Df5AB54Fdac0b0A7813", "0x5850b8D05B15Aed14aCAE56493B30Ef63671B0f5")
    // console.log("ciao")
}

// async function changeOwner() {
//     let feeToSetter = await ethers.getContractFactory('FeeToSetter');
//     let feeToSetterInstance = feeToSetter.attach("0x7A282B0BE9676BCc6377eD81A6f1196f0e7647a6")
//     // await feeToSetterInstance.setOwner("0x004B2bC5F27E7399E56Aab55B8bcB3e90935564d")
//     await feeToSetterInstance.initialize("0xCa7EB17663dd2C4A1943aDc80b74f9E02413147C", "0x498957f9c29abF48aa881306d75a3C58B19B26fC", "0xCd334f6BbBED0920fbA37c9dEE81D4058Fed2100")
// }

async function checkEnergy() {
    const energyFactory = await ethers.getContractFactory('ZirconEnergyFactory');
    const energyInstance = energyFactory.attach("0xFc413b0b8481eeBCf335Eb35B1A7a634fef64649")
    const energy = await energyInstance.getEnergy("0x98878b06940ae243284ca214f92bb71a2b032b8a", "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C")
    const energyRev = await energyInstance.getEnergyRevenue("0x98878b06940ae243284ca214f92bb71a2b032b8a", "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C")

    console.log("energy", energy.toString())
    console.log("energyRev", energyRev.toString())

    const pairFactory = await ethers.getContractFactory('ZirconFactory');
    const pairInstance = pairFactory.attach("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd")
    const pair = await pairInstance.getPair("0x98878b06940ae243284ca214f92bb71a2b032b8a", "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C")

    console.log("pair", pair.toString())

    const erc20 = await ethers.getContractFactory('ERC20');
    const erc20Instance = erc20.attach("0x98878b06940ae243284ca214f92bb71a2b032b8a")
    const pairContract = erc20.attach(pair)

    const pylonFactory = await ethers.getContractFactory('ZirconPylonFactory');
    const pylonFactoryInstance = pylonFactory.attach("0x65815a6e55fA08fcdE76ad772Bd64A4F264a6924")
    const pylon = await pylonFactoryInstance.getPylon("0x98878b06940ae243284ca214f92bb71a2b032b8a", "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C")

    console.log("pylon", pylon.toString())

    const pairTAllowance = await pairContract.allowance(energy.toString(), pylon.toString() )
    const erc20Allowance = await erc20Instance.allowance(energy.toString(), pylon.toString() )

    console.log("pairAllowance", pairTAllowance.toString())
    console.log("erc20Allowance", erc20Allowance.toString())
}

async function deployNewMigrator() {
    const [account] = await ethers.getSigners();
    let deployerAddress = account.address;

    //Deploy Factory
    const migrator = await ethers.getContractFactory('Migrator');
    const migratorInstance = await migrator.deploy();
    console.log("migratorInstance::", migratorInstance.address)
}

async function checkMigrator() {
    let migrator = await ethers.getContractFactory('ZirconFactory');
    let migratorInstance = migrator.attach("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd")
    console.log("mi::", await migratorInstance.migrator())
}

async function check() {
    // Deploy Pylon Router
    // let pylonFactory = await ethers.getContractFactory('ZirconEnergyFactory');
    // let ft1 = pylonFactory.attach("0x49e15A5ea67FD7ebe70EB539a51abf1919282De8")
    // // let ft2 = pylonFactory.attach("0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54")
    // let energyRev = await ft1.getEnergyRevenue("0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878b06940ae243284ca214f92bb71a2b032b8a")
    // let energy = await ft1.getEnergy("0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878b06940ae243284ca214f92bb71a2b032b8a")
    // console.log("ft1", energy, energyRev)

    // address oldEnergyRev = IZirconEnergyFactory(energyFactory).getEnergyRevenue(_tokenA, _tokenB);
    // address oldEnergy = IZirconEnergyFactory(energyFactory).getEnergy(_tokenA, _tokenB);

    // let migrator = await ethers.getContractFactory('Migrator');
    // let migratorInstance = migrator.attach("0x6B722a4835055BE4DEcFb28646D5C2D9dFE43eFd")
    // console.log("ft1",await migratorInstance.energyFactory(), await migratorInstance.ptFactory(),  await migratorInstance.pylonFactory(), await migratorInstance.pairFactory())

    let pylonAbi = await ethers.getContractFactory('ZirconPylon');
    let ft = pylonAbi.attach("0xdd7b7849002cf2fd1eb5b659bda209132ddd19d0")

    let vab = await ft.virtualAnchorBalance()
    let fs = await ft.formulaSwitch()
    let akv = await ft.anchorKFactor()
    let lastRootKTranslated = await ft.lastRootKTranslated()
    let gammaMulDecimals = await ft.gammaMulDecimals()
    let muMulDecimals = await ft.muMulDecimals()
    let gammaEMA = await ft.gammaEMA()
    let thisBlockEMA = await ft.thisBlockEMA()
    let strikeBlock = await ft.strikeBlock()
    let EMABlockNumber = await ft.EMABlockNumber()

    console.log("vab", vab.toString())
    console.log("formulaSwitch", fs.toString())
    console.log("anchorK", akv.toString())
    console.log("gamma", gammaMulDecimals.toString())

}

changeOwner()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
