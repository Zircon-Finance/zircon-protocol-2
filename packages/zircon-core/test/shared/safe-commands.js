const {ethers} = require("hardhat");
const { expect } = require("chai");
const {coreFixtures, librarySetup} = require("./fixtures");
const {expandTo18Decimals, getAmountOut, sqrt, format, getFtv, findDeviation} = require("./utils");
const {saveValuesForSDK} = require("./generate-json-sdk-test");
const {getPTPrice, mintSync, mintAsync, burnAsync, burn, updateMint, printState, printPoolTokens, printPairState} = require("./commands");
const seedrandom = require("seedrandom");
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]

const rng = seedrandom('porcodio');


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

//at most 0.1% deviation for most tests
const GENERAL_TOLERANCE = ethers.BigNumber.from(10).pow(15)

async function safeMintSync(address, tokenAmount, isAnchor, fixtures, isDecimals) {

    destructure(fixtures)
    //A float sync mint can be quite random but you should never be able to obtain more value than you supplied
    //An anchor sync mint should never change the pool token price of floats

    let ptPriceBefore = await getPTPrice(fixtures, false);

    let tokenDecimals = !isDecimals ? expandTo18Decimals(tokenAmount) : tokenAmount;

    let ptBalanceBefore = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)
    let results = await mintSync(address, tokenAmount, isAnchor, fixtures, isDecimals);
    await updateMint(fixtures);
    let ptBalanceAfter = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)

    if (isAnchor) {
        let deviation = findDeviation(await getPTPrice(fixtures, false), ptPriceBefore);
        expect(deviation).to.lt(GENERAL_TOLERANCE);
    } else {
        let floatPtReceived = ptBalanceAfter.sub(ptBalanceBefore);
        let price = await getPTPrice(fixtures, false);
        let floatValue = floatPtReceived.mul(price).div(DECIMALS);
        expect(floatValue).to.lt(tokenDecimals);
        let deviation = findDeviation(floatValue, tokenDecimals);
        expect(deviation).to.lt(GENERAL_TOLERANCE.mul(100));
    }

}


exports.safeMintSync = safeMintSync;

async function safeMintAsync(address, token0Amount, token1Amount, isAnchor, fixtures, isDecimals) {

    destructure(fixtures)
    //A float async mint should always grant about amIn - fees.
    //An anchor sync mint should never change the pool token price of floats

    let token0Decimals = !isDecimals ? expandTo18Decimals(token0Amount) : token0Amount;

    let ptPriceBefore = await getPTPrice(fixtures, false);

    let ptBalanceBefore = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)
    let results = await mintAsync(address, token0Amount, token1Amount, isAnchor, fixtures, isDecimals);
    await updateMint(fixtures);
    let ptBalanceAfter = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)

    if (isAnchor) {
        let deviation = findDeviation(await getPTPrice(fixtures, false), ptPriceBefore);
        expect(deviation).to.lt(GENERAL_TOLERANCE);
    } else {
        let floatPtReceived = ptBalanceAfter.sub(ptBalanceBefore);
        let price = await getPTPrice(fixtures, false);
        let floatValue = floatPtReceived.mul(price).div(DECIMALS);
        expect(floatValue).to.lt(token0Decimals.mul(2));
        // let deviation = findDeviation(floatValue, token0Decimals.mul(2));
        // expect(deviation).to.lt(GENERAL_TOLERANCE.mul(5));
    }

}

exports.safeMintAsync = safeMintAsync;

