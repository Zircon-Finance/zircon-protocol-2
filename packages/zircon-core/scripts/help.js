



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

check()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
