const fs = require('fs')
let casesSDK = []

const generateJSONFile = async () => {
    let data = JSON.stringify(casesSDK, null, 2);
    fs.writeFileSync('./test/shared/json/test-cases.json', data);
}

// This function save all the values needed to replicate transaction in the SDK
const saveValuesForSDK = async (isSync, isBurn, amountIn0, amountIn1, amountOut0, amountOut1, isAnchor, fixtures) => {

    // Destructuring
    let token0 = fixtures.token0
    let token1 = fixtures.token1
    let poolTokenInstance0 = fixtures.poolTokenInstance0
    let poolTokenInstance1 = fixtures.poolTokenInstance1
    let pair = fixtures.pair
    let pylonInstance = fixtures.pylonInstance
    let factoryEnergyInstance = fixtures.factoryEnergyInstance
    let account = fixtures.account
    let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

    // Getting all the values
    let reserveAnchorEnergy = await token1.balanceOf(energyAddress);
    let reservePtEnergy = await pair.balanceOf(energyAddress);
    let pylonRes = await pylonInstance.getSyncReserves();
    let pairResIni = await pair.getReserves();
    let ptb = await pair.balanceOf(pylonInstance.address);
    let ptt = await pair.totalSupply();
    let ftt = await poolTokenInstance0.totalSupply();
    let att = await poolTokenInstance1.totalSupply();
    let gamma = await pylonInstance.gammaMulDecimals()
    let muuu = await pylonInstance.muMulDecimals()
    let vab = await pylonInstance.virtualAnchorBalance()
    let vfb = await pylonInstance.virtualFloatBalance()
    let gEMA = await pylonInstance.gammaEMA()
    let formulaSwitch = await pylonInstance.formulaSwitch()
    let lastRootKTranslated = await pylonInstance.lastRootKTranslated()
    let lastFloatAccumulator = await pylonInstance.lastFloatAccumulator()
    let thisBlockEMA = await pylonInstance.thisBlockEMA()
    let EMABlockNumber = await pylonInstance.EMABlockNumber()
    let strikeBlock = await pylonInstance.strikeBlock()
    let lastPrice = await pylonInstance.lastPrice()
    let lastOracleTimestamp = await pylonInstance.lastOracleTimestamp()
    let p2x = await pylonInstance.p2x()
    let p2y = await pylonInstance.p2y()
    let block = await ethers.provider.getBlockNumber()
    let lastK = await pair.kLast()
    let price0CumulativeLast = await pair.price0CumulativeLast()
    let price1CumulativeLast = await pair.price1CumulativeLast()
    let initBlock = await ethers.provider.getBlockNumber();
    let initTimestamp = (await ethers.provider.getBlock(initBlock)).timestamp;

    let tx = {
        resPair0: pairResIni[0].toString(),
        resPair1: pairResIni[1].toString(),
        resPylon0: pylonRes[0].toString(),
        resPylon1: pylonRes[1].toString(),
        totalSupply: ptt.toString(),
        ptb: ptb.toString(),
        anchorTotalSupply: att.toString(),
        floatTotalSupply: ftt.toString(),
        gamma: gamma.toString(),
        mu: muuu.toString(),
        vab: vab.toString(),
        vfb: vfb.toString(),
        gEMA: gEMA.toString(),
        fs: formulaSwitch,
        isAnchor: isAnchor,
        isBlocked: false,
        lrkt: lastRootKTranslated.toString(),
        thisBlockEMA: thisBlockEMA.toString(),
        EMABlockNumber: EMABlockNumber.toString(),
        strikeBlock: strikeBlock.toString(),
        lastFloatAccumulator: lastFloatAccumulator.toString(),
        blockNumber: block.toString(),
        timestamp: initTimestamp.toString(),
        lastK: lastK.toString(),
        price0CumulativeLast: price0CumulativeLast.toString(),
        price1CumulativeLast: price1CumulativeLast.toString(),
        amountOut: amountOut0.toString(),
        amountOut2: amountOut1 ? amountOut1.toString() : undefined,
        amountIn: amountIn0.toString(),
        amountIn2: amountIn1 ? amountIn1.toString() : undefined,
        lastOracleTimestamp: lastOracleTimestamp.toString(),
        lastBlockTimestamp: pairResIni[2].toString(),
        lastPrice: lastPrice.toString(),
        skip: false,
        isSync: isSync,
        isBurn: isBurn,
        p2x: p2x.toString(),
        p2y: p2y.toString(),
        reservePtEnergy: reservePtEnergy.toString(),
        reserveAnchorEnergy: reserveAnchorEnergy.toString(),
    }
    casesSDK.push(tx)
}

module.exports.saveValuesForSDK = saveValuesForSDK
module.exports.generateJSONFile = generateJSONFile
module.exports.casesSDK = casesSDK
