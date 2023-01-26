const {ethers} = require("hardhat");
const {coreFixtures, librarySetup} = require("./fixtures");
const {expandTo18Decimals,expandToNDecimals, getAmountOut, sqrt, format, getFtv} = require("./utils");
const {saveValuesForSDK, casesSDK} = require("./generate-json-sdk-test");
const {createTokens, loadFromProd} = require("../../scripts/shared/loadFromProd");
const axios = require("axios")
const API_MONITORING = "https://edgeapi.zircon.finance/static/monitoring"
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]
let pylons = []
let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair, poolTokenContract, tokenContract, pairContract, pylonContract;

let tokens = []; // used for load from production

async function initData(library) {
    let fixtures = await coreFixtures(library)
    pylons = []
    pylons.push({
        token0: fixtures.token0.address,
        token1: fixtures.token1.address,
        pairAddress: fixtures.pair.address,
        pylonAddress: fixtures.pylonInstance.address,
        poolAddress0: fixtures.poolTokenInstance0.address,
        poolAddress1: fixtures.poolTokenInstance1.address
    })
    return fixtures
}

// Desctrcture Factories
function destructureFactories(fixtures) {
    factoryPylonInstance = fixtures.factoryPylonInstance
    factoryPTInstance = fixtures.ptFactoryInstance
    factoryEnergyInstance = fixtures.factoryEnergyInstance
    factoryInstance = fixtures.factoryInstance
    account = fixtures.account
    account2 = fixtures.account2
    tokenContract = fixtures.tokenContract
    pairContract = fixtures.pairContract
    pylonContract = fixtures.pylonContract
    poolTokenContract = fixtures.poolTokenContract
    migratorInstance = fixtures.migratorInstance
}

async function destructure(fixtures, index) {
    destructureFactories(fixtures)

    let pylon = pylons[index]
    pylonInstance = pylonContract.attach(pylon.pylonAddress)
    pair = pairContract.attach(pylon.pairAddress)
    token0 = poolTokenContract.attach(pylon.token0)
    token1 = poolTokenContract.attach(pylon.token1)
    let pairTk0 = await pair.token0()
    isFloatRes0 = token0.address === pairTk0
    console.log("is", isFloatRes0)
    poolTokenInstance0 = poolTokenContract.attach(pylon.poolAddress0)
    poolTokenInstance1 = poolTokenContract.attach(pylon.poolAddress1)
    return {
        ...fixtures,
        pylonInstance,
        pair,
        token0,
        token1,
        poolTokenInstance0,
        poolTokenInstance1,
        isFloatRes0
    }
}

exports.getFixturesForPylon = async function (fixtures, index) {
    return await destructure(fixtures, index)
}

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
const DECIMALS = ethers.BigNumber.from(10).pow(18)
const overrides = {
    gasLimit: 9999999
}

function getTokenBySymbol(symbol) {
    return tokens.find(token => token.symbol == symbol)
}

exports.getPylonIndexBy = function getPylonIndexBy(tkSmb0, tkSmb1) {
    let tk0 = getTokenBySymbol(tkSmb0)
    let tk1 = getTokenBySymbol(tkSmb1)
    return pylons.findIndex(pylon => pylon.token0 === tk0.address && pylon.token1 === tk1.address)
}

