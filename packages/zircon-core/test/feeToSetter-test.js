// TODO: clean this...
const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals, getAmountOut} = require("./shared/utils");
const {coreFixtures} = require("./shared/fixtures");
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]
let factoryPylonInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair, feeToSetterInstance;

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
const overrides = {
    gasLimit: 9999999
}

async function addLiquidity(token0Amount, token1Amount) {
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)
    await pair.mint(account.address)
}


// TODO: See case where we have a big dump
describe("Pylon", () => {
    beforeEach(async () => {
        [account, account2] = await ethers.getSigners();
        deployerAddress = account.address;
        let fixtures = await coreFixtures(deployerAddress)
        factoryInstance = fixtures.factoryInstance
        token0 = fixtures.token0
        token1 = fixtures.token1
        poolTokenInstance0 = fixtures.poolTokenInstance0
        poolTokenInstance1 = fixtures.poolTokenInstance1
        pair = fixtures.pair
        pylonInstance = fixtures.pylonInstance
        factoryPylonInstance = fixtures.factoryPylonInstance
        feeToSetterInstance = fixtures.feeToSetterInstance

    });
    const init = async (token0Amount, token1Amount) => {
        // Let's initialize the Pool, inserting some liquidity in it
        await addLiquidity(token0Amount, token1Amount)
        // Let's transfer some tokens to the Pylon
        await token0.transfer(pylonInstance.address, token0Amount.div(11))
        await token1.transfer(pylonInstance.address, token1Amount.div(11))
        //Let's initialize the Pylon, this should call two sync
        await pylonInstance.initPylon(account.address)
    }
    it('should change fees from FeeToSetter', async function () {
        await feeToSetterInstance.setFees(2, 3, 4, 5)

        // Initializing
        await init(expandTo18Decimals(10), expandTo18Decimals(100))

        // VAB at the beginning is equal to the minted pool tokens
        let vab = await pylonInstance.virtualAnchorBalance();
        expect(vab).to.eq(ethers.BigNumber.from('9090909090909090909'))
        // Time to swap, let's generate some fees
        await token0.transfer(pair.address, expandTo18Decimals(1))
        await pair.swap(0, ethers.BigNumber.from('1662497915624478906'), account.address, '0x', overrides)
        // Minting tokens is going to trigger a change in the VAB & VFB so let's check
        const newAmount0 = ethers.BigNumber.from('5000000000000000')
        await token0.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, false)

        // So here we increase our vab and vfb
        let vab2 = await pylonInstance.virtualAnchorBalance();
        // expect(vfb).to.eq(ethers.BigNumber.from('902024227015522550'))
        expect(vab2).to.eq(ethers.BigNumber.from('9090909090909090910'))
        // Let's mint some LP Tokens
        // no fee changes so vab & vfb should remain the same
        await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(10))
        let vab3 = await pylonInstance.virtualAnchorBalance();
        // expect(vfb3).to.eq(ethers.BigNumber.from('902024227015522550'))
        expect(vab3).to.eq(ethers.BigNumber.from('9090909090909090910'))

        await token1.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, true)

        await token1.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, true)
    });
})
