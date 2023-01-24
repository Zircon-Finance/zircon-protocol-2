const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals, getAmountOut, format, sqrt, findDeviation, calculateOmega, getFtv} = require("./shared/utils");
const {coreFixtures, librarySetup} = require("./shared/fixtures");
const {initPylon,initData, printState, printPoolTokens, printPairState, getPTPrice, burn, burnAsync, forwardTime, unblockOracle, mintAsync, mintSync, setPrice, updateMint,
} = require("./shared/commands");
const {safeBurnAsync, safeBurn, safeMintSync, executeRandomInstruction, safeMintAsync} = require("./shared/safe-commands");
const {generateJSONFile} = require("./shared/generate-json-sdk-test");
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]

let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair, library;

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

    const init = async (token0Amount, token1Amount, pylonPercentage) => {
        // Let's initialize the Pool, inserting some liquidity in it
        fixtures = await initPylon(fixtures, token0Amount, token1Amount, pylonPercentage)
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

    //Let's try to calculate some cases for pylon
    const mintTestCases = [
        [10, 20, '4762509926821186', '4749990617651023','5099989902573941080','9999999999999999000', false],
        [20, 10, '4749999999999999', '4762499999999999','9999999999999999998', '5099989999999999000', true],
        [10, 20, '2374999999999999', '9525000000000000','4999999999999999999', '10049994999999999000', true],
        [20, 20, '9525009926820697', '4749995308820878','10099989951286946806', '9999999999999999000', false],
        [2000, 2000, '475000000000000000', '952500000000000000','1000000000000000000000', '1009998999999999999000', true],
    ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : n)))
    mintTestCases.forEach((mintCase, i) => {
        it(`mintPylon:${i}`, async () => {
            const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor] = mintCase
            // Add some liquidity to the Pair...
            let fixtures = await init(token0Amount, token1Amount, 50);

            await printState(fixtures, true)
            // Transferring some liquidity to pylon

            if (isAnchor) {
                await mintSync(account.address, token0Amount/200, isAnchor, fixtures, false)
            }else{
                await mintSync(account.address, token1Amount/200, isAnchor, fixtures, false)
            }

            await forwardTime(ethers.provider, 50);
            await updateMint(fixtures);

            await printState(fixtures, true)
            await printPairState(fixtures, true);

            let poolTokens = await printPoolTokens(account.address, fixtures, true);

            expect(poolTokens.pt1).to.eq(expectedOutputAmount1);
            expect(poolTokens.pt0).to.eq(expectedOutputAmount0);
            // Anchor
        })
    })  // Let's try to calculate some cases for pylon


