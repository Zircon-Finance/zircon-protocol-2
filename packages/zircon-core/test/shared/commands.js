const {ethers} = require("hardhat");
const {coreFixtures, librarySetup} = require("./fixtures");
const {expandTo18Decimals, getAmountOut, sqrt, format} = require("./utils");
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]


let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair;

function destructure(fixtures) {
    // factoryInstance = fixtures.factoryInstance

    token0 = fixtures.token0
    token1 = fixtures.token1
    poolTokenInstance0 = fixtures.poolTokenInstance0
    poolTokenInstance1 = fixtures.poolTokenInstance1
    pair = fixtures.pair
    pylonInstance = fixtures.pylonInstance
    factoryPylonInstance = fixtures.factoryPylonInstance
    factoryEnergyInstance = fixtures.factoryEnergyInstance
    account = fixtures.account
    account2 = fixtures.account2
}

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
const DECIMALS = ethers.BigNumber.from(10).pow(18)
const overrides = {
    gasLimit: 9999999
}

exports.initPylon = async function initPylon(token0Amount, token1Amount, pylonPercentage, library) {

    let fixtures = await initData(library);
    destructure(fixtures);

    // console.log("fixtures: ", fixtures)

    let token0Decimals = expandTo18Decimals(token0Amount);
    let token1Decimals = expandTo18Decimals(token1Amount);

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

    return fixtures
    // Let's start the pylon

}

exports.mintSync = async function mintSync(address, tokenAmount, isAnchor, fixtures, isDecimals) {

    destructure(fixtures)

    let tokenDecimals = !isDecimals? expandTo18Decimals(tokenAmount) : tokenAmount;

    console.log("\n===Starting MintSync", isAnchor ? "Anchor ===": "Float ===");
    console.log("== AmountIn:", format(tokenDecimals))
    if(isAnchor) {
        await token1.transfer(pylonInstance.address, tokenDecimals)
    } else {
        await token0.transfer(pylonInstance.address, tokenDecimals)
    }

    let results = await pylonInstance.mintPoolTokens(account.address, isAnchor)
    console.log("\n===MintSync Complete ===")
    return results
}
//
exports.mintAsync = async function mintAsync(address, token0Amount, token1Amount, isAnchor, fixtures, isDecimals) {

    destructure(fixtures)

    let token0Decimals = !isDecimals? expandTo18Decimals(token0Amount) : token0Amount;
    let token1Decimals = !isDecimals? expandTo18Decimals(token1Amount) : token1Amount;

    console.log("\n===Starting MintAsync ===")

    await token0.transfer(pylonInstance.address, token0Decimals)
    await token1.transfer(pylonInstance.address, token1Decimals)

    let results = await pylonInstance.mintAsync(address, isAnchor)
    console.log("\n===MintAsync Complete ===")
    return results
}
//
exports.burn = async function burn(address, poolTokenAmount, isAnchor, fixtures, isDecimals) {

    destructure(fixtures)

    let tokenDecimals = !isDecimals? expandTo18Decimals(poolTokenAmount) : poolTokenAmount;

    console.log("\n===Starting Burn ===")
    if(isAnchor) {
        await poolTokenInstance1.transfer(pylonInstance.address, tokenDecimals)
    } else {
        await poolTokenInstance0.transfer(pylonInstance.address, tokenDecimals)
    }

    let results = await pylonInstance.burn(address, isAnchor)
    console.log("\n===Burn Complete ===")
    return results;
}
//
exports.burnAsync = async function burnAsync(address, poolTokenAmount, isAnchor, fixtures, isDecimals) {

    destructure(fixtures)

    let tokenDecimals = !isDecimals ? expandTo18Decimals(poolTokenAmount) : poolTokenAmount;

    console.log("\n===Starting BurnAsync ===")

    if (isAnchor) {
        await poolTokenInstance1.transfer(pylonInstance.address, tokenDecimals)
    } else {
        await poolTokenInstance0.transfer(pylonInstance.address, tokenDecimals)
    }

    let results = await pylonInstance.burnAsync(address, isAnchor)
    console.log("\n===BurnAsync Complete ===")
    return results

}
//
exports.setPrice = async function setPrice(address, targetPrice, fixtures) {

    destructure(fixtures);

    let pairResT = await pair.getReserves();
    let resIn;
    let resOut;
    let targetPriceDecimals = expandTo18Decimals(targetPrice)

    let price = pairResT[1].mul(DECIMALS).div(pairResT[0]);

    console.log("price, targetPrice", format(price), format(targetPriceDecimals));

    let dump = targetPriceDecimals.lt(price);

    if(dump) {
        resIn = pairResT[0]
        resOut = pairResT[1]
        targetPriceDecimals = (DECIMALS.pow(2)).div(targetPriceDecimals)
        console.log("dump target: ", format(targetPriceDecimals))
    } else {
        resIn = pairResT[1]
        resOut = pairResT[0]
    }

    let x = sqrt((targetPriceDecimals.mul(resIn).div(DECIMALS)).mul(resOut)).sub(resIn)

    // let sqrt2 = sqrt(expandTo18Decimals(2).mul(expandTo18Decimals(2)));
    // console.log("Sqrt test ", format(sqrt2))
    //x = math.sqrt(adjusted_price * res_in * res_out) - res_in

    console.log("X", format(x))

    //TODO: Adjust by fee as well

    let out = getAmountOut(x, resIn, resOut);

    if(dump) {
        await token0.transfer(pair.address, x)
        await pair.swap(0, out, account.address, '0x', overrides)
    } else {
        await token1.transfer(pair.address, x)
        await pair.swap(out, 0, account.address, '0x', overrides)

    }
}
//
async function forwardTime(provider, blocksToMine) {

    let blocksBig = ethers.BigNumber.from(blocksToMine);

    await provider.send("hardhat_mine", [blocksBig.toHexString()]);

}
exports.forwardTime = forwardTime

exports.unblockOracle = async function unblockOracle(provider, fixtures) {

    await forwardTime(ethers.provider, 96);
    await forwardTime(ethers.provider, 96);
    await updateMint(fixtures);

    await forwardTime(ethers.provider, 96);
    await forwardTime(ethers.provider, 96);
    await forwardTime(ethers.provider, 96);
}
//

async function updateMint(fixtures) {
    destructure(fixtures)
    console.log("\n===Starting updateMint ===")
    await token0.transfer(pylonInstance.address, MINIMUM_LIQUIDITY)
    //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
    await pylonInstance.mintPoolTokens(account.address, false)
    console.log("\n=== updateMint complete ===")
}
exports.updateMint = updateMint



//

exports.printPoolTokens = async function printPoolTokens(address, fixtures, doPrint) {

    destructure(fixtures);

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


exports.printState = async function printState(fixtures, doPrint) {

    destructure(fixtures)

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

exports.printPairState = async function printPairState(fixtures, doPrint) {

    destructure(fixtures)

    let pairResT = await pair.getReserves();

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

async function initData(library) {

    return await coreFixtures(library)
}