exports.initPylonsFromProdSnapshot = async function initProductionData(library) {
    const monitoring = await axios.get(API_MONITORING);
    tokens = await createTokens(monitoring)
    let fixtures = await initData(library);
    await destructure(fixtures, 0);

    let pylonsToAdd = await loadFromProd(
        migratorInstance.address,
        factoryInstance.address,
        factoryPylonInstance.address,
        factoryEnergyInstance.address,
        factoryPTInstance.address,
        account.address,
        tokens,
        library
    )
    pylons.push(...pylonsToAdd);
    return fixtures

}
exports.addPylon = async function addPylon(fixtures, token0Decimals, token1Decimals) {
    destructureFactories(fixtures);
    let tok = await ethers.getContractFactory('Token');
    let tk0 = await tok.deploy('Token1', 'TOK1', token0Decimals);
    let tk1 = await tok.deploy('Token2', 'TOK2', token1Decimals);

    await factoryInstance.createPair(tk0.address, tk1.address, factoryPylonInstance.address);
    let lpAddress = await factoryInstance.getPair(tk0.address, tk1.address)

    await factoryPylonInstance.addPylon(lpAddress, tk0.address, tk1.address);
    let pylonAddress = await factoryPylonInstance.getPylon(tk0.address, tk1.address)

    let poolAddress0 = await factoryPTInstance.getPoolToken(pylonAddress, tk0.address);
    let poolAddress1 = await factoryPTInstance.getPoolToken(pylonAddress, tk1.address);

    pylons.push({token0: tk0.address, token1: tk1.address, pairAddress: lpAddress, pylonAddress, poolAddress0, poolAddress1})
    return pylonAddress
}

exports.initPylon = async function initPylon(fixtures, token0Amount, token1Amount, pylonPercentage, index=0) {
    let fixtures2 = await destructure(fixtures, index);
    console.log("initializing to init")
    let token0Decimals = expandToNDecimals(token0Amount, await fixtures2.token0.decimals());
    let token1Decimals = expandToNDecimals(token1Amount, await fixtures2.token1.decimals());

    let token0Pair = token0Decimals.mul(100 - pylonPercentage).div(100);
    let token1Pair = token1Decimals.mul(100 - pylonPercentage).div(100);

    let token0Pylon = token0Decimals.mul(pylonPercentage).div(100);
    let token1Pylon = token1Decimals.mul(pylonPercentage).div(100);


    await token0.transfer(pair.address, token0Pair);
    await token1.transfer(pair.address, token1Pair);
    await pair.mint(account.address)

    await token0.transfer(pylonInstance.address, token0Pylon);
    await token1.transfer(pylonInstance.address, token1Pylon);
    // Let's start the pylon
    await pylonInstance.initPylon(account.address)
    console.log("finished initializing pylon")
    return fixtures2
    // Let's start the pylon
}

