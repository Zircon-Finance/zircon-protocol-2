



async function check() {
    // Deploy Pylon Router
    let pylonFactory = await ethers.getContractFactory('ZirconPylon');
    let ft = pylonFactory.attach("0xdbb6e1438a0c48A53D033757fB8a09f5aE879Da8")
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

    console.log("vab", vab.toString(), fs.toString(), akv.toString(), lastRootKTranslated.toString(), gammaMulDecimals.toString(), muMulDecimals.toString(), gammaEMA.toString(), thisBlockEMA.toString(), strikeBlock.toString(), EMABlockNumber.toString())
}

check()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
