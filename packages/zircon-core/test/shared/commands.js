const {ethers} = require("hardhat");
const {coreFixtures, librarySetup} = require("./fixtures");
const {expandTo18Decimals, getAmountOut} = require("./utils");
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]


let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair, library;

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
const overrides = {
    gasLimit: 9999999
}

exports.initPylon = async function initPylon(token0Amount, token1Amount, pylonPercentage, library) {

    await initData(library);

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
    // Let's start the pylon

}

// exports.mintSync()
//
// exports.mintAsync()
//
// exports.burn()
//
// exports.burnAsync()
//
// exports.setPrice()
//
// exports.forwardTime()
//
// exports.updateMint()
//
// exports.printState()


async function initData(library) {

    [account, account2] = await ethers.getSigners();
    deployerAddress = account.address;
    let fixtures = await coreFixtures(deployerAddress, library)
    factoryInstance = fixtures.factoryInstance
    token0 = fixtures.token0
    token1 = fixtures.token1
    poolTokenInstance0 = fixtures.poolTokenInstance0
    poolTokenInstance1 = fixtures.poolTokenInstance1
    pair = fixtures.pair
    pylonInstance = fixtures.pylonInstance
    factoryPylonInstance = fixtures.factoryPylonInstance
    factoryEnergyInstance = fixtures.factoryEnergyInstance
}
