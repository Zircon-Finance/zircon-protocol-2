const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const BN = require("bignumber.js");

const {expandTo18Decimals, getAmountOut} = require("./shared/utils");
const {coreFixtures} = require("./shared/fixtures");
const {initPylonsFromProdSnapshot, getPylonIndexBy, getFixturesForPylon, mintSync, burn, forwardTime, getPylons, migrate} = require("./shared/commands");
const {librarySetup} = require("./shared/fixtures");
const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const fs = require('fs')

let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair, factoryPTInstance, library, fixtures;

const overrides = {
    gasLimit: 9999999
}
let prices = []


describe("Prod to test Pylons", () => {
    before(async () => {
        library = await loadFixture(librarySetup);

        // library = await librarySetup()
        fixtures = await initPylonsFromProdSnapshot(library);
    })

    async function comparePrices(fixtures, {ptfPrice, ptsPrice, vfb, vab, gamma, ptfTS, ptsTS}) {

        console.log("Comparing Prices")
        let pylon = fixtures.pylonInstance
        let pair = fixtures.pair
        let tk0Symbol = await fixtures.token0.symbol()
        let tk1Symbol = await fixtures.token1.symbol()
        let sy0 = await pair.token0()
        let sy1 = await pair.token1()
        console.log("PAIR ", tk0Symbol, tk1Symbol)

        let gamma2 = await pylon.gammaMulDecimals()
        let vab2 = await pylon.virtualAnchorBalance()
        let pylonReserve0 = (await pylon.getSyncReserves())[0]
        let pylonReserve1 = (await pylon.getSyncReserves())[1]
        let pairReserve0 =  (await pair.getReserves())[fixtures.isFloatRes0 ? 0 : 1]
        let pairReserve1 =  (await pair.getReserves())[fixtures.isFloatRes0 ? 1 : 0]
        let ptb = await pair.balanceOf(pylon.address)
        let pairTS = await pair.totalSupply()
        if (pairTS.eq(BigNumber.from("0"))) return

        let pairResTR0 = pairReserve0.mul(ptb).div(pairTS)
        let base = BigNumber.from(BN.BigNumber("1e18").toString(10))
        let vfb2 = gamma2.mul(pairResTR0).mul(BigNumber.from("2")).div(base)
        vfb2 = vfb2.add(pylonReserve0)

        console.log("vfb change old/new", new BN.BigNumber(BigNumber.from(vfb).toString()).dividedBy(new BN.BigNumber(vfb2.toString())).toString())
        console.log("gamma change old/new", new BN.BigNumber(BigNumber.from(gamma).toString()).dividedBy(new BN.BigNumber(gamma2.toString())).toString())

        let pt0 = fixtures.poolTokenInstance0
        let pt1 = fixtures.poolTokenInstance1

        let pt0TS = await pt0.totalSupply()
        let pt1TS = await pt1.totalSupply()

        console.log("f", pt0TS.toString(), BigNumber.from(ptfTS).toString())
        console.log("s", pt1TS.toString(), BigNumber.from(ptsTS).toString())

        let dec0 = await fixtures.token0.decimals()
        let dec1 = await fixtures.token1.decimals()

        let pt0Price = new BN.BigNumber(base.mul(vfb2).div(pt0TS).toString()).dividedBy(new BN.BigNumber("1e" + dec0.toString()))
        let pt1Price = new BN.BigNumber(base.mul(vab2).div(pt1TS).toString()).dividedBy(new BN.BigNumber("1e" + dec1.toString()))

        console.log("pt0Price Change old/new", new BN.BigNumber(ptfPrice.toString()).dividedBy(pt0Price).toString())
        console.log("pt1Price Change old/new", new BN.BigNumber(ptsPrice.toString()).dividedBy(pt1Price).toString())

        prices.push({
            tk0Symbol: tk0Symbol,
            tk1Symbol: tk1Symbol,
            vfbChange: new BN.BigNumber(BigNumber.from(vfb).toString()).dividedBy(new BN.BigNumber(vfb2.toString())).toString(),
            gammaChange: new BN.BigNumber(BigNumber.from(gamma).toString()).dividedBy(new BN.BigNumber(gamma2.toString())).toString(),
            price0Change: new BN.BigNumber(ptfPrice.toString()).dividedBy(pt0Price).toString(),
            price1Change: new BN.BigNumber(ptsPrice.toString()).dividedBy(pt1Price).toString()
        })
    }

    it("Compare Prices", async () => {
        // let index = getPylonIndexBy("ZRG", "xcKSM")
        console.log("Getting Some Tokens")


        let pylons = getPylons()
        for(let index = 1; index < pylons.length; index++) {
            let pylon = pylons[index];
            fixtures = await getFixturesForPylon(fixtures, index)
            let account = fixtures.account
            await fixtures.token0.mint(account.address, expandTo18Decimals(10))
            await fixtures.token1.mint(account.address, expandTo18Decimals(10))

            await mintSync(account.address, "1", false, fixtures, false, index)

            await comparePrices(fixtures, pylon)

            // await mintSync(account.address, "1", true, fixtures, false, index)

        }
        let data = JSON.stringify(prices, null, 2);
        fs.writeFileSync('./test/shared/json/prices.json', data);

        // console.log("prices", prices.toString())
    })

    //Let's try to calculate some cases for pylon
    it.only(`Prod Testing ZRG/WMOVR`, async () => {
        console.log("\n\n\n<><><><><> STARTING TEST <><><><><><><><>\n")
        let index = getPylonIndexBy("ZRG", "WMOVR")
        fixtures = await getFixturesForPylon(fixtures, index)

        let account = fixtures.account
        let pylon = fixtures.pylonInstance

        console.log("Getting Some Tokens")
        await fixtures.token0.mint(account.address, expandTo18Decimals(10))
        await fixtures.token1.mint(account.address, expandTo18Decimals(10))

        console.log("Minting on ZRG ETH Pool")
        // 17.38
        // Minting a bit of ETH Stable PT
        await mintSync(account.address, "1", false, fixtures, false, index)
        await migrate(fixtures, library, index)
        console.log("migration completed")

        // Getting the PT Instances
        console.log("Minting a bit of ETH Stable PT")
        let stablePTBalance = await fixtures.poolTokenInstance0.balanceOf(account.address)
        console.log("Stable Transfer", stablePTBalance.toString());
        await forwardTime(ethers.provider, 50, index);

        // Burning (should fire FTT hopefully)
        await burn(account.address, stablePTBalance, false, fixtures, true, index);
        console.log("Burned the PT")
    })
})
