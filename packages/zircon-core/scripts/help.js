



async function check() {

    // "0x0c2887643e23Fbf4b3205E60492A5618eDdd4103"
    // "0xB4adB9Fdc11F8b482E1162aC477757CAB75DA867"
    let token = await ethers.getContractFactory('ERC20');
    let tokenInstance = token.attach("0x0c2887643e23Fbf4b3205E60492A5618eDdd4103")
    let allowance = await tokenInstance.allowance("0x5eb3b9aaa4367d5f13b6db7eecc2def81c7f8aca", "0xB4adB9Fdc11F8b482E1162aC477757CAB75DA867")
    console.log("Allowance: ", allowance.toString())
    // Deploy Pylon Router
    // let pylonFactory = await ethers.getContractFactory('ZirconEnergyFactory');
    // let ft1 = pylonFactory.attach("0x9b38fD03fAf64Dcc5F1da1101326a072092420A8")
    // // let ft2 = pylonFactory.attach("0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54")
    // let energyRev = await ft1.getEnergyRevenue("0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878b06940ae243284ca214f92bb71a2b032b8a")
    // let energy = await ft1.getEnergy("0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878b06940ae243284ca214f92bb71a2b032b8a")
    // console.log("ft1", energy, energyRev)

    // address oldEnergyRev = IZirconEnergyFactory(energyFactory).getEnergyRevenue(_tokenA, _tokenB);
    // address oldEnergy = IZirconEnergyFactory(energyFactory).getEnergy(_tokenA, _tokenB);

    // let migrator = await ethers.getContractFactory('Migrator');
    // let migratorInstance = migrator.attach("0x6B722a4835055BE4DEcFb28646D5C2D9dFE43eFd")
    // console.log("ft1",await migratorInstance.energyFactory(), await migratorInstance.ptFactory(),  await migratorInstance.pylonFactory(), await migratorInstance.pairFactory())

    // let vab = await ft.virtualAnchorBalance()
    // let fs = await ft.formulaSwitch()
    // let akv = await ft.anchorKFactor()
    // let lastRootKTranslated = await ft.lastRootKTranslated()
    // let gammaMulDecimals = await ft.gammaMulDecimals()
    // let muMulDecimals = await ft.muMulDecimals()
    // let gammaEMA = await ft.gammaEMA()
    // let thisBlockEMA = await ft.thisBlockEMA()
    // let strikeBlock = await ft.strikeBlock()
    // let EMABlockNumber = await ft.EMABlockNumber()
    //
    // console.log("vab", vab.toString(), fs.toString(), akv.toString(), lastRootKTranslated.toString(), gammaMulDecimals.toString(), muMulDecimals.toString(), gammaEMA.toString(), thisBlockEMA.toString(), strikeBlock.toString(), EMABlockNumber.toString())
}

check()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