exports.mintSync = async function mintSync(address, tokenAmount, isAnchor, fixtures, isDecimals, index=0) {

    await destructure(fixtures, index)
    let decimals = isAnchor ? await token1.decimals() : await token0.decimals()
    let tokenDecimals = !isDecimals ? expandToNDecimals(tokenAmount, decimals) : tokenAmount;

    console.log("\n===Starting MintSync ", casesSDK.length, isAnchor ? " Anchor ===": " Float ===");
    console.log("== AmountIn:", format(tokenDecimals))
    if(isAnchor) {
        await token1.transfer(pylonInstance.address, tokenDecimals)
    } else {
        await token0.transfer(pylonInstance.address, tokenDecimals)
    }

    // Just simulating for SDK, callStatic doesn't have an impact on the blockchain
    let staticResult = await pylonInstance.callStatic.mintPoolTokens(account.address, isAnchor)
    await saveValuesForSDK(true, false, tokenDecimals, 0, staticResult, 0, isAnchor, fixtures)

    let balanceBefore = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)

    let results = await pylonInstance.mintPoolTokens(address, isAnchor)

    let balanceAfter = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)

    console.log("\n===MintSync Complete === AmOut: ", staticResult.toString())
    return results
}
//
exports.mintAsync = async function mintAsync(address, token0Amount, token1Amount, isAnchor, fixtures, isDecimals, index=0) {

    await destructure(fixtures, index)
    let decimals0 = await token0.decimals()
    let decimals1 = await token1.decimals()

    let token0Decimals = !isDecimals ? expandToNDecimals(token0Amount, decimals0) : token0Amount;
    let token1Decimals = !isDecimals ? expandToNDecimals(token1Amount, decimals1) : token1Amount;

    console.log("\n===Starting MintAsync", casesSDK.length, isAnchor ? "Anchor ===": "Float ===")
    console.log("== AmountIn:", format(token0Decimals), format(token1Decimals))

    await token0.transfer(pylonInstance.address, token0Decimals)
    await token1.transfer(pylonInstance.address, token1Decimals)

    // Just simulating for SDK, callStatic doesn't have an impact on the blockchain
    let staticResult = await pylonInstance.callStatic.mintAsync(address, isAnchor)

    await saveValuesForSDK(false, false, token0Decimals, token1Decimals, staticResult, null, isAnchor, fixtures)

    let balanceBefore = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)

    let results = await pylonInstance.mintAsync(address, isAnchor)

    console.log("\n===MintAsync Complete === AmOut:", staticResult.toString())
    return results
}
//
exports.burn = async function burn(address, poolTokenAmount, isAnchor, fixtures, isDecimals, index=0) {

    await destructure(fixtures, index)

    let tokenDecimals = !isDecimals? expandTo18Decimals(poolTokenAmount) : poolTokenAmount;

    console.log("\n===Starting Burn ", casesSDK.length, " ===")
    if(isAnchor) {
        await poolTokenInstance1.transfer(pylonInstance.address, tokenDecimals)
    } else {
        await poolTokenInstance0.transfer(pylonInstance.address, tokenDecimals)
    }
    let staticResult = await pylonInstance.callStatic.burn(address, isAnchor)

    await saveValuesForSDK(true, true, poolTokenAmount, null, staticResult, null, isAnchor, fixtures)

    let balanceBefore = isAnchor ? await token1.balanceOf(address) : await token0.balanceOf(address)
    let results = await pylonInstance.burn(address, isAnchor)

    let balanceAfter = isAnchor ? await token1.balanceOf(address) : await token0.balanceOf(address)

    console.log("\n===Burn Complete === AmOut: ", staticResult.toString())
    return results;
}
//
exports.burnAsync = async function burnAsync(address, poolTokenAmount, isAnchor, fixtures, isDecimals, index=0) {

    await destructure(fixtures, index)

    let tokenDecimals = !isDecimals ? expandTo18Decimals(poolTokenAmount) : poolTokenAmount;

    console.log("\n===Starting BurnAsync ", casesSDK.length, " ===")

    if (isAnchor) {
        await poolTokenInstance1.transfer(pylonInstance.address, tokenDecimals)
    } else {
        await poolTokenInstance0.transfer(pylonInstance.address, tokenDecimals)
    }
    let staticCall = await pylonInstance.callStatic.burnAsync(address, isAnchor)
    await saveValuesForSDK(false, true, poolTokenAmount, null, staticCall[0].toString(), staticCall[1].toString(), isAnchor, fixtures)
    let results = await pylonInstance.burnAsync(address, isAnchor)

    console.log("\n===BurnAsync Complete ===, amOut0, 1:", staticCall[0].toString(), staticCall[1].toString())
    return results

}
// exports.setPrice = async function setPrice(address, targetPrice, fixtures) {
//
//     destructure(fixtures);
//
//     let pairResT = await pair.getReserves();
//     let resIn;
//     let resOut;
//     let targetPriceDecimals = expandTo18Decimals(targetPrice)
//
//     let price = pairResT[1].mul(DECIMALS).div(pairResT[0]);
//
//     console.log("price, targetPrice", format(price), format(targetPriceDecimals));
//
//     let dump = targetPriceDecimals.lt(price);
//
//     if(dump) {
//         resIn = pairResT[0]
//         resOut = pairResT[1]
//         targetPriceDecimals = (DECIMALS.pow(2)).div(targetPriceDecimals)
//         console.log("dump target: ", format(targetPriceDecimals))
//     } else {
//         resIn = pairResT[1]
//         resOut = pairResT[0]
//     }
//
//     let x = sqrt((targetPriceDecimals.mul(resIn).div(DECIMALS)).mul(resOut)).sub(resIn)
//
//     // let sqrt2 = sqrt(expandTo18Decimals(2).mul(expandTo18Decimals(2)));
//     // console.log("Sqrt test ", format(sqrt2))
//     //x = math.sqrt(adjusted_price * res_in * res_out) - res_in
//
//     console.log("X", format(x))
//
//     //TODO: Adjust by fee as well
//
//     let out = getAmountOut(x, resIn, resOut);
//
//     if(dump) {
//         await token0.transfer(pair.address, x)
//         await pair.swap(0, out, account.address, '0x', overrides)
//     } else {
//         await token1.transfer(pair.address, x)
//         await pair.swap(out, 0, account.address, '0x', overrides)
//
//     }
// }
exports.setPrice = async function setPrice(address, targetPrice, fixtures, index=0) {
    fixtures = await destructure(fixtures, index);
    let tk0Decimals = await token0.decimals()
    let tk1Decimals = await token1.decimals()

    let decimalsR0 = ethers.BigNumber.from(10).pow(fixtures.isFloatRes0 ? tk0Decimals : tk1Decimals)
    let decimalsR1 = ethers.BigNumber.from(10).pow(fixtures.isFloatRes0 ? tk1Decimals : tk0Decimals)

    let pairResT = await pair.getReserves();
    let resIn;
    let resOut;

    let targetPriceDecimals = expandToNDecimals(targetPrice, fixtures.isFloatRes0 ? tk1Decimals : tk0Decimals)

    let price = pairResT[1].mul(decimalsR0).div(pairResT[0]);
    let dump = targetPriceDecimals.lt(price);

    console.log("price:", price.toString())
    console.log("target price:", targetPriceDecimals.toString())
    console.log("dump:", dump)

    if(dump) {
        resIn = pairResT[0]
        resOut = pairResT[1]
        targetPriceDecimals = (decimalsR1.mul(decimalsR0)).div(targetPriceDecimals)
        price = (decimalsR0.mul(decimalsR1)).div(price)
        console.log("dump target: ", targetPriceDecimals.toString(), " from: ", price.toString())
    } else {
        resIn = pairResT[1]
        resOut = pairResT[0]
        console.log("dump target", targetPriceDecimals.toString(), " from: ", price.toString())
    }

    let x = sqrt((targetPriceDecimals.mul(resIn)).mul(resOut).div(dump ? decimalsR1 : decimalsR0)).sub(resIn)

    // let sqrt2 = sqrt(expandTo18Decimals(2).mul(expandTo18Decimals(2)));
    // console.log("Sqrt test ", format(sqrt2))
    //x = math.sqrt(adjusted_price * res_in * res_out) - res_in

    let out = getAmountOut(x, resIn, resOut);
    console.log("changing x: for:", x.toString(), out.toString())

    if(dump) {
        await (fixtures.isFloatRes0 ? token0 : token1).transfer(pair.address, x)
        await pair.swap(0, out, account.address, '0x', overrides)
    } else {
        await (!fixtures.isFloatRes0 ? token0 : token1).transfer(pair.address, x)
        await pair.swap(out, 0, account.address, '0x', overrides)
    }
}
//
async function forwardTime(provider, blocksToMine) {

    let blocksBig = ethers.BigNumber.from(blocksToMine);

    await provider.send("hardhat_mine", [blocksBig.toHexString()]);

}


