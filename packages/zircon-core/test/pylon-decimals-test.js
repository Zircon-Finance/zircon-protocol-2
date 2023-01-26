const { expect } = require("chai");
const { ethers, hi } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals, expandToNDecimals, getAmountOut, format, sqrt, findDeviation, calculateOmega, getFtv} = require("./shared/utils");
const {coreFixtures, librarySetup} = require("./shared/fixtures");
const {initPylon, initData, addPylon, printState, printPoolTokens, printPairState, getPTPrice, burn, burnAsync, forwardTime, unblockOracle, mintAsync, mintSync, setPrice, updateMint} = require("./shared/commands");
const {generateJSONFile, casesSDK} = require("./shared/generate-json-sdk-test");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
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

describe("Pylon Decimals", () => {
    before(async () => {
        console.log("Setting up library");
        // library = await librarySetup()
        console.log("<><><<<<<<<<<<<<<<<<<<<<<< Length>", casesSDK.length)
        const lib = await loadFixture(librarySetup);
        library = lib
        console.log("lirary add", library.address)
        // library = await librarySetup()
    })

    beforeEach(async () => {
        fixtures = await initData(library)
    })

    // after(async () => {
    //     await generateJSONFile()
    // })

    const init = async (token0Amount, token1Amount, pylonPercentage, decimals0, decimals1) => {
        // Let's initialize the Pool, inserting some liquidity in it
        await addPylon(fixtures, decimals0, decimals1)

        fixtures = await initPylon(fixtures, token0Amount, token1Amount, pylonPercentage, 1)
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

    const muuTest = [
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 6, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 12, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 6],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 12],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 6, 12],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 12, 6],
    ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : n)))
    muuTest.forEach((mintCase, i) => {
        it.only('Change mu Test', async function () {
            const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor, decimals0, decimals1] = mintCase

            let fixtures = await init(token0Amount, token1Amount, 1, decimals0, decimals1)

            //Pylon initialized. Now we advance time by muSamplingPeriod

            let blockNumber = await ethers.provider.getBlockNumber()
            let blocksToMine = await factoryPylonInstance.muUpdatePeriod();
            await forwardTime(ethers.provider, blocksToMine.add(1))
            // await ethers.provider.send("hardhat_mine", [blocksToMine.add(1).toHexString()]);

            let newBlockNumber = await ethers.provider.getBlockNumber();

            console.log("newBN, oldBN diff:", newBlockNumber - blockNumber);

            await setPrice(account.address, 1.5, fixtures, 1);

            //Mint dust tokens to force sync
            //Should assign according to new gamma

            //Need to advance time again because of deltaGamma protection

            await forwardTime(ethers.provider, blocksToMine.div(10),1)

            console.log("mu before new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
            console.log("gamma before new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
            console.log("vab before new token: ", ethers.utils.formatEther(await pylonInstance.virtualAnchorBalance()));


            await updateMint(fixtures, 1)

            let initialGamma = await pylonInstance.gammaMulDecimals()

            let initialMu = await pylonInstance.muMulDecimals();


            console.log("mu after new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
            console.log("gamma after new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
            //Advance time again

            await forwardTime(ethers.provider, blocksToMine.add(1), 1)

            await setPrice(account.address, 2.5, fixtures, 1);

            await updateMint(fixtures, 1)

            let mu = await pylonInstance.muMulDecimals();
            let gamma = await pylonInstance.gammaMulDecimals();

            expect(initialMu).to.eq(initialGamma);
            expect(mu).not.to.eq(initialMu);

            let derivedMu = initialMu.add((gamma.sub(initialGamma)).mul(DECIMALS.div(2).sub(gamma)).div(DECIMALS).mul(3));

            let deviation = findDeviation(mu, derivedMu);
            //Gamma moved by 5% to 0.45, we expect mu to change by 5%* 5%*3 = 0.0075 (ish)
            expect(deviation).to.lt(IMPRECISION_TOLERANCE);


        });
    });


    const omegaTestCases = [
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 6, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 12, 18],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 6],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 18, 12],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 6, 12],
        [1700, 5300, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true, 12, 6],
    ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : n)))
    omegaTestCases.forEach((mintCase, i) => {
        it(`Omega test:${i}`, async function () {
            const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor, decimals0, decimals1] = mintCase
            let fixtures = await init(token0Amount, token1Amount, 99, decimals0, decimals1)

            // Pylon initialized.
            // We mint some Async first to make sure we send with correct proportions

            let initialPtBalance = await poolTokenInstance1.balanceOf(account.address)
            //Now we deposit a large amount of Anchors to test Omega
            //We do it with async 50/50 to make sure we avoid slippage distortions
            let pylonEarly = await printState(fixtures, true, 1);
            let pairEarly = await printPairState(fixtures, true, 1);

            let oldomega = calculateOmega(pylonEarly.gamma, pairEarly.tr1, pylonEarly.vab, pylonEarly.sync[1]);
            console.log("oldOmega", oldomega.toString());

            console.log("Ftv: ", format(pairEarly.tr1.mul(2).mul(pylonEarly.gamma).div(DECIMALS)))
            await mintAsync(account.address, token0Amount * 2, token1Amount * 2, true, fixtures, false, 1);
            await forwardTime(ethers.provider, 32, 1);

            await updateMint(fixtures, 1);


            let pylonState = await printState(fixtures, true, 1);
            let pairState = await printPairState(fixtures, true, 1);

            console.log("P2y (Ftv) after: ", format(pairState.tr1.mul(2).mul(pylonState.gamma).div(DECIMALS)))

            let omega = calculateOmega(pylonState.gamma, pairState.tr1, pylonState.vab, pylonState.sync[1]);

            expect(omega).to.lt(DECIMALS);

            console.log("Post mint Omega: ", format(omega));

            await forwardTime(ethers.provider, 50);
            await updateMint(fixtures, 1);



            // We now do a few massive swaps to get some fees in (and energy funds) + small syncMint to make it stick.

            await setPrice(account.address, 0.5, fixtures, 1);
            await setPrice(account.address, 5, fixtures, 1);
            await setPrice(account.address, 0.5, fixtures, 1);
            await setPrice(account.address, 3.1, fixtures, 1);
            await setPrice(account.address, 3.3, fixtures, 1);

            await updateMint(fixtures, 1);
            pylonState = await printState(fixtures, true, 1);
            pairState = await printPairState(fixtures, true, 1);
            //
            //
            // //Avoid oracle stuff
            // await unblockOracle(ethers.provider, fixtures);
            //
            //
            // let balancePreBurn = await token1.balanceOf(account.address)
            //
            // let aptBalance = await poolTokenInstance1.balanceOf(account.address)
            // aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
            //
            // console.log("Anchor PT for burning:", ethers.utils.formatEther(aptBalance.div(100)));
            //
            // let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
            // let pairTokenBalanceOld = await pair.balanceOf(energyAddress);
            //
            // omega = calculateOmega(pylonState.gamma, pairState.tr1, pylonState.vab, pylonState.sync[1]);
            //
            // expect(omega).to.gt(DECIMALS);
            //
            // console.log("Omega Pre-burn:", format(omega));
            //
            // await burnAsync(account.address, aptBalance.div(100), true, fixtures, true);
            //
            // let pairTokenBalanceNew = await pair.balanceOf(energyAddress);
            //
            // let balancePostBurn = await token1.balanceOf(account.address);
            //
            // let moneyReceived = balancePostBurn.sub(balancePreBurn);
            //
            // //We get a reference amount with no omega
            //
            // // expect(balancePostBurn.sub(balancePreBurn)).to.lt(aptBalance.div(200));
            // //Be that as it may it shouldn't do any compensation
            // expect(pairTokenBalanceNew).to.eq(pairTokenBalanceOld);
            //
            //
            //
            // //Now we dump the price to trigger slashing (2% or so)
            // //We want to withdraw a smallish amount with burnAsync
            // //The user should receive what he inputted minus fees etc
            //
            // await setPrice(account.address, 3, fixtures);
            //
            // await unblockOracle(ethers.provider, fixtures);
            // balancePreBurn = await token1.balanceOf(account.address)
            // await burnAsync(account.address, aptBalance.div(100), true, fixtures, true);
            //
            //
            // balancePostBurn = await token1.balanceOf(account.address);
            //
            // pairTokenBalanceNew = await pair.balanceOf(energyAddress);
            //
            // expect(pairTokenBalanceNew).to.not.eq(expandTo18Decimals(0))
            //
            // console.log("PTB old, PTB new", format(pairTokenBalanceOld), format(pairTokenBalanceNew));
            // let pairData = await printPairState(fixtures, true);
            //
            // let valOfPtb = pairTokenBalanceOld.sub(pairTokenBalanceNew).mul(pairData.pairResT[1].mul(2)).div(pairData.ptt);
            //
            // console.log("val of PTB", format(valOfPtb));
            //
            //
            // //Here the omega compensation should be distributed equally so the equation should hold.
            // let deviation = findDeviation(balancePostBurn.sub(balancePreBurn), moneyReceived);
            // //Can up the tolerance since we've had some fees added between trades
            // //At original values the imprecision is 0.001%, explainable by the fee
            // expect(deviation).to.lt(IMPRECISION_TOLERANCE.mul(1000000000));//Tolerance to up to 1bps of deviation
            //
            // //Now we dump a bit more, just enough to finish all pool tokens but not enough to tap all anchors
            //
            // await setPrice(account.address, 2.5, fixtures);
            //
            // await unblockOracle(ethers.provider, fixtures);
            // balancePreBurn = await token1.balanceOf(account.address)
            //
            // let anchorBalanceOld = await token1.balanceOf(energyAddress);
            // let floatBalancePreBurn = await token0.balanceOf(account.address);
            //
            // await burnAsync(account.address, aptBalance.div(100), true, fixtures, true);
            //
            // balancePostBurn = await token1.balanceOf(account.address);
            // let floatBalancePostBurn = await token0.balanceOf(account.address);
            // pairTokenBalanceNew = await pair.balanceOf(energyAddress);
            //
            // expect(pairTokenBalanceNew).to.eq(expandTo18Decimals(0))
            //
            // let anchorBalance = await token1.balanceOf(energyAddress);
            //
            // console.log("anchorBalance old, new", format(anchorBalanceOld), format(anchorBalance));
            // expect(anchorBalance).to.not.eq(expandTo18Decimals(0))
            // expect(anchorBalance).to.not.eq(anchorBalanceOld)
            //
            // //Here the relationship breaks because we are adding compensation for the total only in anchors
            // //So we adjust by including the other half of the money
            //
            // pairData = await printPairState(fixtures, true);
            //
            // let totalReceived = balancePostBurn.sub(balancePreBurn)
            // totalReceived = totalReceived.add(floatBalancePostBurn.sub(floatBalancePreBurn).mul(pairData.pairResT[1]).div(pairData.pairResT[0]));
            //
            // deviation = findDeviation(totalReceived, moneyReceived.mul(2));
            // expect(deviation).to.lt(IMPRECISION_TOLERANCE.mul(1000000000));
        });
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
    oracleTestCases.forEach((mintCase, i) => {
        it(`Oracle test:${i}` , async function () {
            const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor, decimals0, decimals1] = mintCase

            let fixtures = await init(token0Amount, token1Amount, 99, decimals0, decimals1)

            // We test for the most important thing the oracle exists for: so that we can't extract liquidity by flashloaning
            let poolToken = isAnchor ? poolTokenInstance1 : poolTokenInstance0
            let balance = await poolToken.balanceOf(account2.address);
            await mintSync(account2.address, (isAnchor ? token1Amount : token0Amount) / 100, isAnchor, fixtures, false, 1);
            balance = (await poolToken.balanceOf(account2.address)).sub(balance)
            console.log("floatBalance", format(balance));
            await setPrice(account.address, 3.8, fixtures, 1);
            // await unblockOracle(ethers.provider, fixtures); //uncommenting this makes the test fail

            let anchorBalance = await token1.balanceOf(account2.address)
            await burnAsync(account2.address, balance, isAnchor, fixtures, true, 1)
            anchorBalance = (await token1.balanceOf(account2.address)).sub(anchorBalance);
            // await setPrice(account.address, 3.1, fixtures);

            //We expect that this cycle hasn't netted anything in anchor terms. A 3% price increase is balanced by a 3% fee.
            expect(anchorBalance).to.lt(expandTo18Decimals(token1Amount / 200));

        });

    })

    // Let's try to calculate some cases for pylon
    const mintTestCases = [
        [10, 20, '4762211', '4749990617651023','5049999','9999999999000', false, 6, 12],
        [20, 10, '4749211', '4762499999999999','9999999999000', '5099000', true, 12, 6],
        [10, 20, '2374911', '9525000000000000','5000000', '100499949999999999999000', true, 6, 22],
        [20, 20, '9525011', '4749995308820878','10099989951286944600', '9999999999000', false, 18, 12],
        [2000, 2000, '4750011', '952500000000000000','1000000000', '1009998000', true, 6, 6],
        [10, 20, '4762509926821186', '4749990617651023','5049994975643473402','9999999999999999000', false, 18, 18],
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

            await printState(fixtures, true, 1)
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



})
