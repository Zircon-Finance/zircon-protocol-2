const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals, getAmountOut} = require("./shared/utils");
const {coreFixtures} = require("./shared/fixtures");
const { initPylonsFromProdSnapshot, getPylonIndexBy, getFixturesForPylon, mintSync, burn} = require("./shared/commands");
const { librarySetup} = require("./shared/fixtures");

let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair, factoryPTInstance, library, fixtures;

const overrides = {
    gasLimit: 9999999
}


describe("Pylon", () => {
    before(async () => {
        library = await librarySetup()
        fixtures = await initPylonsFromProdSnapshot(library);
    })

    //Let's try to calculate some cases for pylon
    it(`Prod Testing ZRG/ETH Bug FTT`, async () => {
        let index = getPylonIndexBy("ZRG", "ETH")
        fixtures = getFixturesForPylon(fixtures, index)

        let account = fixtures.account
        let pylon = fixtures.pylonInstance

        console.log("Getting Some Tokens")
        await fixtures.token0.mint(account.address, expandTo18Decimals(10))
        await fixtures.token1.mint(account.address, expandTo18Decimals(10))

        console.log("Minting on ZRG ETH Pool")
        // Minting a bit of ETH Stable PT
        await mintSync(account.address, "1", true, fixtures, false, index)

        // Getting the PT Instances
        console.log("Minting a bit of ETH Stable PT")
        let stablePTBalance = await fixtures.poolTokenInstance1.balanceOf(account.address)
        console.log("stable transfer", stablePTBalance.toString());

        // Burning (should fire FTT hopefully)
        await burn(account.address, stablePTBalance, true, fixtures, true, index);
        console.log("Burned the PT")
    })
})
