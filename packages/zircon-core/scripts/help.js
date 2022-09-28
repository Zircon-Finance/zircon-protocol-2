



async function check() {
    // Deploy Pylon Router
    // let pylonFactory = await ethers.getContractFactory('ZirconEnergyFactory');
    // let ft1 = pylonFactory.attach("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd")
    // let ft2 = pylonFactory.attach("0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54")
    // console.log("ft1", await ft1.migrator(), await ft2.migrator())



    let migrator = await ethers.getContractFactory('Migrator');
    let migratorInstance = migrator.attach("0x6B722a4835055BE4DEcFb28646D5C2D9dFE43eFd")
    console.log("ft1",await migratorInstance.energyFactory(), await migratorInstance.ptFactory(),  await migratorInstance.pylonFactory(), await migratorInstance.pairFactory())

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