exports.unblockOracle = async function unblockOracle(provider, fixtures, index=0) {

    await forwardTime(ethers.provider, 96);
    await forwardTime(ethers.provider, 96);
    await updateMint(fixtures, index);

    await forwardTime(ethers.provider, 96);
    await forwardTime(ethers.provider, 96);
    await forwardTime(ethers.provider, 96);
}
//

async function updateMint(fixtures, index=0) {
    await destructure(fixtures, index)
    console.log("\n===Starting updateMint ===")
    await token0.transfer(pylonInstance.address, MINIMUM_LIQUIDITY)
    //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
    await pylonInstance.mintPoolTokens(account.address, false)
    console.log("\n=== updateMint complete ===")
}

async function printPoolTokens(address, fixtures, doPrint, index=0) {

    await destructure(fixtures, index);

    let ptTotal0 = await poolTokenInstance0.totalSupply();
    let ptTotal0F = ethers.utils.formatEther(ptTotal0);
    let pt0 = await poolTokenInstance0.balanceOf(address);
    let pt0F = ethers.utils.formatEther(pt0);


    let ptTotal1 = await poolTokenInstance1.totalSupply();
    let ptTotal1F = ethers.utils.formatEther(ptTotal1);
    let pt1 = await poolTokenInstance1.balanceOf(address);
    let pt1F = ethers.utils.formatEther(pt1);

    if(doPrint) {
        console.log("PoolToken State: PTotal0: " + ptTotal0F + ", P0Balance: " + pt0F + ", PTotal1: " + ptTotal1F + ", P1Balance: " + pt1F);
    }


    return {
        ptTotal0,
        pt0,
        ptTotal1,
        pt1
    }
}