//     it('Mint Burn Cycle test', async function () {
//
//         const mintCase = [
//             [20, 10, '474999999999999999', '337490000000000000','99999999999999000', '149366473384710075', true],]
//
//         const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor] = mintCase[0]
//         // Add some liquidity to the Pair...
//         let fixtures = await init(token0Amount, token1Amount, 50)
//
//         let poolTokens = await printPoolTokens(account.address, fixtures, true);
//         let initialPtBalance = poolTokens.pt1;
//
//         if (isAnchor) {
//             let t = token0Amount/200;
//             await mintSync(account.address, t, isAnchor, fixtures, false);
//         }else{
//             let t = token1Amount/200
//             await mintSync(account.address, t, isAnchor, fixtures, false);
//         }
//
//         //Force update
//
//         await forwardTime(ethers.provider, 50);
//         await updateMint(fixtures);
//
//
//         //Now we burn Anchor balance and see how much we get back.
//
//         await forwardTime(ethers.provider, 50);
//
//         let balancePreBurn = await token1.balanceOf(account.address)
//
//         let aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         // console.log("apt total, apt initial: ", format(aptBalance), format(initialPtBalance));
//
//         aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//         // console.log("Apt Sent: ", format(aptBalance));
//
//         await burn(account.address, aptBalance, isAnchor, fixtures, true)
//
//         let balancePostBurn = await token1.balanceOf(account.address);
//
//         expect(balancePostBurn.sub(balancePreBurn)).to.eq(ethers.BigNumber.from("99980001000000000"))
//
//         await printState(fixtures, true)
//
//         // expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(expectedOutputAmount1);
//         // expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(expectedOutputAmount0);
//
//     });
//
//
//
//
    it('Fee assignment + mu Test', async function () {
        let token0Amount = 1700
        let token1Amount = 5300
        let fixtures = await init(token0Amount, token1Amount, 1)

        //await expect(gamma).to.eq(ethers.BigNumber.from("277500000000000000")) // 473684210526315789

        //We swap a token and then reverse it to create fees while having the same gamma

        let initialVab = await pylonInstance.virtualAnchorBalance();
        let initialVfb = await pylonInstance.virtualFloatBalance();

        let pair = (await printPairState(fixtures, true))
        let pairResIni = pair.pairResT;
        let pylon = await printState(fixtures, false);
        let initialftv = pair.tr0.mul(pylon.gamma.mul(2)).div(DECIMALS).add(pylon.sync[0]);

        //Dump to 33% and back to generate some fees
        await setPrice(account.address, 2.0, fixtures);
        await setPrice(account.address, 3.117, fixtures);
        await setPrice(account.address, 3.117, fixtures);
        await setPrice(account.address, 3.117, fixtures);

        let results = await printPairState(fixtures, true);
        let pairRes = results.pairResT;

        let kprime = pairRes[0].mul(pairRes[1]);
        let k = pairResIni[0].mul(pairResIni[1]);

        //Minor fix to formulas: it was wrong to divide by sqrtK since you overestimated feeToAnchor

        let feePercentage = ((sqrt(kprime).sub(sqrt(k))).mul(DECIMALS).div(sqrt(kprime)))
            .mul(5).div(6); //Adjusting for mintFee


        console.log("feePercentage", format(feePercentage));

        expect(kprime).to.gt(k);

        let mu = await pylonInstance.muMulDecimals();

        let feeToAnchor = results.pairResT[1].mul(2).mul(feePercentage).div(DECIMALS)
            .mul(results.ptb).div(results.ptt)
            .mul(mu).div(DECIMALS);
        let feeToFloat = results.pairResT[1].mul(2).mul(feePercentage).div(DECIMALS)
            .mul(results.ptb).div(results.ptt)
            .mul(DECIMALS.sub(mu)).div(DECIMALS);
        let vfbAdd = (results.pairResT[0].mul(2).mul(feePercentage).div(DECIMALS)
            .mul(results.ptb).div(results.ptt)
            .mul(DECIMALS.sub(mu))).div(DECIMALS);

        console.log("mu before new token: ", format(mu));
        console.log("gamma before new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
        console.log("vab before new token: ", ethers.utils.formatEther(await pylonInstance.virtualAnchorBalance()));



        //Two updates to retrieve the final gamma
        await updateMint(fixtures);
        await updateMint(fixtures);

        pylon = await printState(fixtures, true)
        pair = await printPairState(fixtures, false);
        let ftv = pair.tr0.mul(pylon.gamma.mul(2)).div(DECIMALS).add(pylon.sync[0]);
        console.log("mu after assignment mint: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
        console.log("gamma after new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
        let vab = await pylonInstance.virtualAnchorBalance();
        let vfb = await pylonInstance.virtualFloatBalance();
        // let p2y = await pylonInstance.p2y();
        // console.log("p2", format(p2y))
        console.log("feeTofloat", format(feeToFloat))


        console.log("vab after new token: ", ethers.utils.formatEther(vab));
        //We swapped slightly less than 1% of the pool, vab should be increased by
        // 50% (gamma) * 1% (swap amount) * 0.3% (fee) * 1% (pylon ownership) * 5/6 (mintfee)
        let vabDeviation = findDeviation(vab, initialVab.add(feeToAnchor));
        expect(vabDeviation).to.lt(IMPRECISION_TOLERANCE);
        let vfbDeviation = findDeviation(vfb, initialVfb.add(vfbAdd));
        console.log("vfb, initialVfb, vfbAdd", format(vfb), format(initialVfb), format(vfbAdd))
        expect(vfbDeviation).to.lt(IMPRECISION_TOLERANCE);
        console.log("p2y, initialp2y, fee", format(ftv), format(initialftv), format(vfbAdd))
        let p2yDeviation = findDeviation(ftv, initialftv.add(vfbAdd));
        expect(p2yDeviation).to.lt(IMPRECISION_TOLERANCE.mul(50)); //Slightly higher tolerance due to IL effects etc.


    });
//
//     //Mostly a "no catastrophic breaks" test
//     it('Change mu Test', async function () {
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 1)
//
//         //Pylon initialized. Now we advance time by muSamplingPeriod
//
//         let blockNumber = await ethers.provider.getBlockNumber()
//         let blocksToMine = await factoryPylonInstance.muUpdatePeriod();
//         await forwardTime(ethers.provider, blocksToMine.add(1))
//         // await ethers.provider.send("hardhat_mine", [blocksToMine.add(1).toHexString()]);
//
//         let newBlockNumber = await ethers.provider.getBlockNumber();
//
//         console.log("newBN, oldBN diff:", newBlockNumber - blockNumber);
//
//         await setPrice(account.address, 1.5, fixtures);
//
//         //Mint dust tokens to force sync
//         //Should assign according to new gamma
//
//         //Need to advance time again because of deltaGamma protection
//
//         await forwardTime(ethers.provider, blocksToMine.div(10))
//
//         console.log("mu before new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
//         console.log("gamma before new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
//         console.log("vab before new token: ", ethers.utils.formatEther(await pylonInstance.virtualAnchorBalance()));
//
//
//
//         await updateMint(fixtures)
//
//         let initialGamma = await pylonInstance.gammaMulDecimals()
//
//         let initialMu = await pylonInstance.muMulDecimals();
//
//
//         console.log("mu after new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
//         console.log("gamma after new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
//         //Advance time again
//
//         await forwardTime(ethers.provider, blocksToMine.add(1))
//
//         await setPrice(account.address, 2.5, fixtures);
//
//         await updateMint(fixtures)
//
//         let mu = await pylonInstance.muMulDecimals();
//         let gamma = await pylonInstance.gammaMulDecimals();
//
//         expect(initialMu).to.eq(initialGamma);
//         expect(mu).not.to.eq(initialMu);
//
//         let derivedMu = initialMu.add((gamma.sub(initialGamma)).mul(DECIMALS.div(2).sub(gamma)).div(DECIMALS).mul(3));
//
//         let deviation = findDeviation(mu, derivedMu);
//         //Gamma moved by 5% to 0.45, we expect mu to change by 5%* 5%*3 = 0.0075 (ish)
//         expect(deviation).to.lt(IMPRECISION_TOLERANCE);
//
//
//     });
//
//     it('Delta Gamma test', async function () {
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 1)
//
//         // Pylon initialized.
//
//         // We first try a massive swap + small syncMint. Should pass
//
//         await setPrice(account.address, 2.0, fixtures);
//
//         await updateMint(fixtures);
//         // await forwardTime(ethers.provider, 16)
//         // await updateMint(fixtures);
//
//         let gammaEMA = await pylonInstance.gammaEMA();
//         let thisBlockEMA = await pylonInstance.thisBlockEMA();
//         let strikeBlock = await pylonInstance.strikeBlock();
//
//         let blockNumber = await ethers.provider.getBlockNumber()
//
//         console.log("GammaEMA after: ", ethers.utils.formatEther(gammaEMA))
//         console.log("thisblockEMA after: ", ethers.utils.formatEther(thisBlockEMA))
//         console.log("strikeBlock after: ", strikeBlock.toBigInt())
//
//         expect(thisBlockEMA).to.eq(ethers.BigNumber.from("99384161431630346"));
//         expect(strikeBlock).to.eq(blockNumber);
//
//         // Advance time to reset this block ema. GammaEMA should also bleed to zero
//
//         let blocksToMine = await factoryPylonInstance.muUpdatePeriod(); //random but should do the trick here
//         await forwardTime(ethers.provider, blocksToMine.add(1))
//
//         await updateMint(fixtures);
//
//         let newgammaEMA = await pylonInstance.gammaEMA();
//         let newthisBlockEMA = await pylonInstance.thisBlockEMA();
//         let newstrikeBlock = await pylonInstance.strikeBlock();
//
//         expect(newthisBlockEMA).to.eq(0); //Should be basically zero
//         // expect(newgammaEMA).to.lt(gammaEMA); //New EMA should be less
//         expect(strikeBlock).to.eq(blockNumber); //Strike block shouldn't update
//
//         // Then we do a mint async100 + small syncMint. Should fail
//
//         token0Amount = token0Amount/4;
//         await mintSync(account.address, token0Amount, false, fixtures, false);
//
//         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//         await expect(updateMint(fixtures)).to.be.revertedWith("Z: FTH")
//
//     });
// //
// //
//     it('Delta Gamma test 2', async function () {
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         //Pylon initialized.
//
//         //We now do massive swap + mint async to counterbalance. Subsequent mint still shouldn't pass
//
//         await setPrice(account.address, 2.5, fixtures);
//
//
//         let pairResults = await printPairState(fixtures, true)
//
//         //Now the mint async
//         // We do it with the other token
//         let pairRes = pairResults.pairResT;
//
//         token1Amount = pairRes[1].div(8);
//         console.log("token1Amount, token0Amount", format(token1Amount), format(token1Amount.mul(pairRes[0]).div(pairRes[1])))
//
//         let oldgammaEMA = await pylonInstance.gammaEMA();
//         let oldthisBlockEMA = await pylonInstance.thisBlockEMA();
//         let oldstrikeBlock = await pylonInstance.strikeBlock();
//
//         await mintAsync(account.address, token1Amount.mul(pairRes[0]).div(pairRes[1]), token1Amount, false, fixtures, true);
//
//         let gammaEMA = await pylonInstance.gammaEMA();
//         let thisBlockEMA = await pylonInstance.thisBlockEMA();
//         let strikeBlock = await pylonInstance.strikeBlock();
//
//         console.log("GammaEMA after mint async: ", ethers.utils.formatEther(gammaEMA))
//         console.log("thisblockEMA after mint async: ", ethers.utils.formatEther(thisBlockEMA))
//         console.log("strikeBlock after mint async: ", strikeBlock.toBigInt())
//
//         //Should've hit the strike
//
//         let blockNumber = await ethers.provider.getBlockNumber();
//
//         expect(strikeBlock).to.eq(blockNumber);
//
//         //Unfortunately hardhat advances time at every transaction making this one impossible.
//
//         await updateMint(fixtures);
//
//
//         //Now we send an absolutely gargantuan swap, and see how long it takes to unlock
//
//         //Advance time to reset EMAs.
//
//         // let blocksToMine = await factoryPylonInstance.muUpdatePeriod(); //random but should do the trick here
//         // await forwardTime(ethers.provider, blocksToMine);
//
//         //Create a bit of gammaEma
//         // let dump = 1;
//         // while(gammaEMA.lt(DECIMALS.div(25))) { //While gammaEMA is less than 0.066
//         //     if(dump % 2 != 0) {
//         //         await setPrice(account.address, 0.5, fixtures);
//         //
//         //     } else {
//         //         await setPrice(account.address, 0.2, fixtures);
//         //     }
//         //     await updateMint(fixtures);
//         //     dump += 1;
//         //     gammaEMA = await pylonInstance.gammaEMA();
//         // }
//
//         await setPrice(account.address, 0.5, fixtures);
//         let i = 1;
//
//         let blockNumberIni = await ethers.provider.getBlockNumber();
//         for(i; i < 30; i+= 1) {
//             //Advance by a block, try to enter pool
//
//             await ethers.provider.send("evm_mine");
//
//             blockNumber = await ethers.provider.getBlockNumber();
//             // console.log("advanced, blockNumber: ", blockNumber);
//
//             try {
//
//                 await updateMint(fixtures);
//
//             } catch(e) {
//                 continue;
//             }
//             break;
//
//         }
//
//         console.log("Finished cycle, i: ", i);
//         blockNumber = await ethers.provider.getBlockNumber();
//         //It's only supposed to unlock after at least 10 blocks
//         //It's still a partial unlock with 90% fee
//
//         expect(i).to.gt(3);
//
//
//     });
// //
// //     it('Delta Gamma test 3', async function () {
// //
// //         //We now test the multi-block manipulation
// //
// //         let token0Amount = expandTo18Decimals(1700)
// //         let token1Amount = expandTo18Decimals(5300)
// //         await addLiquidity(token0Amount, token1Amount)
// //
// //         let pairRes = await pair.getReserves();
// //         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
// //         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
// //
// //         // Let's transfer some tokens to the Pylon
// //         await token0.transfer(pylonInstance.address, token0Amount)
// //         await token1.transfer(pylonInstance.address, token1Amount)
// //         //Let's initialize the Pylon, this should call two sync
// //         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount));
// //         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount));
// //         await pylonInstance.initPylon(account.address)
// //
// //         let pylonRes = await pylonInstance.getSyncReserves();
// //         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
// //         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
// //
// //         let ptb = await pair.balanceOf(pylonInstance.address);
// //         let ptt = await pair.totalSupply();
// //         console.log("ptb: ", ethers.utils.formatEther(ptb));
// //         console.log("ptt: ", ethers.utils.formatEther(ptt));
// //
// //         let pairResIni = await pair.getReserves();
// //         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
// //         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
// //
// //         //Pylon initialized.
// //
// //         //We send a moderately large amount to trip thisBlock
// //
// //         pairRes = await pair.getReserves();
// //         let input = pairRes[0].div(10);
// //         await token0.transfer(pair.address, input)
// //
// //         let balance = await token0.balanceOf(account.address);
// //         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
// //         let balance1 = await token1.balanceOf(account.address);
// //         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
// //
// //         let outcome = getAmountOut(input, pairRes[0], pairRes[1])
// //         await pair.swap(0, outcome, account.address, '0x', overrides)
// //
// //         let balanceNew = await token0.balanceOf(account.address);
// //         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
// //         let balance1New = await token1.balanceOf(account.address);
// //         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
// //
// //         gammaEMA = await pylonInstance.gammaEMA();
// //         thisBlockEMA = await pylonInstance.thisBlockEMA();
// //         strikeBlock = await pylonInstance.strikeBlock();
// //
// //         console.log("GammaEMA before cycle: ", ethers.utils.formatEther(gammaEMA))
// //         console.log("thisblockEMA before cycle: ", ethers.utils.formatEther(thisBlockEMA))
// //         console.log("strikeBlock before cycle: ", strikeBlock.toBigInt())
// //
// //
// //         //Token mint for syncing
// //         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
// //         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
// //         await pylonInstance.mintPoolTokens(account.address, false)
// //
// //         gammaEMA = await pylonInstance.gammaEMA();
// //         thisBlockEMA = await pylonInstance.thisBlockEMA();
// //         strikeBlock = await pylonInstance.strikeBlock();
// //
// //         //We begin a cycle where we swap a bit less than 4% gamma of pool back and forth
// //         //mine_block seems to work like shit, skipping 3 blocks at a time instead of 1
// //         //We shouldn't trip gammaEMA after 5 cycles or so
// //
// //         let i = 1
// //         let blockNumberIni = await ethers.provider.getBlockNumber();
// //
// //         for(i; i < 5; i+= 1) {
// //             //Advance by a block, try to enter pool
// //
// //             await ethers.provider.send("evm_mine");
// //
// //             let blockNumber = await ethers.provider.getBlockNumber();
// //             console.log("advanced, blockNumber: ", blockNumber);
// //
// //             //5% of pool
// //
// //             if(i % 2 == 0) {
// //
// //                 pairRes = await pair.getReserves();
// //                 let input = pairRes[0].div(13);
// //                 await token0.transfer(pair.address, input)
// //
// //                 let balance = await token0.balanceOf(account.address);
// //                 console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
// //                 let balance1 = await token1.balanceOf(account.address);
// //                 console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
// //
// //                 let outcome = getAmountOut(input, pairRes[0], pairRes[1])
// //                 await pair.swap(0, outcome, account.address, '0x', overrides)
// //
// //                 let balanceNew = await token0.balanceOf(account.address);
// //                 console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
// //                 let balance1New = await token1.balanceOf(account.address);
// //                 console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
// //
// //             } else {
// //                 pairRes = await pair.getReserves();
// //                 let input = pairRes[1].div(13);
// //                 await token1.transfer(pair.address, input)
// //
// //                 let balance = await token0.balanceOf(account.address);
// //                 console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
// //                 let balance1 = await token1.balanceOf(account.address);
// //                 console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
// //
// //                 let outcome = getAmountOut(input, pairRes[1], pairRes[0])
// //                 await pair.swap(outcome, 0, account.address, '0x', overrides)
// //
// //                 let balanceNew = await token0.balanceOf(account.address);
// //                 console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
// //                 let balance1New = await token1.balanceOf(account.address);
// //                 console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
// //             }
// //
// //
// //             pairRes = await pair.getReserves();
// //             console.log("Pylon Pair Reserve0 after first swap: ", ethers.utils.formatEther(pairRes[0]))
// //             console.log("Pylon Pair Reserve1 after first swap: ", ethers.utils.formatEther(pairRes[1]))
// //
// //
// //
// //             try {
// //
// //                 gammaEMA = await pylonInstance.gammaEMA();
// //                 thisBlockEMA = await pylonInstance.thisBlockEMA();
// //                 strikeBlock = await pylonInstance.strikeBlock();
// //
// //                 console.log("GammaEMA before cycle: ", ethers.utils.formatEther(gammaEMA))
// //                 console.log("thisblockEMA before cycle: ", ethers.utils.formatEther(thisBlockEMA))
// //                 console.log("strikeBlock before cycle: ", strikeBlock.toBigInt())
// //
// //
// //                 //Token mint for syncing
// //                 await token0.transfer(pylonInstance.address, token0Amount.div(10000))
// //                 //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
// //
// //                 console.log("Token0Amount: ", (token0Amount.div(10000)).toString())
// //                 await saveValuesForSDK()
// //                 await pylonInstance.mintPoolTokens(account.address, false)
// //                 let gamma = await pylonInstance.gammaMulDecimals();
// //                 let vab = await pylonInstance.virtualAnchorBalance();
// //                 gammaEMA = await pylonInstance.gammaEMA();
// //                 thisBlockEMA = await pylonInstance.thisBlockEMA();
// //                 strikeBlock = await pylonInstance.strikeBlock();
// //
// //                 console.log("VAB after cycle: ", vab.toString())
// //                 console.log("Gamma after cycle: ", gamma.toString())
// //                 console.log("GammaEMA after cycle: ", ethers.utils.formatEther(gammaEMA))
// //                 console.log("thisblockEMA after cycle: ", ethers.utils.formatEther(thisBlockEMA))
// //                 console.log("strikeBlock after cycle: ", strikeBlock.toBigInt())
// //
// //                 // if(strikeBlock != 0n) {
// //                 //     i+=1;
// //                 //     break;
// //                 // }
// //
// //             } catch(e) {
// //                 i+=1;
// //                 break;
// //             }
// //
// //         }
// //
// //         //Should've hit the strike
// //
// //         let blockNumber = await ethers.provider.getBlockNumber();
// //
// //         console.log("Finished cycle, i: ", i);
// //         blockNumber = await ethers.provider.getBlockNumber();
// //
// //         expect(i).to.eq(5);
// //
// //
// //     });
// //
//
//
//
//     it('Omega test', async function () {
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//         //We mint some Async first to make sure we send with correct proportions
//
//         let initialPtBalance = await poolTokenInstance1.balanceOf(account.address)
//         //Now we deposit a large amount of Anchors to test Omega
//         //We do it with async 50/50 to make sure we avoid slippage distortions
//         let pylonEarly = await printState(fixtures, true);
//         let pairEarly = await printPairState(fixtures, true);
//
//         let oldomega = calculateOmega(pylonEarly.gamma, pairEarly.tr1, pylonEarly.vab, pylonEarly.sync[1]);
//         console.log("oldOmega", oldomega);
//
//         console.log("Ftv: ", format(pairEarly.tr1.mul(2).mul(pylonEarly.gamma).div(DECIMALS)))
//         await mintAsync(account.address, token0Amount * 2, token1Amount * 2, true, fixtures, false);
//         await forwardTime(ethers.provider, 32);
//
//         await updateMint(fixtures);
//
//
//         let pylonState = await printState(fixtures, true);
//         let pairState = await printPairState(fixtures, true);
//
//         console.log("P2y (Ftv) after: ", format(pairState.tr1.mul(2).mul(pylonState.gamma).div(DECIMALS)))
//
//         let omega = calculateOmega(pylonState.gamma, pairState.tr1, pylonState.vab, pylonState.sync[1]);
//
//         expect(omega).to.lt(DECIMALS);
//
//         console.log("Post mint Omega: ", format(omega));
//
//         await forwardTime(ethers.provider, 50);
//         await updateMint(fixtures);
//
//
//
//         // We now do a few massive swaps to get some fees in (and energy funds) + small syncMint to make it stick.
//
//         await setPrice(account.address, 0.5, fixtures);
//         await setPrice(account.address, 5, fixtures);
//         await setPrice(account.address, 0.5, fixtures);
//         await setPrice(account.address, 3.1, fixtures);
//         await setPrice(account.address, 3.3, fixtures);
//
//         await updateMint(fixtures);
//         pylonState = await printState(fixtures, true);
//         pairState = await printPairState(fixtures, true);
//
//
//         //Avoid oracle stuff
//         await unblockOracle(ethers.provider, fixtures);
//
//
//         let balancePreBurn = await token1.balanceOf(account.address)
//
//         let aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         console.log("Anchor PT for burning:", ethers.utils.formatEther(aptBalance.div(100)));
//
//         let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
//         let pairTokenBalanceOld = await pair.balanceOf(energyAddress);
//
//         omega = calculateOmega(pylonState.gamma, pairState.tr1, pylonState.vab, pylonState.sync[1]);
//
//         expect(omega).to.gt(DECIMALS);
//
//         console.log("Omega Pre-burn:", format(omega));
//
//         await burnAsync(account.address, aptBalance.div(100), true, fixtures, true);
//
//         let pairTokenBalanceNew = await pair.balanceOf(energyAddress);
//
//         let balancePostBurn = await token1.balanceOf(account.address);
//
//         let moneyReceived = balancePostBurn.sub(balancePreBurn);
//
//         //We get a reference amount with no omega
//
//         // expect(balancePostBurn.sub(balancePreBurn)).to.lt(aptBalance.div(200));
//         //Be that as it may it shouldn't do any compensation
//         expect(pairTokenBalanceNew).to.eq(pairTokenBalanceOld);
//
//
//
//         //Now we dump the price to trigger slashing (2% or so)
//         //We want to withdraw a smallish amount with burnAsync
//         //The user should receive what he inputted minus fees etc
//
//         await setPrice(account.address, 3, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//         balancePreBurn = await token1.balanceOf(account.address)
//         await burnAsync(account.address, aptBalance.div(100), true, fixtures, true);
//
//
//         balancePostBurn = await token1.balanceOf(account.address);
//
//         pairTokenBalanceNew = await pair.balanceOf(energyAddress);
//
//         expect(pairTokenBalanceNew).to.not.eq(expandTo18Decimals(0))
//
//         console.log("PTB old, PTB new", format(pairTokenBalanceOld), format(pairTokenBalanceNew));
//         let pairData = await printPairState(fixtures, true);
//
//         let valOfPtb = pairTokenBalanceOld.sub(pairTokenBalanceNew).mul(pairData.pairResT[1].mul(2)).div(pairData.ptt);
//
//         console.log("val of PTB", format(valOfPtb));
//
//
//         //Here the omega compensation should be distributed equally so the equation should hold.
//         let deviation = findDeviation(balancePostBurn.sub(balancePreBurn), moneyReceived);
//         //Can up the tolerance since we've had some fees added between trades
//         //At original values the imprecision is 0.001%, explainable by the fee
//         expect(deviation).to.lt(IMPRECISION_TOLERANCE.mul(1000000000));//Tolerance to up to 1bps of deviation
//
//         //Now we dump a bit more, just enough to finish all pool tokens but not enough to tap all anchors
//
//         await setPrice(account.address, 2.5, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//         balancePreBurn = await token1.balanceOf(account.address)
//
//         let anchorBalanceOld = await token1.balanceOf(energyAddress);
//         let floatBalancePreBurn = await token0.balanceOf(account.address);
//
//         await burnAsync(account.address, aptBalance.div(100), true, fixtures, true);
//
//         balancePostBurn = await token1.balanceOf(account.address);
//         let floatBalancePostBurn = await token0.balanceOf(account.address);
//         pairTokenBalanceNew = await pair.balanceOf(energyAddress);
//
//         expect(pairTokenBalanceNew).to.eq(expandTo18Decimals(0))
//
//         let anchorBalance = await token1.balanceOf(energyAddress);
//
//         console.log("anchorBalance old, new", format(anchorBalanceOld), format(anchorBalance));
//         expect(anchorBalance).to.not.eq(expandTo18Decimals(0))
//         expect(anchorBalance).to.not.eq(anchorBalanceOld)
//
//         //Here the relationship breaks because we are adding compensation for the total only in anchors
//         //So we adjust by including the other half of the money
//
//         pairData = await printPairState(fixtures, true);
//
//         let totalReceived = balancePostBurn.sub(balancePreBurn)
//         totalReceived = totalReceived.add(floatBalancePostBurn.sub(floatBalancePreBurn).mul(pairData.pairResT[1]).div(pairData.pairResT[0]));
//
//         deviation = findDeviation(totalReceived, moneyReceived.mul(2));
//         expect(deviation).to.lt(IMPRECISION_TOLERANCE.mul(1000000000));
//
//     });
//
//
//
//
//     it('Sync Parabola Test', async function () {
//
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.0, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         //Now we add a lot of sync liquidity
//         //We record derVFB before and Float claim for the initial PTs
//         // //Then we check anchorK and Float claim again
//
//         let pylonState = await printState(fixtures, true);
//
//         let pairState = await printPairState(fixtures, true);
//
//         let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address)
//
//         let initialFloatValue = pairState.tr1.mul(pylonState.gamma.mul(2)).div(DECIMALS);
//
//         console.log("ptBalance before mints", ethers.utils.formatEther(initialFloatPtBalance));
//
//         //Benchmark burn
//         let initialFloatBalance = await token0.balanceOf(account.address);
//         await burn(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//         initialFloatBalance = (await token0.balanceOf(account.address)).sub(initialFloatBalance);
//
//         console.log("Val of 1% burn", format(initialFloatBalance));
//
//
//
//         let floatSum = ethers.BigNumber.from('000000000000000000');
//         let floatAdd = (pairState.tr0.div(25));
//         let anchorAdd = (pairState.tr1.div(25));
//         //We add sync liquidity in cycles
//         for(let i = 0; i < 15; i++) {
//
//             floatSum = floatSum.add(floatAdd);
//             await mintSync(account.address, anchorAdd, true, fixtures, true)
//             await mintSync(account.address, floatAdd, false, fixtures, true)
//
//             await ethers.provider.send("hardhat_mine", ['0x30']);
//             await updateMint(fixtures)
//
//             let pylonState = await printState(fixtures, false)
//             let pairState = await printPairState(fixtures, false)
//             let ptState = await printPoolTokens(account.address, fixtures, false)
//
//             let ftv = getFtv(pairState.tr0, pairState.tr1, pylonState.gamma, pylonState.sync[0]).mul(pairState.tr0).div(pairState.tr1)
//             let ptTotal = ptState.ptTotal0;
//
//             let ptPrice = ftv.mul(DECIMALS).div(ptTotal);
//             console.lo
//             console.log("Price of PTs: ", format(ptPrice))
//         }
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //Now we check what happened
//
//         let newPylon = await printState(fixtures, true)
//
//         let newPair = await printPairState(fixtures, true)
//
//         console.log("Float sum, p2y new, p2y old", format(floatSum.mul(newPair.price).div(DECIMALS)), format(newPylon.p2y), format(initialFloatValue));
//
//         //We now burn the initial share and see how much we get back
//
//         await setPrice(account.address, 2.1, fixtures);
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         await burn(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//
//         let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//         let deviation = findDeviation(floatsReceived, initialFloatBalance);
//
//         //TODO: The first burn itself is a bit sussy actually, but otherwise deviations are explainable by the change in price during syncs.
//
//         //Expecting deviation of at most 0.1%
//         expect(deviation).to.lt(expandTo18Decimals(0.001));
//
//     });
//
//
//     it('Async100 Parabola Test', async function () {
//
//         //Similar test as previous but with fewer, larger cycles of liquidity to trigger plenty of asyncs
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.0, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         //Now we add a lot of sync liquidity
//         //We record derVFB before and Float claim for the initial PTs
//         // //Then we check anchorK and Float claim again
//
//         let pylonState = await printState(fixtures, true);
//
//         let pairState = await printPairState(fixtures, true);
//
//         let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address)
//
//         let initialFloatValue = pairState.tr1.mul(pylonState.gamma.mul(2)).div(DECIMALS);
//
//         console.log("ptBalance before mints", ethers.utils.formatEther(initialFloatPtBalance));
//
//         //Benchmark burn
//         let initialFloatBalance = await token0.balanceOf(account.address);
//         await burn(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//         initialFloatBalance = (await token0.balanceOf(account.address)).sub(initialFloatBalance);
//
//         console.log("Val of 1% burn", format(initialFloatBalance));
//
//
//
//         let floatSum = ethers.BigNumber.from('000000000000000000');
//         let floatAdd = (pairState.tr0.div(5));
//         let anchorAdd = (pairState.tr1.div(5));
//         //We add sync liquidity in cycles
//         for(let i = 0; i < 5; i++) {
//
//             floatSum = floatSum.add(floatAdd);
//             await mintSync(account.address, anchorAdd, true, fixtures, true)
//             await mintSync(account.address, floatAdd, false, fixtures, true)
//
//             await ethers.provider.send("hardhat_mine", ['0x30']);
//             await updateMint(fixtures)
//
//             let pylonState = await printState(fixtures, false)
//             let pairState = await printPairState(fixtures, false)
//             let ptState = await printPoolTokens(account.address, fixtures, false)
//
//             let ftv = getFtv(pairState.tr0, pairState.tr1, pylonState.gamma, pylonState.sync[0]).mul(pairState.tr0).div(pairState.tr1)
//             let ptTotal = ptState.ptTotal0;
//
//             let ptPrice = ftv.mul(DECIMALS).div(ptTotal);
//             console.lo
//             console.log("Price of PTs: ", format(ptPrice))
//         }
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //Now we check what happened
//
//         let newPylon = await printState(fixtures, true)
//
//         let newPair = await printPairState(fixtures, true)
//
//         console.log("Float sum, p2y new, p2y old", format(floatSum.mul(newPair.price).div(DECIMALS)), format(newPylon.p2y), format(initialFloatValue));
//
//         //We now burn the initial share and see how much we get back
//
//         await setPrice(account.address, 2.1, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         await burn(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//
//         let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//         let deviation = findDeviation(floatsReceived, initialFloatBalance);
//
//         //Due to slight extra slashing when adding async float we can relax deviation, but with added condition that it should always be higher
//         expect(deviation).to.lt(expandTo18Decimals(0.002));
//         expect(floatsReceived).to.gt(initialFloatBalance);
//
//     });
//
//
//     it('Async50 Parabola Test', async function () {
//
//         //Similar test as previous but with fewer, larger cycles of liquidity to trigger plenty of asyncs
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.1, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         //Now we add a lot of sync liquidity
//         //We record derVFB before and Float claim for the initial PTs
//         // //Then we check anchorK and Float claim again
//
//         let pylonState = await printState(fixtures, true);
//
//         let pairState = await printPairState(fixtures, true);
//
//         let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address)
//
//         let initialFloatValue = pairState.tr1.mul(pylonState.gamma.mul(2)).div(DECIMALS);
//
//         console.log("ptBalance before mints", ethers.utils.formatEther(initialFloatPtBalance));
//
//         await getPTPrice(fixtures, true);
//         //Benchmark burn
//         let initialFloatBalance = await token0.balanceOf(account.address);
//         await burnAsync(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//         initialFloatBalance = (await token0.balanceOf(account.address)).sub(initialFloatBalance);
//
//         console.log("Val of 1% burn", format(initialFloatBalance));
//
//         pairState = await printPairState(fixtures, false);
//
//         let floatSum = ethers.BigNumber.from('000000000000000000');
//         let floatAdd = (pairState.tr0.div(5));
//
//         //We add sync liquidity in cycles
//         for(let i = 0; i < 15; i++) {
//
//             pairState = await printPairState(fixtures, false);
//             let anchorAdd = (floatAdd.mul(pairState.tr1).div(pairState.tr0));
//
//             floatSum = floatSum.add(floatAdd);
//             let initialPtBalance = await poolTokenInstance1.balanceOf(account.address);
//             await mintAsync(account.address, floatAdd.div(2), anchorAdd.div(2), true, fixtures, true)
//             let secondPtBalance = await poolTokenInstance1.balanceOf(account.address);
//             console.log("\nAnchor PTs minted", format(secondPtBalance.sub(initialPtBalance)))
//             await ethers.provider.send("hardhat_mine", ['0x30']);
//             await updateMint(fixtures)
//             await getPTPrice(fixtures, true);
//
//             initialPtBalance = await poolTokenInstance0.balanceOf(account.address);
//
//             await mintAsync(account.address, floatAdd.div(2), anchorAdd.div(2), false, fixtures, true)
//             secondPtBalance = await poolTokenInstance0.balanceOf(account.address);
//             console.log("\nFloat PTs minted", format(secondPtBalance.sub(initialPtBalance)))
//             await ethers.provider.send("hardhat_mine", ['0x30']);
//             await updateMint(fixtures)
//             await getPTPrice(fixtures, true);
//             // console.lo
//
//         }
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //Now we check what happened
//
//         let newPylon = await printState(fixtures, true)
//
//         let newPair = await printPairState(fixtures, true)
//
//         console.log("Float sum, p2y new, p2y old", format(floatSum.mul(newPair.price).div(DECIMALS)), format(newPylon.p2y), format(initialFloatValue));
//
//         //We now burn the initial share and see how much we get back
//
//         await setPrice(account.address, 2.1, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         await getPTPrice(fixtures, true);
//
//         await burnAsync(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//
//         let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//         let deviation = findDeviation(floatsReceived, initialFloatBalance);
//
//         console.log("InitFl, LaterFl, deviation", format(initialFloatBalance), format(floatsReceived), format(deviation))
//
//         expect(deviation).to.lt(expandTo18Decimals(0.001));
//         // expect(floatsReceived).to.gt(initialFloatBalance);
//
//     });
//
//     /*TODO:
//         - add init parameters with low float price, high float price, low float decimals, low anchor decimals and low both (david)
//     */
//     it('Burn 100% test', async function () {
//         //Opposite of previous tests: we burn a bunch of tokens and make sure the amounts never change.
//         //Similar test as previous but with fewer, larger cycles of liquidity to trigger plenty of asyncs
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.1, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         //Now we remove liquidity via burn()
//
//         let pylonState = await printState(fixtures, true);
//
//         let pairState = await printPairState(fixtures, true);
//
//         let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address)
//         let initialAnchorPtBalance = await poolTokenInstance1.balanceOf(account.address)
//
//         let initialFloatValue = pairState.tr1.mul(pylonState.gamma.mul(2)).div(DECIMALS);
//
//         console.log("ptBalance before mints", ethers.utils.formatEther(initialFloatPtBalance));
//
//         //Benchmark burn float
//         let initialFloatBalance = await token0.balanceOf(account.address);
//         await burn(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//         initialFloatBalance = (await token0.balanceOf(account.address)).sub(initialFloatBalance);
//
//         console.log("Val of 1% burn float", format(initialFloatBalance));
//
//         //Benchmark burn anchor
//         let initialAnchorBalance = await token1.balanceOf(account.address);
//         await burn(account.address, initialAnchorPtBalance.div(100), true, fixtures, true);
//         initialAnchorBalance = (await token1.balanceOf(account.address)).sub(initialAnchorBalance);
//
//         console.log("Val of 1% burn anchor", format(initialAnchorBalance));
//
//         let floatRemove = initialFloatPtBalance.div(30);//3.3% every burn
//         let anchorRemove = initialAnchorPtBalance.div(30);
//         //We remove liquidity in cycles
//         for(let i = 0; i < 20; i++) { //Should remove 2/3 of liquidity
//
//             let anchorsReceived = await token1.balanceOf(account.address)
//             await burn(account.address, anchorRemove, true, fixtures, true)
//             anchorsReceived = (await token1.balanceOf(account.address)).sub(anchorsReceived);
//             console.log("Anchors received: ", ethers.utils.formatEther(anchorsReceived));
//
//             let floatsReceived = await token0.balanceOf(account.address)
//             await burn(account.address, floatRemove, false, fixtures, true);
//             floatsReceived = (await token0.balanceOf(account.address)).sub(floatsReceived);
//             console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//             // await burn(account.address, floatRemove, false, fixtures, true)
//
//             await ethers.provider.send("hardhat_mine", ['0x30']);
//             await updateMint(fixtures)
//
//             let pylonState = await printState(fixtures, false)
//             let pairState = await printPairState(fixtures, false)
//             let ptState = await printPoolTokens(account.address, fixtures, false)
//
//             let omega = calculateOmega(pylonState.gamma, pairState.tr1, pylonState.vab, pylonState.sync[1]);
//             console.log("PostCycle omega:", format(omega));
//
//             let ftv = getFtv(pairState.tr0, pairState.tr1, pylonState.gamma, pylonState.sync[0]).mul(pairState.tr0).div(pairState.tr1)
//             let ptTotal = ptState.ptTotal0;
//
//             let ptPrice = ftv.mul(DECIMALS).div(ptTotal);
//             console.log("Price of PTs: ", format(ptPrice))
//         }
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //Now we check what happened
//
//         let newPylon = await printState(fixtures, true)
//
//         let newPair = await printPairState(fixtures, true)
//
//         // console.log("Float sum, p2y new, p2y old", format(floatSum.mul(newPair.price).div(DECIMALS)), format(newPylon.p2y), format(initialFloatValue));
//
//         //We now burn the initial share and see how much we get back
//
//         await setPrice(account.address, 2.1, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         await getPTPrice(fixtures, true);
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         await burn(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//
//         let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//         let deviation = findDeviation(floatsReceived, initialFloatBalance);
//
//         //Here deviation could be a lot
//         expect(deviation).to.lt(expandTo18Decimals(0.03));
//         expect(floatsReceived).to.gt(initialFloatBalance);
//
//     });
//
//     it('Burn Async test', async function () {
//         //Opposite of previous tests: we burn a bunch of tokens and make sure the amounts never change.
//         //Similar test as previous but with fewer, larger cycles of liquidity to trigger plenty of asyncs
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.1, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         //Now we remove liquidity via burn()
//
//         let pylonState = await printState(fixtures, true);
//
//         let pairState = await printPairState(fixtures, true);
//
//         let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address)
//         let initialAnchorPtBalance = await poolTokenInstance1.balanceOf(account.address)
//
//         let initialFloatValue = pairState.tr1.mul(pylonState.gamma.mul(2)).div(DECIMALS);
//
//         console.log("ptBalance before mints", ethers.utils.formatEther(initialFloatPtBalance));
//
//         //Benchmark burn float
//         let initialFloatBalance = await token0.balanceOf(account.address);
//         await burnAsync(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//         initialFloatBalance = (await token0.balanceOf(account.address)).sub(initialFloatBalance);
//
//         console.log("Val of 1% burn float", format(initialFloatBalance));
//
//         //Benchmark burn anchor
//         let initialAnchorBalance = await token1.balanceOf(account.address);
//         await burnAsync(account.address, initialAnchorPtBalance.div(100), true, fixtures, true);
//         initialAnchorBalance = (await token1.balanceOf(account.address)).sub(initialAnchorBalance);
//
//         console.log("Val of 1% burn anchor", format(initialAnchorBalance));
//
//         let floatRemove = initialFloatPtBalance.div(15);//6.6% every burn
//         let anchorRemove = initialAnchorPtBalance.div(15);
//         //We remove liquidity in cycles
//         for(let i = 0; i < 10; i++) { //Should remove 2/3 of liquidity
//
//             let anchorsReceived = await token1.balanceOf(account.address)
//             await burnAsync(account.address, anchorRemove, true, fixtures, true)
//             anchorsReceived = (await token1.balanceOf(account.address)).sub(anchorsReceived);
//             console.log("Anchors received: ", ethers.utils.formatEther(anchorsReceived));
//
//             let floatsReceived = await token0.balanceOf(account.address)
//             await burnAsync(account.address, floatRemove, false, fixtures, true);
//             floatsReceived = (await token0.balanceOf(account.address)).sub(floatsReceived);
//             console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//             // await burn(account.address, floatRemove, false, fixtures, true)
//
//             await ethers.provider.send("hardhat_mine", ['0x30']);
//             await updateMint(fixtures)
//
//             let pylonState = await printState(fixtures, false)
//             let pairState = await printPairState(fixtures, false)
//             let ptState = await printPoolTokens(account.address, fixtures, false)
//
//             let omega = calculateOmega(pylonState.gamma, pairState.tr1, pylonState.vab, pylonState.sync[1]);
//             console.log("PostCycle omega:", format(omega));
//
//             let ftv = getFtv(pairState.tr0, pairState.tr1, pylonState.gamma, pylonState.sync[0]).mul(pairState.tr0).div(pairState.tr1)
//             let ptTotal = ptState.ptTotal0;
//
//             let ptPrice = ftv.mul(DECIMALS).div(ptTotal);
//             console.log("Price of PTs: ", format(ptPrice))
//         }
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //Now we check what happened
//
//         let newPylon = await printState(fixtures, true)
//
//         let newPair = await printPairState(fixtures, true)
//
//         // console.log("Float sum, p2y new, p2y old", format(floatSum.mul(newPair.price).div(DECIMALS)), format(newPylon.p2y), format(initialFloatValue));
//
//         //We now burn the initial share and see how much we get back
//
//         await setPrice(account.address, 2.1, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         await getPTPrice(fixtures, true);
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         await burnAsync(account.address, initialFloatPtBalance.div(100), false, fixtures, true);
//
//         let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//         let deviation = findDeviation(floatsReceived, initialFloatBalance);
//         console.log("Deviation", format(deviation))
//         //Here deviation could be a lot
//         expect(deviation).to.lt(expandTo18Decimals(0.005));
//         // expect(floatsReceived).to.gt(initialFloatBalance);
//
//     });
//
//     it('Combined Single-State test', async function () {
//         //This test goes through a number of price and gamma conditions for a single initial pylon.
//         //It uses "Safe" mint/burn methods that check some invariants for each swap
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//         //Each test does a set of random actions based off an initial seed
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.9, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let j = 0;
//
//         for(let i = 0; i < 10; i++) {
//
//             if(j % 3 == 0) {
//                 await unblockOracle(ethers.provider, fixtures);
//             }
//             await executeRandomInstruction(500, fixtures);
//             j++;
//         }
//
//         await setPrice(account.address, 7, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         for(let i = 0; i < 10; i++) {
//
//             if(j % 3 == 0) {
//                 await unblockOracle(ethers.provider, fixtures);
//             }
//
//             await executeRandomInstruction(500, fixtures);
//
//             j++;
//         }
//
//         await setPrice(account.address, 1.0, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         for(let i = 0; i < 10; i++) {
//             if(j % 3 == 0) {
//                 await unblockOracle(ethers.provider, fixtures);
//             }
//             await executeRandomInstruction(500, fixtures);
//
//             j++;
//         }
//
//         await setPrice(account.address, 3.1, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let floatBalance = await token0.balanceOf(account.address);
//         await burn(account.address, token0Amount/100, false, fixtures, false)
//         floatBalance = (await token0.balanceOf(account.address)).sub(floatBalance);
//
//         let deviation = findDeviation(floatBalance, expandTo18Decimals(token0Amount/100));
//
//         expect(deviation).to.lt(expandTo18Decimals(0.1))
//
//         let anchorBalance = await token1.balanceOf(account.address);
//         await burn(account.address, token1Amount/100, true, fixtures, false)
//         anchorBalance = (await token1.balanceOf(account.address)).sub(anchorBalance);
//
//         deviation = findDeviation(anchorBalance, expandTo18Decimals(token1Amount/100));
//
//         expect(deviation).to.lt(expandTo18Decimals(0.1))
//
//     });
//
//     it('Remove all Anchor', async function () {
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//         //Only way to trigger reduce only is with absurdly low prices
//
//         await setPrice(account.address, 0.001, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let PtPrice = await getPTPrice(fixtures, true)
//
//         await burnAsync(account.address, token1Amount*0.85, true, fixtures, false);
//
//         await forwardTime(ethers.provider, 96);
//         await forwardTime(ethers.provider, 96);
//
//         let passed = false;
//
//         try {
//             await updateMint(fixtures);
//         }
//
//         catch {
//
//             await setPrice(account.address, 0.001, fixtures);
//             await forwardTime(ethers.provider, 96);
//             await mintSync(account.address, MINIMUM_LIQUIDITY, true, fixtures, true);
//             await forwardTime(ethers.provider, 96);
//             await mintSync(account.address, MINIMUM_LIQUIDITY, true, fixtures, true);
//             await forwardTime(ethers.provider, 96);
//             await forwardTime(ethers.provider, 96);
//
//             let PtPrice = await getPTPrice(fixtures, true)
//             let floatBalancePre = await token0.balanceOf(account.address);
//             await burnAsync(account.address, token0Amount*0.01, false, fixtures, false);
//             let floatBalancePost = await token0.balanceOf(account.address);
//
//             await printState(fixtures, true);
//
//             console.log("Floats Returned: ", format(floatBalancePost.sub(floatBalancePre)))
//
//             let deviation = findDeviation(floatBalancePost.sub(floatBalancePre), expandTo18Decimals(token0Amount/200));
//             expect(deviation).to.lt(expandTo18Decimals(0.1));
//
//             PtPrice = await getPTPrice(fixtures, true)
//
//             // await mintSync(account.address, token0Amount * 0.1, false, fixtures, false)//).to.be.revertedWith("ZP: ReduceOnly")
//             passed = true;
//         }
//
//         assert(passed);
//
//
//         // expect(await mintSync(account.address, token0Amount * 0.1, false, fixtures, false)).to.be.revertedWith("ZP: ReduceOnly")
//
//         // await unblockOracle(ethers.provider, fixtures);
//
//
//         // let floatBalance = await token0.balanceOf(account.address);
//         // await burn(account.address, token0Amount/100, false, fixtures, false)
//         // floatBalance = (await token0.balanceOf(account.address)).sub(floatBalance);
//         //
//         // let deviation = findDeviation(floatBalance, expandTo18Decimals(token0Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//         //
//         // let anchorBalance = await token1.balanceOf(account.address);
//         // await burn(account.address, token1Amount/100, true, fixtures, false)
//         // anchorBalance = (await token1.balanceOf(account.address)).sub(anchorBalance);
//         //
//         // deviation = findDeviation(anchorBalance, expandTo18Decimals(token1Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//
//     });
//
//
//     it('Remove all Anchor 100%', async function () {
//         //This test goes through a number of price and gamma conditions for a single initial pylon.
//         //It uses "Safe" mint/burn methods that check some invariants for each swap
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//         //Each test does a set of random actions based off an initial seed
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.9, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let PtPrice = await getPTPrice(fixtures, true)
//
//         await burn(account.address, token1Amount*0.85, true, fixtures, false);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let results = await printState(fixtures, true);
//         let pair = await printPairState(fixtures, false);
//
//         let omega = await calculateOmega(results.gamma, pair.tr1, results.vab, results.sync[1])
//         let ftv = pair.tr1.mul(results.gamma).mul(2).div(DECIMALS);
//
//         console.log("Omega: ", format(omega))
//         console.log("FTV: ", format(ftv))
//
//         let anchorBalancePre = await token1.balanceOf(account.address);
//         await burnAsync(account.address, token1Amount*0.001, true, fixtures, false);
//         let anchorBalancePost = await token1.balanceOf(account.address);
//
//         console.log("Anchors Returned: ", format(anchorBalancePost.sub(anchorBalancePre)))
//
//         PtPrice = await getPTPrice(fixtures, true)
//
//         await mintSync(account.address, token0Amount * 0.01, false, fixtures, false)//).to.be.revertedWith("ZP: ReduceOnly")
//
//         // let floatBalance = await token0.balanceOf(account.address);
//         // await burn(account.address, token0Amount/100, false, fixtures, false)
//         // floatBalance = (await token0.balanceOf(account.address)).sub(floatBalance);
//         //
//         // let deviation = findDeviation(floatBalance, expandTo18Decimals(token0Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//         //
//         // let anchorBalance = await token1.balanceOf(account.address);
//         // await burn(account.address, token1Amount/100, true, fixtures, false)
//         // anchorBalance = (await token1.balanceOf(account.address)).sub(anchorBalance);
//         //
//         // deviation = findDeviation(anchorBalance, expandTo18Decimals(token1Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//
//     });
//
//
//     it('Remove all Float', async function () {
//         //This test goes through a number of price and gamma conditions for a single initial pylon.
//         //It uses "Safe" mint/burn methods that check some invariants for each swap
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//         //Each test does a set of random actions based off an initial seed
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.9, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let PtPrice = await getPTPrice(fixtures, true);
//
//         await burnAsync(account.address, token0Amount*0.85, false, fixtures, false);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let results = await printState(fixtures, true);
//         let pair = await printPairState(fixtures, false);
//
//         let omega = await calculateOmega(results.gamma, pair.tr1, results.vab, results.sync[1])
//         let ftv = pair.tr1.mul(results.gamma).mul(2).div(DECIMALS);
//
//         console.log("Omega: ", format(omega))
//         console.log("FTV: ", format(ftv))
//
//         let anchorBalancePre = await token1.balanceOf(account.address);
//         await burnAsync(account.address, token1Amount*0.001, true, fixtures, false);
//         let anchorBalancePost = await token1.balanceOf(account.address);
//
//         console.log("Anchors Returned: ", format(anchorBalancePost.sub(anchorBalancePre)))
//
//         let PtPriceNew = await getPTPrice(fixtures, true)
//
//         let deviation = findDeviation(PtPrice, PtPriceNew);
//
//         expect(deviation).to.lt(expandTo18Decimals(0.01));
//
//         // await mintSync(account.address, token0Amount * 0.01, false, fixtures, false)//).to.be.revertedWith("ZP: ReduceOnly")
//
//         // let floatBalance = await token0.balanceOf(account.address);
//         // await burn(account.address, token0Amount/100, false, fixtures, false)
//         // floatBalance = (await token0.balanceOf(account.address)).sub(floatBalance);
//         //
//         // let deviation = findDeviation(floatBalance, expandTo18Decimals(token0Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//         //
//         // let anchorBalance = await token1.balanceOf(account.address);
//         // await burn(account.address, token1Amount/100, true, fixtures, false)
//         // anchorBalance = (await token1.balanceOf(account.address)).sub(anchorBalance);
//         //
//         // deviation = findDeviation(anchorBalance, expandTo18Decimals(token1Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//
//     });
//
//     it('Add tons of Float', async function () {
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//         //Each test does a set of random actions based off an initial seed
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.9, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let PtPrice = await getPTPrice(fixtures, true);
//         await mintAsync(account.address, token0Amount*10, token0Amount* 2.9 * 10, false, fixtures, false);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let results = await printState(fixtures, true);
//         let pair = await printPairState(fixtures, false);
//
//         let omega = await calculateOmega(results.gamma, pair.tr1, results.vab, results.sync[1])
//         let ftv = pair.tr1.mul(results.gamma).mul(2).div(DECIMALS);
//
//         console.log("Omega: ", format(omega))
//         console.log("FTV: ", format(ftv))
//
//         let anchorBalancePre = await token1.balanceOf(account.address);
//         await burnAsync(account.address, token1Amount*0.001, true, fixtures, false);
//         let anchorBalancePost = await token1.balanceOf(account.address);
//
//         console.log("Anchors Returned: ", format(anchorBalancePost.sub(anchorBalancePre)))
//
//         let PtPriceNew = await getPTPrice(fixtures, true)
//
//         let deviation = findDeviation(PtPrice, PtPriceNew);
//
//         expect(deviation).to.lt(expandTo18Decimals(0.01));
//
//         // await mintSync(account.address, token0Amount * 0.01, false, fixtures, false)//).to.be.revertedWith("ZP: ReduceOnly")
//
//         // let floatBalance = await token0.balanceOf(account.address);
//         // await burn(account.address, token0Amount/100, false, fixtures, false)
//         // floatBalance = (await token0.balanceOf(account.address)).sub(floatBalance);
//         //
//         // let deviation = findDeviation(floatBalance, expandTo18Decimals(token0Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//         //
//         // let anchorBalance = await token1.balanceOf(account.address);
//         // await burn(account.address, token1Amount/100, true, fixtures, false)
//         // anchorBalance = (await token1.balanceOf(account.address)).sub(anchorBalance);
//         //
//         // deviation = findDeviation(anchorBalance, expandTo18Decimals(token1Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//
//     });
//
//     it('Add tons of Anchor', async function () {
//
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 99)
//
//         // Pylon initialized.
//
//         //Each test does a set of random actions based off an initial seed
//         //Dump float to trigger isLineFormula
//
//         await setPrice(account.address, 2.9, fixtures);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let PtPrice = await getPTPrice(fixtures, true);
//         await mintAsync(account.address, token0Amount*10, token0Amount* 2.9 * 10, true, fixtures, false);
//
//         await unblockOracle(ethers.provider, fixtures);
//
//         let results = await printState(fixtures, true);
//         let pair = await printPairState(fixtures, false);
//
//         let omega = await calculateOmega(results.gamma, pair.tr1, results.vab, results.sync[1])
//         let ftv = pair.tr1.mul(results.gamma).mul(2).div(DECIMALS);
//
//         console.log("Omega: ", format(omega))
//         console.log("FTV: ", format(ftv))
//
//         let anchorBalancePre = await token1.balanceOf(account.address);
//         await burnAsync(account.address, token1Amount*0.001, true, fixtures, false);
//         let anchorBalancePost = await token1.balanceOf(account.address);
//
//         console.log("Anchors Returned: ", format(anchorBalancePost.sub(anchorBalancePre)))
//
//         let PtPriceNew = await getPTPrice(fixtures, true)
//
//         let deviation = findDeviation(PtPrice, PtPriceNew);
//
//         expect(deviation).to.lt(expandTo18Decimals(0.01));
//
//         // await mintSync(account.address, token0Amount * 0.01, false, fixtures, false)//).to.be.revertedWith("ZP: ReduceOnly")
//
//         // let floatBalance = await token0.balanceOf(account.address);
//         // await burn(account.address, token0Amount/100, false, fixtures, false)
//         // floatBalance = (await token0.balanceOf(account.address)).sub(floatBalance);
//         //
//         // let deviation = findDeviation(floatBalance, expandTo18Decimals(token0Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//         //
//         // let anchorBalance = await token1.balanceOf(account.address);
//         // await burn(account.address, token1Amount/100, true, fixtures, false)
//         // anchorBalance = (await token1.balanceOf(account.address)).sub(anchorBalance);
//         //
//         // deviation = findDeviation(anchorBalance, expandTo18Decimals(token1Amount/100));
//         //
//         // expect(deviation).to.lt(expandTo18Decimals(0.1))
//
//     });

    it('Oracle test', async function () {

        let token0Amount = 1700
        let token1Amount = 5300
        let fixtures = await init(token0Amount, token1Amount, 99)

        // We test for the most important thing the oracle exists for: so that we can't extract liquidity by flashloaning

        let floatBalance = await poolTokenInstance0.balanceOf(account2.address);
        await mintSync(account2.address, token0Amount/100, false, fixtures, false);
        floatBalance = (await poolTokenInstance0.balanceOf(account2.address)).sub(floatBalance)
        console.log("floatBalance", format(floatBalance));
        await setPrice(account.address, 3.2, fixtures);
        // await unblockOracle(ethers.provider, fixtures); //uncommenting this makes the test fail

        let anchorBalance = await token1.balanceOf(account2.address)
        await burnAsync(account2.address, floatBalance, false, fixtures, true)
        anchorBalance = (await token1.balanceOf(account2.address)).sub(anchorBalance);
        // await setPrice(account.address, 3.1, fixtures);

        //We expect that this cycle hasn't netted anything in anchor terms. A 3% price increase is balanced by a 3% fee.
        expect(anchorBalance).to.lt(expandTo18Decimals(token1Amount/200));

    });


})
