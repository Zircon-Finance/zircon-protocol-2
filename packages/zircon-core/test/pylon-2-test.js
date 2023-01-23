const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals, expandToNDecimals, getAmountOut, format, sqrt, findDeviation, calculateOmega, getFtv} = require("./shared/utils");
const {coreFixtures, librarySetup} = require("./shared/fixtures");
const {initPylon, initData, addPylon, printState, printPoolTokens, printPairState, getPTPrice, burn, burnAsync, forwardTime, unblockOracle, mintAsync, mintSync, setPrice, updateMint} = require("./shared/commands");
const {generateJSONFile} = require("./shared/generate-json-sdk-test");
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]

let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair, library, fixtures;

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
const DECIMALS = ethers.BigNumber.from(10).pow(18)
const IMPRECISION_TOLERANCE = ethers.BigNumber.from(10).pow(6) //We expect tests to be precise to at least 1 billionth, should be enough.
const overrides = {
    gasLimit: 9999999
}

async function addLiquidity(token0Amount, token1Amount) {
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)
    await pair.mint(account.address)
}

describe("Pylon", () => {
    before(async () => {
        console.log("Setting up library");
        library = await librarySetup()
    })

    beforeEach(async () => {
        fixtures = await initData(library)
    })

    after(async () => {
        await generateJSONFile()
    })

    const init = async (token0Amount, token1Amount, pylonPercentage, decimals0, decimals1) => {
        // Let's initialize the Pool, inserting some liquidity in it
        await addPylon(fixtures, decimals0, decimals1)
        fixtures = await initPylon(fixtures, expandToNDecimals(token0Amount, decimals0), expandToNDecimals(token1Amount, decimals1), pylonPercentage, 1, 1)
        factoryInstance = fixtures.factoryInstance
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
        return fixtures
    }

    // Let's try to calculate some cases for pylon
    const mintTestCases = [
        [10, 20, '4762211', '4749990617651023','5050992','9999999999999999000', false, 6, 12],
        [20, 10, '4749211', '4762499999999999','9999999999999999998', '5099989999999999000', true, 12, 6],
        [10, 20, '2374911', '9525000000000000','4999999999999999999', '10049994999999999000', true, 6, 22],
        [20, 20, '9525011', '4749995308820878','10099989951286946806', '9999999999999999000', false, 18, 12],
        [2000, 2000, '4750011', '952500000000000000','1000000000000000000000', '1009998999999999999000', true, 6, 6],
        [10, 20, '4762509926821186', '4749990617651023','5099989902573941080','9999999999999999000', false, 18, 18],
        [20, 10, '4749999999999999', '4762499999999999','9999999999999999998', '5099989999999999000', true, 18, 18],
        [10, 20, '2374999999999999', '9525000000000000','4999999999999999999', '10049994999999999000', true, 18, 18],
        [20, 20, '9525009926820697', '4749995308820878','10099989951286946806', '9999999999999999000', false, 18, 18],
        [2000, 2000, '475000000000000000', '952500000000000000','1000000000000000000000', '1009998999999999999000', true, 18, 18],
    ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : n)))
    mintTestCases.forEach((mintCase, i) => {
        it(`mintPylon:${i}`, async () => {
            const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor, decimals0, decimals1] = mintCase
            // Add some liquidity to the Pair...
            let fixtures = await init(token0Amount, token1Amount, 50, decimals0, decimals1)

            await printState(fixtures, true)
            // Transferring some liquidity to pylon

            await mintSync(account.address, expandToNDecimals(token0Amount/200, isAnchor ? decimals1: decimals0), isAnchor, fixtures, true, 1)

            await forwardTime(ethers.provider, 50);
            await updateMint(fixtures, 1);

            await printState(fixtures, true, 1)
            await printPairState(fixtures, true, 1);

            let poolTokens = await printPoolTokens(account.address, fixtures, true, 1);

            expect(poolTokens.pt1).to.eq(expectedOutputAmount1);
            expect(poolTokens.pt0).to.eq(expectedOutputAmount0);
            // Anchor
        })
    })

    const burnTestCases = [
        [20, 10, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 18],
        [20, 10, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 6, 18],
        [20, 10, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 12, 18],
        [20, 10, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 6],
        [20, 10, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 12],
        [20, 10, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 6, 12],
        [20, 10, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 12, 6],
    ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : n)))

    burnTestCases.forEach((mintCase, i) => {
        it(`Mint Burn Cycle test:${i}`, async () => {
            const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor, decimals0, decimals1] = mintCase
            // Add some liquidity to the Pair...
            let fixtures =  await init(token0Amount, token1Amount, 50, decimals0, decimals1)

            let poolTokens = await printPoolTokens(account.address, fixtures, true, 1);
            let initialPtBalance = poolTokens.pt1;

            if (isAnchor) {
                let t = expandToNDecimals(token0Amount/200, decimals1)
                await mintSync(account.address, t, isAnchor, fixtures, true, 1);
            }else{
                let t = expandToNDecimals(token1Amount/200, decimals0)
                await mintSync(account.address, t, isAnchor, fixtures, true, 1);
            }

            //Force update

            await forwardTime(ethers.provider, 50);
            await updateMint(fixtures, 1);


            //Now we burn Anchor balance and see how much we get back.

            await forwardTime(ethers.provider, 50);

            let balancePreBurn = await token1.balanceOf(account.address)

            let aptBalance = await poolTokenInstance1.balanceOf(account.address)
            // console.log("apt total, apt initial: ", format(aptBalance), format(initialPtBalance));

            aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
            // console.log("Apt Sent: ", format(aptBalance));

            await burn(account.address, aptBalance, isAnchor, fixtures, true, 1);

            let balancePostBurn = await token1.balanceOf(account.address);

            expect(balancePostBurn.sub(balancePreBurn)).to.eq(ethers.BigNumber.from("99980001000000000"))

            await printState(fixtures, true, 1)

            // expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(expectedOutputAmount1);
            // expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(expectedOutputAmount0);
            // Anchor
        })
    })

    const oracleTestCases = [
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 6, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 12, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 6],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 12],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 6, 12],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 12, 6],
    ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : n)))
    burnTestCases.forEach((mintCase, i) => {
        it('Oracle test', async function () {
            const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor, decimals0, decimals1] = mintCase

            let fixtures = await init(token0Amount, token1Amount, 99, decimal0, decimals1)

            // We test for the most important thing the oracle exists for: so that we can't extract liquidity by flashloaning

            let floatBalance = await poolTokenInstance0.balanceOf(account2.address);
            await mintSync(account2.address, expandToNDecimals(token0Amount / 100, decimals0), false, fixtures, false);
            floatBalance = (await poolTokenInstance0.balanceOf(account2.address)).sub(floatBalance)
            console.log("floatBalance", format(floatBalance));
            await setPrice(account.address, 3.2, fixtures);
            // await unblockOracle(ethers.provider, fixtures); //uncommenting this makes the test fail

            let anchorBalance = await token1.balanceOf(account2.address)
            await burnAsync(account2.address, floatBalance, false, fixtures, true)
            anchorBalance = (await token1.balanceOf(account2.address)).sub(anchorBalance);
            // await setPrice(account.address, 3.1, fixtures);

            //We expect that this cycle hasn't netted anything in anchor terms. A 3% price increase is balanced by a 3% fee.
            expect(anchorBalance).to.lt(expandTo18Decimals(token1Amount / 200));

        });

    })

})