async function printState(fixtures, doPrint, index=0) {

    await destructure(fixtures, index)

    //we want to return and print all key variables necessary to define the state of a pylon
    //these are vab, vfb, p2x, p2y, gamma
    //Separately we print sync reserves, translated reserves and price

    let vab = await pylonInstance.virtualAnchorBalance();
    let vabF = ethers.utils.formatEther(vab);

    let gamma = await pylonInstance.gammaMulDecimals();
    let gammaF = ethers.utils.formatEther(gamma);
    let vfb = await pylonInstance.virtualFloatBalance();
    let vfbF = ethers.utils.formatEther(vfb);
    let p2x = await pylonInstance.p2x();
    let p2xF = ethers.utils.formatEther(p2x);
    let p2y = await pylonInstance.p2y();
    let p2yF = ethers.utils.formatEther(p2y);

    let sync = await pylonInstance.getSyncReserves();


    if(doPrint) {
        console.log("\n===Pylon State: VAB: " + vabF + ", Gamma: " + gammaF + ", VFB: " + vfbF + ", p2x: " + p2xF + ", p2y: " + p2yF);
    }


    return {
        vab,
        gamma,
        vfb,
        p2x,
        p2y,
        sync
    }

}


exports.getPTPrice = async function getPTPrice(fixtures, doPrint) {
    let pylonState = await printState(fixtures, false)
    let pairState = await printPairState(fixtures, false)
    let ptState = await printPoolTokens(account.address, fixtures, false)

    let ftv = getFtv(pairState.tr0, pairState.tr1, pylonState.gamma, pylonState.sync[0]).mul(pairState.tr0).div(pairState.tr1)
    let ptTotal = ptState.ptTotal0;

    let ptPrice = ftv.mul(DECIMALS).div(ptTotal);

    if(doPrint) {
        console.log("Price of Float PTs: ", format(ptPrice))
    }
    return ptPrice;
}


async function getPairReservesNormalized(fixtures) {
    let pairResT = await pair.getReserves();

    return [fixtures.isFloatRes0 ? pairResT[0] : pairResT[1], fixtures.isFloatRes0 ? pairResT[1] : pairResT[0]]
}

async function printPairState(fixtures, doPrint, index=0) {

    fixtures = await destructure(fixtures, index)

    let pairResT = await getPairReservesNormalized(fixtures);

    let ptb = await pair.balanceOf(pylonInstance.address);
    let ptt = await pair.totalSupply();

    let price = pairResT[1].mul(DECIMALS).div(pairResT[0])
    let priceF = ethers.utils.formatEther(price);

    let tr0 = pairResT[0].mul(ptb).div(ptt);
    let tr0F = ethers.utils.formatEther(tr0);

    let tr1 = pairResT[1].mul(ptb).div(ptt);
    let tr1F = ethers.utils.formatEther(tr1);

    let rootK = sqrt(tr0.mul(tr1))
    let rootKF = ethers.utils.formatEther(rootK);

    if(doPrint) {
        console.log("\n===Pair State: TR0: " + tr0F + ", TR1: " + tr1F + ", Price: " + priceF + ", rootK: " + rootKF);
    }

    return {
        pairResT,
        ptb,
        ptt,
        price,
        tr0,
        tr1,
        rootK
    }
}

exports.printState = printState;
exports.updateMint = updateMint
exports.printPairState = printPairState;
exports.initData = initData
exports.forwardTime = forwardTime
exports.printPoolTokens = printPoolTokens;