async function safeBurn(address, tokenAmount, isAnchor, fixtures, isDecimals) {

    destructure(fixtures)
    //A float burn should always grant less than price of PTs and "reasonably" close to it.
    //An anchor burn can give a very wide range of values, but crucially never above "price of PT" value

    let tokenDecimals = !isDecimals ? expandTo18Decimals(tokenAmount) : tokenAmount;

    let ptPriceBefore = await getPTPrice(fixtures, false);
    let balanceBefore = await isAnchor ? await token1.balanceOf(address) : await token0.balanceOf(address)

    let pylonData = await printState(fixtures, false);
    let poolTokens = await printPoolTokens(address, fixtures, false);

    let priceOfAnchor = pylonData.vab.mul(DECIMALS).div(poolTokens.ptTotal1);

    let ptBalanceBefore = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)
    let results = await burn(address, tokenAmount, isAnchor, fixtures, isDecimals);
    await updateMint(fixtures);
    let ptBalanceAfter = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)

    let balanceAfter = await isAnchor ? await token1.balanceOf(address) : await token0.balanceOf(address)
    if (isAnchor) {
        expect(balanceAfter.sub(balanceBefore)).to.lt(priceOfAnchor.mul(tokenDecimals).div(DECIMALS));
    } else {
        let floatReceived = balanceAfter.sub(balanceBefore);
        let floatValue = tokenDecimals.mul(ptPriceBefore).div(DECIMALS);
        expect(floatReceived).to.lt(floatValue);
        let deviation = findDeviation(floatReceived, floatValue);
        expect(deviation).to.lt(GENERAL_TOLERANCE.mul(50));
    }

}

exports.safeBurn = safeBurn;

async function safeBurnAsync(address, tokenAmount, isAnchor, fixtures, isDecimals) {

    destructure(fixtures)
    //A float burn should always grant less than price of PTs and "reasonably" close to it.
    //An anchor burn can give a very wide range of values, but crucially never above "price of PT" value

    let tokenDecimals = !isDecimals ? expandTo18Decimals(tokenAmount) : tokenAmount;

    let ptPriceBefore = await getPTPrice(fixtures, false);
    let balanceBefore = await isAnchor ? await token1.balanceOf(address) : await token0.balanceOf(address)

    let pylonData = await printState(fixtures, false);
    let poolTokens = await printPoolTokens(address, fixtures, false);

    let priceOfAnchor = pylonData.vab.mul(DECIMALS).div(poolTokens.ptTotal1);

    let ptBalanceBefore = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)
    let floatOut = await token0.balanceOf(account.address);
    let results = await burnAsync(address, tokenAmount, isAnchor, fixtures, isDecimals);
    await updateMint(fixtures);
    let ptBalanceAfter = isAnchor ? await poolTokenInstance1.balanceOf(address) : await poolTokenInstance0.balanceOf(address)

    let balanceAfter = await isAnchor ? await token1.balanceOf(address) : await token0.balanceOf(address)
    floatOut = (await token0.balanceOf(account.address)).sub(floatOut);
    if (isAnchor) {

        let pairData = await printPairState(fixtures, false);
        floatOut = floatOut.mul(pairData.tr1).div(pairData.tr0);
        expect(balanceAfter.sub(balanceBefore).add(floatOut)).to.lt(priceOfAnchor.mul(tokenDecimals).div(DECIMALS));
    } else {
        let floatReceived = balanceAfter.sub(balanceBefore);
        let floatValue = tokenDecimals.mul(ptPriceBefore).div(DECIMALS);
        expect(floatReceived.mul(2)).to.lt(floatValue);
        // let deviation = findDeviation(floatReceived.mul(2), floatValue);
        // expect(deviation).to.lt(GENERAL_TOLERANCE.mul(5));
    }

}

exports.safeBurnAsync = safeBurnAsync;

async function executeRandomInstruction(maxBound, fixtures) {

    destructure(fixtures)
    let instructionType = Math.floor((rng() - 0.01)/0.25); //ensure it's never 1.0
    let amount = rng() * maxBound;
    let isAnchor = rng() > 0.5;

    console.log("instructionType", instructionType);
    console.log("amount", amount);
    console.log("isAnchor", isAnchor);

    switch(instructionType) {
        case 0: {await safeMintSync(account.address, amount, isAnchor, fixtures, false); break;}
        case 1: {
            let pair = await printPairState(fixtures, false);
            let amount0 = expandTo18Decimals(amount/2);
            let amount1 = amount0.mul(isAnchor ? pair.tr0 : pair.tr1).div(isAnchor ? pair.tr1 : pair.tr0);
            await safeMintAsync(account.address, isAnchor ? amount1 : amount0, isAnchor ? amount0 : amount1, isAnchor, fixtures, true)
            break;
        }
        case 2: {await safeBurn(account.address, amount, isAnchor, fixtures, false); break;}
        case 3: {await safeBurnAsync(account.address, amount, isAnchor, fixtures, false); break;}
    }


}

exports.executeRandomInstruction = executeRandomInstruction;