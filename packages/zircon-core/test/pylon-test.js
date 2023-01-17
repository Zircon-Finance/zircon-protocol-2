// const { expect } = require("chai");
// const { ethers } = require('hardhat');
// const assert = require("assert");
// const {BigNumber} = require("ethers");
// const {expandTo18Decimals, getAmountOut, format, sqrt, findDeviation, calculateOmega, getFtv} = require("./shared/utils");
// const {coreFixtures, librarySetup} = require("./shared/fixtures");
// const {initPylon, printState, printPoolTokens, printPairState, getPTPrice, burn, burnAsync, forwardTime, unblockOracle, mintAsync, mintSync, setPrice, updateMint,
// } = require("./shared/commands");
// const {generateJSONFile} = require("./shared/generate-json-sdk-test");
// const TEST_ADDRESSES = [
//     '0x1000000000000000000000000000000000000000',
//     '0x2000000000000000000000000000000000000000'
// ]
//
// let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
//     pylonInstance, poolTokenInstance0, poolTokenInstance1,
//     factoryInstance, deployerAddress, account2, account,
//     pair, library;
//
// const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
// const DECIMALS = ethers.BigNumber.from(10).pow(18)
// const IMPRECISION_TOLERANCE = ethers.BigNumber.from(10).pow(6) //We expect tests to be precise to at least 1 billionth, should be enough.
// const overrides = {
//     gasLimit: 9999999
// }
//
// async function addLiquidity(token0Amount, token1Amount) {
//     await token0.transfer(pair.address, token0Amount)
//     await token1.transfer(pair.address, token1Amount)
//     await pair.mint(account.address)
// }
//
// describe("Pylon", () => {
//     before(async () => {
//         library = await librarySetup()
//     })
//
//     after(async () => {
//         await generateJSONFile()
//     })
//
//     const init = async (token0Amount, token1Amount, pylonPercentage) => {
//         // Let's initialize the Pool, inserting some liquidity in it
//         let fixtures = await initPylon(token0Amount, token1Amount, pylonPercentage, library)
//         factoryInstance = fixtures.factoryInstance
//         token0 = fixtures.token0
//         token1 = fixtures.token1
//         poolTokenInstance0 = fixtures.poolTokenInstance0
//         poolTokenInstance1 = fixtures.poolTokenInstance1
//         pair = fixtures.pair
//         pylonInstance = fixtures.pylonInstance
//         factoryPylonInstance = fixtures.factoryPylonInstance
//         factoryEnergyInstance = fixtures.factoryEnergyInstance
//         account = fixtures.account
//         account2 = fixturd
//         return fixtures
//     }
//
//     //Let's try to calculate some cases for pylon
//     const mintTestCases = [
//         [10, 20, '4762509926821186', '4749990617651023','5099989902573941079','9999999999999999000', false],
//         [20, 10, '4749999999999999', '4762499999999999','9999999999999999998', '5099989999999999000', true],
//         [10, 20, '2374999999999999', '9525000000000000','4999999999999999999', '10049994999999999000', true],
//         [20, 20, '9525009926820697', '4749995308820878','10099989951286946806', '9999999999999999000', false],
//         [2000, 2000, '475000000000000000', '952500000000000000','1000000000000000000000', '1009998999999999999000', true],
//     ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : n)))
//     mintTestCases.forEach((mintCase, i) => {
//         it(`mintPylon:${i}`, async () => {
//             const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor] = mintCase
//             // Add some liquidity to the Pair...
//             let fixtures = await init(token0Amount, token1Amount, 50);
//
//             await printState(fixtures, true)
//             // Transferring some liquidity to pylon
//
//             if (isAnchor) {
//                 await mintSync(account.address, token0Amount/200, isAnchor, fixtures, false)
//             }else{
//                 await mintSync(account.address, token1Amount/200, isAnchor, fixtures, false)
//             }
//
//             await forwardTime(ethers.provider, 50);
//             await updateMint(fixtures);
//
//             await printState(fixtures, true)
//             await printPairState(fixtures, true);
//
//             let poolTokens = await printPoolTokens(account.address, fixtures, true);
//
//             expect(poolTokens.pt1).to.eq(expectedOutputAmount1);
//             expect(poolTokens.pt0).to.eq(expectedOutputAmount0);
//             // Anchor
//         })
//     })  // Let's try to calculate some cases for pylon
//
//
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
//     it('Fee assignment + mu Test', async function () {
//         let token0Amount = 1700
//         let token1Amount = 5300
//         let fixtures = await init(token0Amount, token1Amount, 1)
//
//         //await expect(gamma).to.eq(ethers.BigNumber.from("277500000000000000")) // 473684210526315789
//
//         //We swap a token and then reverse it to create fees while having the same gamma
//
//         let initialVab = await pylonInstance.virtualAnchorBalance();
//         let initialVfb = await pylonInstance.virtualFloatBalance();
//         let initialp2y = await pylonInstance.p2y();
//
//         let pairResIni = (await printPairState(fixtures, true)).pairResT;
//
//         //Dump to 33% and back to generate some fees
//         await setPrice(account.address, 2.0, fixtures);
//         await setPrice(account.address, 3.1, fixtures);
//
//         let results = await printPairState(fixtures, true);
//         let pairRes = results.pairResT;
//
//         let kprime = pairRes[0].mul(pairRes[1]);
//         let k = pairResIni[0].mul(pairResIni[1]);
//
//         //Minor fix to formulas: it was wrong to divide by sqrtK since you overestimated feeToAnchor
//
//         let feePercentage = ((sqrt(kprime).sub(sqrt(k))).mul(DECIMALS).div(sqrt(kprime)))
//             .mul(5).div(6); //Adjusting for mintFee
//
//
//         console.log("feePercentage", format(feePercentage));
//
//         expect(kprime).to.gt(k);
//
//         let mu = await pylonInstance.muMulDecimals();
//
//         let feeToAnchor = results.pairResT[1].mul(2).mul(feePercentage).div(DECIMALS)
//             .mul(results.ptb).div(results.ptt)
//             .mul(mu).div(DECIMALS);
//         let feeToFloat = results.pairResT[1].mul(2).mul(feePercentage)
//             .mul(results.ptb).div(results.ptt)
//             .mul(DECIMALS.sub(mu)).div(DECIMALS);
//         let vfbAdd = (results.pairResT[0].mul(2).mul(feePercentage).div(DECIMALS)
//             .mul(results.ptb).div(results.ptt)
//             .mul(DECIMALS.sub(mu))).div(DECIMALS);
//
//         console.log("mu before new token: ", format(mu));
//         console.log("gamma before new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
//         console.log("vab before new token: ", ethers.utils.formatEther(await pylonInstance.virtualAnchorBalance()));
//
//
//
//         //Two updates to retrieve the final gamma
//         await updateMint(fixtures);
//         await updateMint(fixtures);
//
//         await printState(fixtures, true)
//
//
//         console.log("mu after assignment mint: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
//         console.log("gamma after new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
//         let vab = await pylonInstance.virtualAnchorBalance();
//         let vfb = await pylonInstance.virtualFloatBalance();
//         let p2y = await pylonInstance.p2y();
//
//
//         console.log("vab after new token: ", ethers.utils.formatEther(vab));
//         //We swapped slightly less than 1% of the pool, vab should be increased by
//         // 50% (gamma) * 1% (swap amount) * 0.3% (fee) * 1% (pylon ownership) * 5/6 (mintfee)
//         let vabDeviation = findDeviation(vab, initialVab.add(feeToAnchor));
//         expect(vabDeviation).to.lt(IMPRECISION_TOLERANCE);
//         let vfbDeviation = findDeviation(vfb, initialVfb.add(vfbAdd));
//         console.log("vfb, initialVfb, vfbAdd", format(vfb), format(initialVfb), format(vfbAdd))
//         expect(vfbDeviation).to.lt(IMPRECISION_TOLERANCE.mul(100)); //TODO: Check why this one fails with default tolerance
//         let p2yDeviation = findDeviation(p2y, initialp2y.add(feeToFloat));
//         expect(p2yDeviation).to.lt(IMPRECISION_TOLERANCE);
//
//
//     });
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
//         expect(thisBlockEMA).to.eq(ethers.BigNumber.from("99384161431630347"));
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
//
//     it('AnchorK async Test', async function () {
//         let token0Amount = expandTo18Decimals(1700)
//         let token1Amount = expandTo18Decimals(5300)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount.div(1))
//         await token1.transfer(pylonInstance.address, token1Amount.div(1))
//
//         // Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         let pairResIni = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//
//         // Pylon initialized.
//
//         // //add async anchor to trigger change in anchorK
//
//         await token0.transfer(pylonInstance.address, token0Amount.div(3))
//         await token1.transfer(pylonInstance.address, token1Amount.div(3))
//
//         await pylonInstance.mintAsync(account.address, true);
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //Dump float to trigger isLineFormula
//
//         let pairResk = await pair.getReserves();
//         //console.log("K before swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//
//         // 25% of pool swap
//         let input = pairRes[0].div(2);
//         await token0.transfer(pair.address, input)
//
//         let balance = await token0.balanceOf(account.address);
//         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//         let balance1 = await token1.balanceOf(account.address);
//         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//         let outcome = getAmountOut(input, pairRes[0], pairRes[1])
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//
//         let balanceNew = await token0.balanceOf(account.address);
//         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//         let balance1New = await token1.balanceOf(account.address);
//         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after swapping: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after swapping: ", ethers.utils.formatEther(pairRes[1]))
//
//
//         //force update
//
//         console.log("sent anchors:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         let initBlock = await ethers.provider.getBlockNumber();
//         let initTimestamp = (await ethers.provider.getBlock(initBlock)).timestamp;
//         console.log("initial Timestamp", initTimestamp);
//         //wait a bunch of time to regularize oracle
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         initBlock = await ethers.provider.getBlockNumber();
//         initTimestamp = (await ethers.provider.getBlock(initBlock)).timestamp;
//         console.log("Timestamp after pause", initTimestamp);
//
//
//         //Now we add a lot of async liquidity
//         //We record derVFB before and Float claim for the initial PTs
//         // //Then we check anchorK and Float claim again
//
//         let pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         let tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//         let gamma = await pylonInstance.gammaMulDecimals();
//
//         let derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         pylonRes = await pylonInstance.getSyncReserves();
//         derVfb = derVfb.add(pylonRes[1]);
//         console.log("derVfb before, with reserve", ethers.utils.formatEther(derVfb));
//
//         console.log("derVfb before mints", ethers.utils.formatEther(derVfb));
//
//         // console.log("anchorK before mints", ethers.utils.formatEther(anchorK));
//         console.log("vab before mints", ethers.utils.formatEther(vabF));
//         console.log("gamma before mints", ethers.utils.formatEther(gamma));
//
//
//         let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address)
//
//         console.log("ptBalance before mints", ethers.utils.formatEther(initialFloatPtBalance));
//
//         let floatSum = ethers.BigNumber.from('000000000000000000');
//         //We add async liquidity in cycles
//         for(let i = 0; i < 30; i++) {
//             pairResT = await pair.getReserves();
//             let floatAdd = (pairResT[0].mul(ptb).div(ptt)).div(20)
//             let anchorAdd = (pairResT[1].mul(ptb).div(ptt)).div(20)
//             ptb = await pair.balanceOf(pylonInstance.address);
//             ptt = await pair.totalSupply();
//
//             floatSum = floatSum.add(floatAdd);
//
//             pylonRes = await pylonInstance.getSyncReserves();
//             let adjVab = (await pylonInstance.virtualAnchorBalance()).sub(pylonRes[1]);
//
//
//
//             let pair1Translated = pairResT[1].mul(ptb).div(ptt);
//
//             console.log("adjVab, pair1Translated", ethers.utils.formatEther(adjVab), ethers.utils.formatEther(pair1Translated))
//
//             if(i % 2 != 0) {
//                 await token1.transfer(pylonInstance.address, anchorAdd)
//                 await token0.transfer(pylonInstance.address, anchorAdd.mul(pairResT[0]).div(pairResT[1]))
//                 await pylonInstance.mintAsync(account.address, true);
//             } else {
//                 await token0.transfer(pylonInstance.address, floatAdd)
//                 await token1.transfer(pylonInstance.address, floatAdd.mul(pairResT[1]).div(pairResT[0]))
//                 await pylonInstance.mintAsync(account.address, false);
//             }
//
//             // // anchorK = await pylonInstance.anchorKFactor();
//             let isLineFormula = await pylonInstance.formulaSwitch();
//             // console.log("anchorK after mint ", i, ethers.utils.formatEther(anchorK));
//             console.log("isLineFormula after mint ", i, isLineFormula);
//
//             await ethers.provider.send("hardhat_mine", ['0x30']);
//         }
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //Now we check what happened
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after mints", ethers.utils.formatEther(derVfb));
//         pylonRes = await pylonInstance.getSyncReserves();
//         derVfb = derVfb.add(pylonRes[1]);
//         console.log("derVfb with reserve", ethers.utils.formatEther(derVfb));
//         // console.log("anchorK after mints", ethers.utils.formatEther(anchorK));
//         console.log("vab after mints", ethers.utils.formatEther(vabF));
//         console.log("gamma after mints", ethers.utils.formatEther(gamma));
//         console.log("floatSum after mints", ethers.utils.formatEther(floatSum));
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         let pair0Translated = pairResT[0].mul(ptb).div(ptt);
//         let pair1Translated = pairResT[1].mul(ptb).div(ptt);
//
//         console.log("pair0 After", ethers.utils.formatEther(pair0Translated));
//         console.log("pair1 After", ethers.utils.formatEther(pair1Translated));
//
//
//         //We now burn the initial share and see how much we get back
//
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         await poolTokenInstance0.transfer(pylonInstance.address, initialFloatPtBalance);
//         await pylonInstance.burn(account.address, false);
//
//         let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//         expect(floatsReceived).to.eq(ethers.BigNumber.from('1623721167834108967063'));
//
//     });
//
//
//     it('AnchorK float add/remove test', async function () {
//         let token0Amount = expandTo18Decimals(1700)
//         let token1Amount = expandTo18Decimals(5300)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount.div(1))
//         await token1.transfer(pylonInstance.address, token1Amount.div(1))
//
//         // Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         let pairResIni = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//
//         // Pylon initialized.
//
//
//         //We dump a bit to see what happens
//
//
//         let input = pairResIni[0].mul(2);
//         await token0.transfer(pair.address, input)
//
//         let balance = await token0.balanceOf(account.address);
//         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//         let balance1 = await token1.balanceOf(account.address);
//         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//         let outcome = getAmountOut(input, pairResIni[0], pairResIni[1])
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//
//         let balanceNew = await token0.balanceOf(account.address);
//         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//         let balance1New = await token1.balanceOf(account.address);
//         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after swapping: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after swapping: ", ethers.utils.formatEther(pairRes[1]))
//
//         //force update
//
//         console.log("sent update:", ethers.utils.formatEther(token0Amount.div(100000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(100000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         // //Burn good chunk of float, AnchorK should increase significantly
//
//
//         let pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         let tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//         let gamma = await pylonInstance.gammaMulDecimals();
//
//         let derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb before burn", ethers.utils.formatEther(derVfb));
//         pylonRes = await pylonInstance.getSyncReserves();
//         derVfb = derVfb.add(pylonRes[1]);
//         console.log("derVfb with reserve", ethers.utils.formatEther(derVfb));
//         // console.log("anchorK before burn", ethers.utils.formatEther(anchorK));
//         console.log("vab before burn", ethers.utils.formatEther(vabF));
//         console.log("gamma before burn", ethers.utils.formatEther(gamma));
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address);
//
//         console.log("Sent Float PTs: ", ethers.utils.formatEther(initialFloatPtBalance.div(3)));
//         await poolTokenInstance0.transfer(pylonInstance.address, initialFloatPtBalance.div(3));
//         await pylonInstance.burn(account.address, false);
//
//         let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent update:", ethers.utils.formatEther(token1Amount.div(10000)));
//         await token1.transfer(pylonInstance.address, token1Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after burn", ethers.utils.formatEther(derVfb));
//         pylonRes = await pylonInstance.getSyncReserves();
//         derVfb = derVfb.add(pylonRes[1]);
//         console.log("derVfb with reserve", ethers.utils.formatEther(derVfb));
//         // console.log("anchorK after burn", ethers.utils.formatEther(anchorK));
//         console.log("vab after burn", ethers.utils.formatEther(vabF));
//         console.log("gamma after burn", ethers.utils.formatEther(gamma));
//
//
//         // expect(anchorK).to.eq(ethers.BigNumber.from('1276793153351156759'));
//         // //add async anchor to trigger change in anchorK
//
//         // await token0.transfer(pylonInstance.address, token0Amount.div(3))
//         // await token1.transfer(pylonInstance.address, token1Amount.div(3))
//         //
//         // await pylonInstance.mintAsync(account.address, true);
//         //
//         // await ethers.provider.send("hardhat_mine", ['0x30']);
//         //
//         // //Dump float to trigger isLineFormula
//         //
//         // let pairResk = await pair.getReserves();
//         // //console.log("K before swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//         //
//         // // 25% of pool swap
//         // let input = pairRes[0].div(2);
//         // await token0.transfer(pair.address, input)
//         //
//         // let balance = await token0.balanceOf(account.address);
//         // console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//         // let balance1 = await token1.balanceOf(account.address);
//         // console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//         //
//         // let outcome = getAmountOut(input, pairRes[0], pairRes[1])
//         // await pair.swap(0, outcome, account.address, '0x', overrides)
//         //
//         // let balanceNew = await token0.balanceOf(account.address);
//         // console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//         // let balance1New = await token1.balanceOf(account.address);
//         // console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//         //
//         // pairRes = await pair.getReserves();
//         // console.log("Pylon Pair Reserve0 after swapping: ", ethers.utils.formatEther(pairRes[0]))
//         // console.log("Pylon Pair Reserve1 after swapping: ", ethers.utils.formatEther(pairRes[1]))
//         //
//         //
//         // //force update
//         //
//         // console.log("sent anchors:", ethers.utils.formatEther(token0Amount.div(10000)));
//         // await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         // await pylonInstance.mintPoolTokens(account.address, true);
//         //
//         // await ethers.provider.send("hardhat_mine", ['0x30']);
//         //
//         // //Now we add a lot of async liquidity
//         // //We record derVFB before and Float claim for the initial PTs
//         // // //Then we check anchorK and Float claim again
//         //
//         // let pairResT = await pair.getReserves();
//         //
//         // ptb = await pair.balanceOf(pylonInstance.address);
//         // ptt = await pair.totalSupply();
//         //
//         // let tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // // let anchorK = await pylonInstance.anchorKFactor();
//         // let vabF = await pylonInstance.virtualAnchorBalance();
//         // let gamma = await pylonInstance.gammaMulDecimals();
//         //
//         // let derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//         //
//         // pylonRes = await pylonInstance.getSyncReserves();
//         // derVfb = derVfb.add(pylonRes[1]);
//         // console.log("derVfb before, with reserve", ethers.utils.formatEther(derVfb));
//         //
//         // console.log("derVfb before mints", ethers.utils.formatEther(derVfb));
//         //
//         // // console.log("anchorK before mints", ethers.utils.formatEther(anchorK));
//         // console.log("vab before mints", ethers.utils.formatEther(vabF));
//         // console.log("gamma before mints", ethers.utils.formatEther(gamma));
//         //
//         //
//         // let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address)
//         //
//         // console.log("ptBalance before mints", ethers.utils.formatEther(initialFloatPtBalance));
//         //
//         // let floatSum = ethers.BigNumber.from('000000000000000000');
//         // //We add async liquidity in cycles
//         // for(let i = 0; i < 30; i++) {
//         //     pairResT = await pair.getReserves();
//         //     let floatAdd = (pairResT[0].mul(ptb).div(ptt)).div(20)
//         //     let anchorAdd = (pairResT[1].mul(ptb).div(ptt)).div(20)
//         //     ptb = await pair.balanceOf(pylonInstance.address);
//         //     ptt = await pair.totalSupply();
//         //
//         //     floatSum = floatSum.add(floatAdd);
//         //
//         //     pylonRes = await pylonInstance.getSyncReserves();
//         //     let adjVab = (await pylonInstance.virtualAnchorBalance()).sub(pylonRes[1]);
//         //
//         //
//         //
//         //     let pair1Translated = pairResT[1].mul(ptb).div(ptt);
//         //
//         //     console.log("adjVab, pair1Translated", ethers.utils.formatEther(adjVab), ethers.utils.formatEther(pair1Translated))
//         //
//         //     if(i % 2 != 0) {
//         //         await token1.transfer(pylonInstance.address, anchorAdd)
//         //         await token0.transfer(pylonInstance.address, anchorAdd.mul(pairResT[0]).div(pairResT[1]))
//         //         await pylonInstance.mintAsync(account.address, true);
//         //     } else {
//         //         await token0.transfer(pylonInstance.address, floatAdd)
//         //         await token1.transfer(pylonInstance.address, floatAdd.mul(pairResT[1]).div(pairResT[0]))
//         //         await pylonInstance.mintAsync(account.address, false);
//         //     }
//         //
//         // // //     anchorK = await pylonInstance.anchorKFactor();
//         //     let isLineFormula = await pylonInstance.formulaSwitch();
//         // //     console.log("anchorK after mint ", i, ethers.utils.formatEther(anchorK));
//         //     console.log("isLineFormula after mint ", i, isLineFormula);
//         //
//         //     await ethers.provider.send("hardhat_mine", ['0x30']);
//         // }
//         //
//         // await ethers.provider.send("hardhat_mine", ['0x30']);
//         //
//         // //Now we check what happened
//         //
//         //
//         // pairResT = await pair.getReserves();
//         //
//         // ptb = await pair.balanceOf(pylonInstance.address);
//         // ptt = await pair.totalSupply();
//         //
//         // tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // // anchorK = await pylonInstance.anchorKFactor();
//         // vabF = await pylonInstance.virtualAnchorBalance();
//         // gamma = await pylonInstance.gammaMulDecimals();
//         //
//         // derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//         //
//         // console.log("derVfb after mints", ethers.utils.formatEther(derVfb));
//         // pylonRes = await pylonInstance.getSyncReserves();
//         // derVfb = derVfb.add(pylonRes[1]);
//         // console.log("derVfb with reserve", ethers.utils.formatEther(derVfb));
//         // // console.log("anchorK after mints", ethers.utils.formatEther(anchorK));
//         // console.log("vab after mints", ethers.utils.formatEther(vabF));
//         // console.log("gamma after mints", ethers.utils.formatEther(gamma));
//         // console.log("floatSum after mints", ethers.utils.formatEther(floatSum));
//         //
//         // ptb = await pair.balanceOf(pylonInstance.address);
//         // ptt = await pair.totalSupply();
//         //
//         // let pair0Translated = pairResT[0].mul(ptb).div(ptt);
//         // let pair1Translated = pairResT[1].mul(ptb).div(ptt);
//         //
//         // console.log("pair0 After", ethers.utils.formatEther(pair0Translated));
//         // console.log("pair1 After", ethers.utils.formatEther(pair1Translated));
//         //
//         //
//         // //We now burn the initial share and see how much we get back
//         //
//         //
//         // balancePreBurn = await token0.balanceOf(account.address)
//         //
//         // await poolTokenInstance0.transfer(pylonInstance.address, initialFloatPtBalance);
//         // await pylonInstance.burn(account.address, false);
//         //
//         // let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         // console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//         //
//         // expect(floatsReceived).to.eq(ethers.BigNumber.from('1623721167834108967063'));
//
//     });
//
//
//     it('AnchorK float add/remove async test', async function () {
//         let token0Amount = expandTo18Decimals(1700)
//         let token1Amount = expandTo18Decimals(5300)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount.div(1))
//         await token1.transfer(pylonInstance.address, token1Amount.div(1))
//
//         // Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         let pairResIni = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//
//         // Pylon initialized.
//
//
//         //We dump a bit to see what happens
//
//
//         let input = pairResIni[0].mul(2);
//         await token0.transfer(pair.address, input)
//
//         let balance = await token0.balanceOf(account.address);
//         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//         let balance1 = await token1.balanceOf(account.address);
//         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//         let outcome = getAmountOut(input, pairResIni[0], pairResIni[1])
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//
//         let balanceNew = await token0.balanceOf(account.address);
//         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//         let balance1New = await token1.balanceOf(account.address);
//         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after swapping: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after swapping: ", ethers.utils.formatEther(pairRes[1]))
//
//         //force update
//
//         console.log("sent update:", ethers.utils.formatEther(token0Amount.div(100000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(100000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         // //Burn good chunk of float, AnchorK should increase significantly
//
//
//         let pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         let tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//         let gamma = await pylonInstance.gammaMulDecimals();
//
//         let derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb before burn", ethers.utils.formatEther(derVfb));
//         pylonRes = await pylonInstance.getSyncReserves();
//         derVfb = derVfb.add(pylonRes[1]);
//         console.log("derVfb with reserve", ethers.utils.formatEther(derVfb));
//         // console.log("anchorK before burn", ethers.utils.formatEther(anchorK));
//         console.log("vab before burn", ethers.utils.formatEther(vabF));
//         console.log("gamma before burn", ethers.utils.formatEther(gamma));
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         let initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address);
//
//         console.log("Sent Float PTs: ", ethers.utils.formatEther(initialFloatPtBalance.div(3)));
//         await poolTokenInstance0.transfer(pylonInstance.address, initialFloatPtBalance.div(3));
//         await pylonInstance.burnAsync(account.address, false);
//
//         let floatsReceived = (await token0.balanceOf(account.address)).sub(balancePreBurn);
//         console.log("Floats received: ", ethers.utils.formatEther(floatsReceived));
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent update:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after burn", ethers.utils.formatEther(derVfb));
//         pylonRes = await pylonInstance.getSyncReserves();
//         derVfb = derVfb.add(pylonRes[1]);
//         console.log("derVfb with reserve", ethers.utils.formatEther(derVfb));
//         // console.log("anchorK after burn", ethers.utils.formatEther(anchorK));
//         console.log("vab after burn", ethers.utils.formatEther(vabF));
//         console.log("gamma after burn", ethers.utils.formatEther(gamma));
//
//
//         // expect(anchorK).to.eq(ethers.BigNumber.from('1395788921657460474'));
//
//
//         // //Now we add back the same amount and see what happens to our share + anchorK
//
//         console.log("sent update:", ethers.utils.formatEther(token0Amount.div(100000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(100000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         initialFloatPtBalance = await poolTokenInstance0.balanceOf(account.address);
//
//         console.log("sent float value:", ethers.utils.formatEther(token0Amount.div(3)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(6))
//         await token1.transfer(pylonInstance.address, (token0Amount.mul(pairResT[1]).div(pairResT[0])).div(6))
//         await pylonInstance.mintAsync(account.address, false);
//
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after re-mint", ethers.utils.formatEther(derVfb));
//         pylonRes = await pylonInstance.getSyncReserves();
//         derVfb = derVfb.add(pylonRes[1]);
//         console.log("derVfb with reserve", ethers.utils.formatEther(derVfb));
//         // console.log("anchorK after", ethers.utils.formatEther(anchorK));
//         console.log("vab after", ethers.utils.formatEther(vabF));
//         console.log("gamma after", ethers.utils.formatEther(gamma));
//
//         let newFptBalance = await poolTokenInstance0.balanceOf(account.address);
//
//
//         //Force update and now we try to extract it back and see how much we get.
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent update:", ethers.utils.formatEther(token0Amount.div(100000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(100000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         console.log("Sent Float PTs: ", ethers.utils.formatEther(newFptBalance.sub(initialFloatPtBalance)));
//         await poolTokenInstance0.transfer(pylonInstance.address, newFptBalance.sub(initialFloatPtBalance));
//         await pylonInstance.burnAsync(account.address, false);
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent update:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//
//         let floatValue = ((await token0.balanceOf(account.address)).sub(balancePreBurn)).mul(2);
//         console.log("float value received", ethers.utils.formatEther(floatValue))
//
//
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after new burn", ethers.utils.formatEther(derVfb));
//         pylonRes = await pylonInstance.getSyncReserves();
//         derVfb = derVfb.add(pylonRes[1]);
//         console.log("derVfb with reserve", ethers.utils.formatEther(derVfb));
//         // console.log("anchorK after new burn", ethers.utils.formatEther(anchorK));
//         console.log("vab after new burn", ethers.utils.formatEther(vabF));
//         console.log("gamma after new burn", ethers.utils.formatEther(gamma));
//
//
//     });
//
//
//     it('burn extraction line formula test', async function () {
//         let token0Amount = expandTo18Decimals(1700)
//         let token1Amount = expandTo18Decimals(5300)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount.div(100))
//         await token1.transfer(pylonInstance.address, token1Amount.div(100))
//
//         // Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount.div(100)));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount.div(100)));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         let pairResIni = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//
//         // Pylon initialized.
//
//         let pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         let tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//         let gamma = await pylonInstance.gammaMulDecimals();
//
//         let derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb before async mint", ethers.utils.formatEther(derVfb));
//
//         //we dump a lot to trigger line formula
//
//         let pairResk = await pair.getReserves();
//         console.log("K before swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//
//         // 25% of pool swap
//         let input = pairResk[0].mul(2);
//         await token0.transfer(pair.address, input)
//
//         let balance = await token0.balanceOf(account.address);
//         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//         let balance1 = await token1.balanceOf(account.address);
//         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//         let outcome = getAmountOut(input, pairRes[0], pairRes[1])
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//
//         let balanceNew = await token0.balanceOf(account.address);
//         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//         let balance1New = await token1.balanceOf(account.address);
//         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after swapping: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after swapping: ", ethers.utils.formatEther(pairRes[1]))
//
//
//         pairResk = await pair.getReserves();
//         console.log("K after swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//
//         let totalApt = await poolTokenInstance0.totalSupply();
//
//
//         console.log("total fpt before mints:", ethers.utils.formatEther(totalApt));
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent update floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//         pairResT = await pair.getReserves();
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         pylonRes = await pylonInstance.getSyncReserves();
//
//         let omega = (ethers.BigNumber.from('1000000000000000000').sub(gamma)).mul(tpv).div(vabF.sub(pylonRes[1]));
//         console.log("omega before mints", ethers.utils.formatEther(omega))
//         console.log("gamma before mint", ethers.utils.formatEther(gamma))
//
//         let translatedRes1 = pairResT[1].mul(ptb).div(ptt);
//         console.log("vab", ethers.utils.formatEther(vabF))
//         console.log("trRes1", ethers.utils.formatEther(translatedRes1))
//
//
//         //We mint some Async to make sure we send with correct proportions
//
//         let initialPtBalance = await poolTokenInstance0.balanceOf(account.address)
//         //Now we deposit a large amount of Anchors to test Omega
//         //We do it with async 50/50 to make sure we avoid slippage distortions
//
//         await token0.transfer(pylonInstance.address, pairResk[0].div(10))
//         await token1.transfer(pylonInstance.address, pairResk[1].div(10))
//
//         console.log("1/2 floats sent for minting: ", ethers.utils.formatEther(pairResk[0].div(10)));
//         ptt = await pair.totalSupply();
//         console.log("ptt before async mint", ethers.utils.formatEther(ptt));
//
//
//         // await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//         await pylonInstance.mintAsync(account.address, false);
//         //
//         // ptt = await pair.totalSupply();
//         //
//         // console.log("ptt after async mint", ethers.utils.formatEther(ptt));
//
//
//
//
//         //force update
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent update floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//         pairResT = await pair.getReserves();
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         pylonRes = await pylonInstance.getSyncReserves();
//
//         omega = (ethers.BigNumber.from('1000000000000000000').sub(gamma)).mul(tpv).div(vabF.sub(pylonRes[1]));
//         console.log("omega after first mint", ethers.utils.formatEther(omega))
//         console.log("gamma after first mint", ethers.utils.formatEther(gamma))
//
//
//         translatedRes1 = pairResT[1].mul(ptb).div(ptt);
//         console.log("vab", ethers.utils.formatEther(vabF))
//         console.log("trRes1", ethers.utils.formatEther(translatedRes1))
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after async mint", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after async mint", ethers.utils.formatEther(derVfb));
//
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         let balancePreBurn = await token0.balanceOf(account.address)
//
//         let aptBalance = await poolTokenInstance0.balanceOf(account.address)
//         let oldVab = await pylonInstance.virtualAnchorBalance();
//         totalApt = await poolTokenInstance0.totalSupply();
//
//
//         console.log("total fpt:", ethers.utils.formatEther(totalApt));
//         aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         console.log("fpt sent:", ethers.utils.formatEther(aptBalance.div(100)));
//
//         //We test with burnAsync to avoid reserve distortions
//         await poolTokenInstance0.transfer(pylonInstance.address, aptBalance.div(100));
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         //await expect(pylonInstance.burnAsync(account.address, true)).to.be.revertedWith("Z: P")
//         await pylonInstance.burnAsync(account.address, false)
//
//
//
//         ptt = await pair.totalSupply();
//         console.log("uniptt after burn", ethers.utils.formatEther(ptt));
//
//         pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after first burn: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after first burn: ", ethers.utils.formatEther(pylonRes[1]));
//
//
//         let balancePostBurn = await token0.balanceOf(account.address);
//
//         console.log("Received float tokens after burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//         let newVab = await pylonInstance.virtualAnchorBalance();
//         let totalAptnew = await poolTokenInstance1.totalSupply();
//
//         console.log("///burning original fpts")
//
//
//         //force update
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent anchors:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after first burn", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after first burn", ethers.utils.formatEther(derVfb));
//
//
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         // aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         //
//         // aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         //We test with burnAsync to avoid reserve distortions
//         //Supposed to cover about 2% of 1% of balance, should be easily covered
//
//
//         let oriBalance = ethers.BigNumber.from('17000000000000000000');
//         console.log("original balance sent:", ethers.utils.formatEther(oriBalance));
//
//         await poolTokenInstance0.transfer(pylonInstance.address, oriBalance)
//
//
//         //pairTokenBalanceOld = await pair.balanceOf(energyAddress);
//         //console.log("Pairtoken reserve before second burn: ", ethers.utils.formatEther(pairTokenBalanceOld));
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//
//         await pylonInstance.burnAsync(account.address, false);
//
//         balancePostBurn = await token0.balanceOf(account.address);
//
//         console.log("Received float tokens after second burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//
//         //force update
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("\nanchork after second burn", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after second burn", ethers.utils.formatEther(derVfb));
//
//
//
//         //original PTs should be worth about 17
//         expect(balancePostBurn.sub(balancePreBurn)).to.eq(ethers.BigNumber.from('8528083659117670689'))
//
//
//
//         //Now we add some float liquidity and see if the amount withdrawn is the same
//
//         //
//         // //now we dump a bit more to see if it taps into the Anchors
//         //
//         // await ethers.provider.send("hardhat_mine", ['0x30']);
//         //
//         //
//         //
//         //
//         // input = token0Amount.div(8);
//         // await token0.transfer(pair.address, input)
//         // pairRes = await pair.getReserves();
//         //
//         // outcome = getAmountOut(input, pairRes[0], pairRes[1])
//         //
//         // await pair.swap(0, outcome, account.address, '0x', overrides)
//         //
//         // pairRes = await pair.getReserves();
//         // console.log("Pylon Pair Reserve0 after dumping: ", ethers.utils.formatEther(pairRes[0]))
//         // console.log("Pylon Pair Reserve1 after dumping: ", ethers.utils.formatEther(pairRes[1]))
//         //
//         // balancePreBurn = await token1.balanceOf(account.address)
//         //
//         // // aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         // //
//         // // aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//         //
//         // //We test with burnAsync to avoid reserve distortions
//         // //Supposed to cover about 2% of 1% of balance, should be easily covered
//         // console.log("AptBalance:", ethers.utils.formatEther(aptBalance.div(100)));
//         //
//         // await poolTokenInstance1.transfer(pylonInstance.address, aptBalance.div(100));
//         //
//         // // let anchorBalance = await token1.balanceOf(energyAddress);
//         // // console.log("Anchor balance old", ethers.utils.formatEther(anchorBalance))
//         //
//         // // pairTokenBalanceOld = await pair.balanceOf(energyAddress);
//         // // console.log("Pairtoken reserve before third burn: ", ethers.utils.formatEther(pairTokenBalanceOld));
//         //
//         //
//         // await pylonInstance.burnAsync(account.address, true);
//         //
//         // pairTokenBalanceNew = await pair.balanceOf(energyAddress);
//         // console.log("Pairtoken reserve after third burn: ", ethers.utils.formatEther(pairTokenBalanceNew));
//         //
//         // balancePostBurn = await token1.balanceOf(account.address);
//         //
//         // console.log("Received anchor tokens after final omega burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//         //
//         // let anchorBalanceNew = await token1.balanceOf(energyAddress);
//         // console.log("Anchor balance new", ethers.utils.formatEther(anchorBalanceNew))
//         //
//         //
//         // //force update
//         // await ethers.provider.send("hardhat_mine", ['0x30']);
//         //
//         // console.log("sent floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         // await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         // await pylonInstance.mintPoolTokens(account.address, true);
//         //
//         //
//         // pairResT = await pair.getReserves();
//         //
//         // ptb = await pair.balanceOf(pylonInstance.address);
//         // ptt = await pair.totalSupply();
//         //
//         // tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // // anchorK = await pylonInstance.anchorKFactor();
//         // vabF = await pylonInstance.virtualAnchorBalance();
//         // gamma = await pylonInstance.gammaMulDecimals();
//         //
//         // derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//         //
//         //
//         // console.log("\nderVfb after final burn", ethers.utils.formatEther(derVfb));
//         // // console.log("anchork after final burn", ethers.utils.formatEther(anchorK));
//         //
//         // expect(balancePostBurn.sub(balancePreBurn)).to.eq(ethers.BigNumber.from('1038508513223823433'))
//
//     });
//
//
//     it('mint async 100 test', async function () {
//         let token0Amount = expandTo18Decimals(1700)
//         let token1Amount = expandTo18Decimals(5300)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount.div(100))
//         await token1.transfer(pylonInstance.address, token1Amount.div(100))
//
//         // Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         let pairResIni = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//
//         // Pylon initialized.
//
//         let pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         let tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//         let gamma = await pylonInstance.gammaMulDecimals();
//
//         let derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb before async mint", ethers.utils.formatEther(derVfb));
//
//         //we pump a lot
//
//         let pairResk = await pair.getReserves();
//         console.log("K before swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//
//         // 25% of pool swap
//         let input = pairResk[1].mul(2);
//         await token1.transfer(pair.address, input)
//
//         let balance = await token0.balanceOf(account.address);
//         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//         let balance1 = await token1.balanceOf(account.address);
//         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//         let outcome = getAmountOut(input, pairRes[1], pairRes[0])
//         await pair.swap(outcome, 0, account.address, '0x', overrides)
//
//         let balanceNew = await token0.balanceOf(account.address);
//         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//         let balance1New = await token1.balanceOf(account.address);
//         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after swapping: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after swapping: ", ethers.utils.formatEther(pairRes[1]))
//
//
//         pairResk = await pair.getReserves();
//         console.log("K after swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//
//         let totalApt = await poolTokenInstance0.totalSupply();
//
//
//         console.log("total fpt before mints:", ethers.utils.formatEther(totalApt));
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent update floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//         pairResT = await pair.getReserves();
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         pylonRes = await pylonInstance.getSyncReserves();
//
//         derVfb = pylonRes[0].add(tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000')));
//
//         console.log("dervfb after pump", ethers.utils.formatEther(derVfb));
//
//
//
//         let omega = (ethers.BigNumber.from('1000000000000000000').sub(gamma)).mul(tpv).div(vabF.sub(pylonRes[1]));
//         console.log("omega before mints", ethers.utils.formatEther(omega))
//         console.log("gamma before mint", ethers.utils.formatEther(gamma))
//
//         let translatedRes1 = pairResT[1].mul(ptb).div(ptt);
//         console.log("vab", ethers.utils.formatEther(vabF))
//         console.log("trRes1", ethers.utils.formatEther(translatedRes1))
//
//
//         //We mint some Async to make sure we send with correct proportions
//
//         let initialPtBalance = await poolTokenInstance0.balanceOf(account.address)
//         //Now we deposit a large amount of Anchors to test Omega
//         //We do it with async 50/50 to make sure we avoid slippage distortions
//
//         await token0.transfer(pylonInstance.address, pairResk[0].div(5))
//         //await token1.transfer(pylonInstance.address, pairResk[1].div(10))
//
//         console.log(" floats sent for minting: ", ethers.utils.formatEther(pairResk[0].div(5)));
//         ptt = await pair.totalSupply();
//         console.log("ptt before async mint", ethers.utils.formatEther(ptt));
//
//
//         // await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//         //
//         // ptt = await pair.totalSupply();
//         //
//         // console.log("ptt after async mint", ethers.utils.formatEther(ptt));
//
//
//
//
//         //force update
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent update floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//         pairResT = await pair.getReserves();
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         pylonRes = await pylonInstance.getSyncReserves();
//
//         omega = (ethers.BigNumber.from('1000000000000000000').sub(gamma)).mul(tpv).div(vabF.sub(pylonRes[1]));
//         console.log("omega after first mint", ethers.utils.formatEther(omega))
//         console.log("gamma after first mint", ethers.utils.formatEther(gamma))
//
//
//         translatedRes1 = pairResT[1].mul(ptb).div(ptt);
//         console.log("vab", ethers.utils.formatEther(vabF))
//         console.log("trRes1", ethers.utils.formatEther(translatedRes1))
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after async mint", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after async mint", ethers.utils.formatEther(derVfb));
//
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         let balancePreBurn = await token0.balanceOf(account.address)
//
//         let aptBalance = await poolTokenInstance0.balanceOf(account.address)
//         let oldVab = await pylonInstance.virtualAnchorBalance();
//         totalApt = await poolTokenInstance0.totalSupply();
//
//
//         console.log("total fpt:", ethers.utils.formatEther(totalApt));
//         aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         console.log("fpt sent, 1% of minted:", ethers.utils.formatEther(aptBalance.div(100)));
//
//         //We test with burnAsync to avoid reserve distortions
//         await poolTokenInstance0.transfer(pylonInstance.address, aptBalance.div(100));
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         //await expect(pylonInstance.burnAsync(account.address, true)).to.be.revertedWith("Z: P")
//         await pylonInstance.burnAsync(account.address, false)
//
//
//
//         ptt = await pair.totalSupply();
//         console.log("uniptt after burn", ethers.utils.formatEther(ptt));
//
//         pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after first burn: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after first burn: ", ethers.utils.formatEther(pylonRes[1]));
//
//
//         let balancePostBurn = await token0.balanceOf(account.address);
//
//         console.log("Received float tokens after burn (half of total):", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//         let newVab = await pylonInstance.virtualAnchorBalance();
//         let totalAptnew = await poolTokenInstance1.totalSupply();
//
//         console.log("///burning original fpts")
//
//
//         //force update
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent anchors:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after first burn", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after first burn", ethers.utils.formatEther(derVfb));
//
//
//
//         balancePreBurn = await token0.balanceOf(account.address)
//
//         // aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         //
//         // aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         //We test with burnAsync to avoid reserve distortions
//         //Supposed to cover about 2% of 1% of balance, should be easily covered
//
//
//         let oriBalance = ethers.BigNumber.from('17000000000000000000');
//         console.log("original balance sent:", ethers.utils.formatEther(oriBalance));
//
//         await poolTokenInstance0.transfer(pylonInstance.address, oriBalance)
//
//
//         //pairTokenBalanceOld = await pair.balanceOf(energyAddress);
//         //console.log("Pairtoken reserve before second burn: ", ethers.utils.formatEther(pairTokenBalanceOld));
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//
//         await pylonInstance.burnAsync(account.address, false);
//
//         balancePostBurn = await token0.balanceOf(account.address);
//
//         console.log("Received float tokens after second burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//
//         //force update
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("\nanchork after second burn", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after second burn", ethers.utils.formatEther(derVfb));
//
//
//
//         //original PTs should be worth about 10 due to IL when pumping
//         expect(balancePostBurn.sub(balancePreBurn)).to.eq(ethers.BigNumber.from('5408442312221238729'))
//
//
//
//         //Now we add some float liquidity and see if the amount withdrawn is the same
//
//         //
//         // //now we dump a bit more to see if it taps into the Anchors
//         //
//         // await ethers.provider.send("hardhat_mine", ['0x30']);
//         //
//         //
//         //
//         //
//         // input = token0Amount.div(8);
//         // await token0.transfer(pair.address, input)
//         // pairRes = await pair.getReserves();
//         //
//         // outcome = getAmountOut(input, pairRes[0], pairRes[1])
//         //
//         // await pair.swap(0, outcome, account.address, '0x', overrides)
//         //
//         // pairRes = await pair.getReserves();
//         // console.log("Pylon Pair Reserve0 after dumping: ", ethers.utils.formatEther(pairRes[0]))
//         // console.log("Pylon Pair Reserve1 after dumping: ", ethers.utils.formatEther(pairRes[1]))
//         //
//         // balancePreBurn = await token1.balanceOf(account.address)
//         //
//         // // aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         // //
//         // // aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//         //
//         // //We test with burnAsync to avoid reserve distortions
//         // //Supposed to cover about 2% of 1% of balance, should be easily covered
//         // console.log("AptBalance:", ethers.utils.formatEther(aptBalance.div(100)));
//         //
//         // await poolTokenInstance1.transfer(pylonInstance.address, aptBalance.div(100));
//         //
//         // // let anchorBalance = await token1.balanceOf(energyAddress);
//         // // console.log("Anchor balance old", ethers.utils.formatEther(anchorBalance))
//         //
//         // // pairTokenBalanceOld = await pair.balanceOf(energyAddress);
//         // // console.log("Pairtoken reserve before third burn: ", ethers.utils.formatEther(pairTokenBalanceOld));
//         //
//         //
//         // await pylonInstance.burnAsync(account.address, true);
//         //
//         // pairTokenBalanceNew = await pair.balanceOf(energyAddress);
//         // console.log("Pairtoken reserve after third burn: ", ethers.utils.formatEther(pairTokenBalanceNew));
//         //
//         // balancePostBurn = await token1.balanceOf(account.address);
//         //
//         // console.log("Received anchor tokens after final omega burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//         //
//         // let anchorBalanceNew = await token1.balanceOf(energyAddress);
//         // console.log("Anchor balance new", ethers.utils.formatEther(anchorBalanceNew))
//         //
//         //
//         // //force update
//         // await ethers.provider.send("hardhat_mine", ['0x30']);
//         //
//         // console.log("sent floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         // await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         // await pylonInstance.mintPoolTokens(account.address, true);
//         //
//         //
//         // pairResT = await pair.getReserves();
//         //
//         // ptb = await pair.balanceOf(pylonInstance.address);
//         // ptt = await pair.totalSupply();
//         //
//         // tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // // anchorK = await pylonInstance.anchorKFactor();
//         // vabF = await pylonInstance.virtualAnchorBalance();
//         // gamma = await pylonInstance.gammaMulDecimals();
//         //
//         // derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//         //
//         //
//         // console.log("\nderVfb after final burn", ethers.utils.formatEther(derVfb));
//         // // console.log("anchork after final burn", ethers.utils.formatEther(anchorK));
//         //
//         // expect(balancePostBurn.sub(balancePreBurn)).to.eq(ethers.BigNumber.from('1038508513223823433'))
//
//     });
//
//     it('Slippage test', async function () {
//         let token0Amount = expandTo18Decimals(1200)
//         let token1Amount = expandTo18Decimals(35)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount.mul(100))
//         await token1.transfer(pylonInstance.address, token1Amount.mul(100))
//
//         // Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount.mul(100)));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount.mul(100)));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         let pairResIni = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//
//         // Pylon initialized.
//
//         let pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         let tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//         let gamma = await pylonInstance.gammaMulDecimals();
//
//         let derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after init", ethers.utils.formatEther(derVfb));
//
//
//
//         let pairResk = await pair.getReserves();
//         console.log("K before swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//
//         // 25% of pool swap
//         let input = pairResk[0].div(1);
//         await token0.transfer(pair.address, input)
//
//         let balance = await token0.balanceOf(account.address);
//         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//         let balance1 = await token1.balanceOf(account.address);
//         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//         let outcome = getAmountOut(input, pairResk[0], pairResk[1])
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//
//         let balanceNew = await token0.balanceOf(account.address);
//         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//         let balance1New = await token1.balanceOf(account.address);
//         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//
//
//         //we dumped price, now let's try to add a bunch of float, remove, then add more.
//
//         let fptBalance = await poolTokenInstance0.balanceOf(account.address)
//         console.log("fpt after init", ethers.utils.formatEther(fptBalance));
//
//
//         //force update
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent floats:", ethers.utils.formatEther(token0Amount.mul(3)));
//         console.log("sent floats:", token0Amount.mul(3));
//         await token0.transfer(pylonInstance.address, token0Amount.mul(3))
//         //await saveValuesForSDK();
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after first mint", ethers.utils.formatEther(anchorK));
//         console.log("gamma after first mint", ethers.utils.formatEther(gamma));
//         console.log("derVfb after first mint", ethers.utils.formatEther(derVfb));
//
//         let oldfpt = fptBalance;
//         fptBalance = await poolTokenInstance0.balanceOf(account.address)
//         console.log("fpt after mint", ethers.utils.formatEther(fptBalance));
//
//
//         //insta burn
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         let balancePreBurn = await token0.balanceOf(account.address);
//
//         let ptDiff = fptBalance.sub(oldfpt);
//         console.log("sent float Pts:", ethers.utils.formatEther(ptDiff));
//         await poolTokenInstance0.transfer(pylonInstance.address, ptDiff)
//         await pylonInstance.burn(account.address, false);
//
//         let balancePostBurn = await token0.balanceOf(account.address);
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after burn", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after burn", ethers.utils.formatEther(derVfb));
//         console.log("gamma after burn", ethers.utils.formatEther(gamma));
//
//
//
//         fptBalance = await poolTokenInstance0.balanceOf(account.address)
//         console.log("fpt after burn", ethers.utils.formatEther(fptBalance));
//
//         console.log("received tokens from burn", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//         //second smaller mint
//
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent floats:", ethers.utils.formatEther(token0Amount.mul(2)));
//         await token0.transfer(pylonInstance.address, token0Amount.mul(2))
//
//
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after 2 mint", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after 2 mint", ethers.utils.formatEther(derVfb));
//         console.log("gamma after 2 mint", ethers.utils.formatEther(gamma));
//
//
//         fptBalance = await poolTokenInstance0.balanceOf(account.address)
//         console.log("fpt after 2 mint", ethers.utils.formatEther(fptBalance));
//
//
//         //now burn, then mint again
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         balancePreBurn = await token0.balanceOf(account.address);
//
//         console.log("sent float PTs:", ethers.utils.formatEther(token0Amount.mul(1)));
//         await poolTokenInstance0.transfer(pylonInstance.address, token0Amount.mul(1))
//         await pylonInstance.burn(account.address, false);
//
//         balancePostBurn = await token0.balanceOf(account.address);
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after burn", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after burn", ethers.utils.formatEther(derVfb));
//         console.log("gamma after burn", ethers.utils.formatEther(gamma));
//
//
//         fptBalance = await poolTokenInstance0.balanceOf(account.address)
//         console.log("fpt after burn", ethers.utils.formatEther(fptBalance));
//
//         console.log("received tokens from burn", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//         //mint again for small amount
//
//
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent floats:", ethers.utils.formatEther(token0Amount.mul(6)));
//
//         oldfpt = fptBalance;
//         await token0.transfer(pylonInstance.address, token0Amount.mul(3))
//         await token1.transfer(pylonInstance.address, token0Amount.mul(3).mul(pairResT[1]).div(pairResT[0]))
//         await pylonInstance.mintAsync(account.address, false);
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after 3 mint", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after 3 mint", ethers.utils.formatEther(derVfb));
//         console.log("gamma after 3 mint", ethers.utils.formatEther(gamma));
//
//
//         fptBalance = await poolTokenInstance0.balanceOf(account.address)
//         console.log("fpt after 3 mint", ethers.utils.formatEther(fptBalance));
//
//         balancePreBurn = await token0.balanceOf(account.address);
//
//         console.log("sent float PTs:", ethers.utils.formatEther(fptBalance.sub(oldfpt)));
//         await poolTokenInstance0.transfer(pylonInstance.address, fptBalance.sub(oldfpt))
//         await pylonInstance.burn(account.address, false);
//
//         balancePostBurn = await token0.balanceOf(account.address);
//
//         console.log("received tokens from burn", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//
//         //mint some anchors
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent anchor value:", ethers.utils.formatEther(token1Amount.mul(4)));
//         await token1.transfer(pylonInstance.address, token1Amount.mul(2))
//         await token0.transfer(pylonInstance.address, token1Amount.mul(2).mul(pairResT[0]).div(pairResT[1]))
//         await pylonInstance.mintAsync(account.address, true);
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after anchor mint", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after anchor mint", ethers.utils.formatEther(derVfb));
//
//
//         fptBalance = await poolTokenInstance0.balanceOf(account.address)
//         console.log("fpt after anchor mint", ethers.utils.formatEther(fptBalance));
//
//
//         //mint large amount
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         console.log("sent floats:", ethers.utils.formatEther(token0Amount.mul(2)));
//         await token0.transfer(pylonInstance.address, token0Amount.mul(2))
//         await pylonInstance.mintPoolTokens(account.address, false);
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         // console.log("anchork after 4 mint", ethers.utils.formatEther(anchorK));
//         console.log("derVfb after 4 mint", ethers.utils.formatEther(derVfb));
//
//
//         fptBalance = await poolTokenInstance0.balanceOf(account.address)
//         console.log("fpt after 4 mint", ethers.utils.formatEther(fptBalance));
//
//
//     });
//
//
//     it('Omega test regular burn', async function () {
//         let token0Amount = expandTo18Decimals(1700)
//         let token1Amount = expandTo18Decimals(5300)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount)
//         await token1.transfer(pylonInstance.address, token1Amount)
//
//         // Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         let pairResIni = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//
//         // Pylon initialized.
//
//         //We mint some Async first to make sure we send with correct proportions
//
//         let initialPtBalance = await poolTokenInstance1.balanceOf(account.address)
//         //Now we deposit a large amount of Anchors to test Omega
//         //We do it with async 50/50 to make sure we avoid slippage distortions
//
//         //await token0.transfer(pylonInstance.address, token0Amount.div(50))
//         await token1.transfer(pylonInstance.address, token1Amount.div(25))
//
//         console.log("anchors sent for minting: ", ethers.utils.formatEther(token1Amount.div(25)));
//         ptt = await pair.totalSupply();
//         console.log("ptt before async mint", ethers.utils.formatEther(ptt));
//
//         let tpv = pairResIni[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//
//         let gamma = await pylonInstance.gammaMulDecimals();
//         let derVfb = tpv.mul(gamma).mul(pairResIni[0]).div(pairResIni[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb before async mint", ethers.utils.formatEther(derVfb));
//
//         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         ptt = await pair.totalSupply();
//         // // // let anchorFactor = await pylonInstance.anchorKFactor();
//
//         console.log("ptt after async mint", ethers.utils.formatEther(ptt));
//         // console.log("anchorFactor after async mint", ethers.utils.formatEther(anchorFactor));
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //force update
//
//         console.log("sent floats:", ethers.utils.formatEther(token0Amount.div(10000)));
//         await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after async mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after async mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         console.log("gamma after async mint", ethers.utils.formatEther(gamma));
//
//         let pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after async mint", ethers.utils.formatEther(derVfb));
//
//         //Vfb is slightly higher - this should be expected because we moved price a bit?
//         expect(derVfb).to.eq(ethers.BigNumber.from('17429757126827755113'));
//
//         // We now do a few massive swaps to get some fees in + small syncMint to make it stick.
//
//         let pairResk = await pair.getReserves();
//         console.log("K before swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//         console.log("res0 before swaps: ", ethers.utils.formatEther(pairResk[0]))
//         console.log("res1 before swaps: ", ethers.utils.formatEther(pairResk[1]))
//
//         // 25% of pool swap
//         let input = pairRes[0].div(2);
//         await token0.transfer(pair.address, input)
//
//         let balance = await token0.balanceOf(account.address);
//         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//         let balance1 = await token1.balanceOf(account.address);
//         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//         let outcome = getAmountOut(input, pairRes[0], pairRes[1])
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//
//         let balanceNew = await token0.balanceOf(account.address);
//         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//         let balance1New = await token1.balanceOf(account.address);
//         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//
//         //Add some more to pump price
//         input = balance1New.add(token1Amount.div(10)).sub(balance1);
//         await token1.transfer(pair.address, input)
//         pairRes = await pair.getReserves();
//
//         outcome = getAmountOut(input, pairRes[1], pairRes[0])
//
//         await pair.swap(outcome, 0, account.address, '0x', overrides)
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after swapping: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after swapping: ", ethers.utils.formatEther(pairRes[1]))
//
//
//         pairResk = await pair.getReserves();
//         console.log("K after swaps: ", ethers.utils.formatEther(pairResk[0].mul(pairResk[1])))
//
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
//
//         ptBalance = await pair.balanceOf(energyAddress);
//
//         console.log("pt energy balance before any burn:", ethers.utils.formatEther(ptBalance));
//
//         let balancePreBurn = await token1.balanceOf(account.address)
//
//         let aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         let oldVab = await pylonInstance.virtualAnchorBalance();
//         let totalApt = await poolTokenInstance1.totalSupply();
//
//         aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         console.log("AptBalance:", ethers.utils.formatEther(aptBalance.div(40)));
//
//         // //AnchorFactor check
//
//         pairResT = await pair.getReserves();
//
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//
//         ptt = await pair.totalSupply();
//
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         console.log("Pylon FTV before burn: ", ethers.utils.formatEther(tpv.mul(gamma).div(ethers.BigNumber.from('1000000000000000000'))))
//         console.log("Pylon ptb: ", ethers.utils.formatEther(ptb))
//         console.log("Pylon ptt: ", ethers.utils.formatEther(ptt))
//         console.log("Pylon vab: ", ethers.utils.formatEther(vabF))
//         // console.log("Pylon anchorK: ", ethers.utils.formatEther(anchorK))
//         console.log("Pylon gamma: ", ethers.utils.formatEther(gamma))
//
//         // derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//         //
//         // console.log("derVfb all burns", ethers.utils.formatEther(derVfb));
//
//
//         //We test with burn
//         await poolTokenInstance1.transfer(pylonInstance.address, aptBalance.div(40));
//
//         ptt = await pair.totalSupply();
//         console.log("uniptt before burn", ethers.utils.formatEther(ptt));
//
//         pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 before burn: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 before burn: ", ethers.utils.formatEther(pylonRes[1]));
//
//
//
//         await pylonInstance.burn(account.address, true);
//
//         ptt = await pair.totalSupply();
//         console.log("uniptt after burn", ethers.utils.formatEther(ptt));
//
//         pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after first burn: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after first burn: ", ethers.utils.formatEther(pylonRes[1]));
//
//
//         let balancePostBurn = await token1.balanceOf(account.address);
//
//         console.log("Received anchor tokens after burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//         let newVab = await pylonInstance.virtualAnchorBalance();
//         let totalAptnew = await poolTokenInstance1.totalSupply();
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         console.log("Pylon FTV after burn: ", ethers.utils.formatEther(tpv.mul(gamma).div(ethers.BigNumber.from('1000000000000000000'))))
//         console.log("Pylon ptb: ", ethers.utils.formatEther(ptb))
//         console.log("Pylon ptt: ", ethers.utils.formatEther(ptt))
//         console.log("Pylon vab: ", ethers.utils.formatEther(vabF))
//         // console.log("Pylon anchorK: ", ethers.utils.formatEther(anchorK))
//         console.log("Pylon gamma: ", ethers.utils.formatEther(gamma))
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//         //
//         console.log("derVfb after first burn", ethers.utils.formatEther(derVfb));
//
//
//
//         //Now we dump the price to trigger slashing (2% or so)
//         //We want to withdraw a smallish amount with burn
//         //The user should receive what he inputted minus fees etc
//
//         //Should be enough?
//         input = token0Amount.div(8);
//         await token0.transfer(pair.address, input)
//         pairRes = await pair.getReserves();
//
//         outcome = getAmountOut(input, pairRes[0], pairRes[1])
//
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after dumping: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after dumping: ", ethers.utils.formatEther(pairRes[1]))
//
//
//         //Avoid deltaGamma
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         strikeBlock = await pylonInstance.strikeBlock();
//         let block = await ethers.provider.getBlockNumber();
//
//         console.log("strike before burn", strikeBlock);
//         console.log("current block", block);
//
//         balancePreBurn = await token1.balanceOf(account.address)
//
//         // aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         //
//         // aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         //We test with burnAsync to avoid reserve distortions
//         //Supposed to cover about 2% of 1% of balance, should be easily covered
//         console.log("AptBalance:", ethers.utils.formatEther(aptBalance.div(40)));
//
//         vab = await pylonInstance.virtualAnchorBalance();
//         console.log("vab share:", ethers.utils.formatEther(vab.div(40)));
//
//         energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
//
//         ptBalance = await pair.balanceOf(energyAddress);
//
//         console.log("pt energy balance before:", ethers.utils.formatEther(ptBalance));
//         console.log("ea", energyAddress)
//         console.log("ea", pylonInstance.address)
//         ptb = await pair.balanceOf(pylonInstance.address);
//         console.log("Pylon ptb: ", ethers.utils.formatEther(ptb))
//         //If this test fails you probably forgot to update energyFor bytecode
//         expect(ptBalance).to.gt(ethers.BigNumber.from('1'))
//
//
//         await poolTokenInstance1.transfer(pylonInstance.address, aptBalance.div(40));
//
//         await pylonInstance.burn(account.address, true);
//
//         balancePostBurn = await token1.balanceOf(account.address);
//
//         console.log("Received anchor tokens after second omega burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//         ptBalance = await pair.balanceOf(energyAddress);
//
//         console.log("pt energy balance after:", ethers.utils.formatEther(ptBalance));
//
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         console.log("Pylon FTV after first burn: ", ethers.utils.formatEther(tpv.mul(gamma).div(ethers.BigNumber.from('1000000000000000000'))))
//         console.log("Pylon ptb: ", ethers.utils.formatEther(ptb))
//         console.log("Pylon ptt: ", ethers.utils.formatEther(ptt))
//         console.log("Pylon vab: ", ethers.utils.formatEther(vabF))
//         // console.log("Pylon anchorK: ", ethers.utils.formatEther(anchorK))
//         console.log("Pylon gamma: ", ethers.utils.formatEther(gamma))
//
//
//
//         //It's a little bit less than the raw no burn extraction, which makes sense considering slippage
//         expect(balancePostBurn.sub(balancePreBurn)).to.eq(ethers.BigNumber.from('5234974836981334317'))
//
//
//         //now we dump a bit more to see if it taps into the Anchors
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         input = token0Amount.div(8);
//         await token0.transfer(pair.address, input)
//         pairRes = await pair.getReserves();
//
//         outcome = getAmountOut(input, pairRes[0], pairRes[1])
//
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after dumping: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after dumping: ", ethers.utils.formatEther(pairRes[1]))
//
//         balancePreBurn = await token1.balanceOf(account.address)
//
//         // aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         //
//         // aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         //We test with burnAsync to avoid reserve distortions
//         //Supposed to cover about 2% of 1% of balance, should be easily covered
//         console.log("AptBalance:", ethers.utils.formatEther(aptBalance.div(40)));
//
//         await poolTokenInstance1.transfer(pylonInstance.address, aptBalance.div(40));
//
//         energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
//
//         let anchorBalance = await token1.balanceOf(energyAddress);
//         console.log("Anchor balance old", ethers.utils.formatEther(anchorBalance))
//
//         await pylonInstance.burn(account.address, true);
//
//         balancePostBurn = await token1.balanceOf(account.address);
//
//         console.log("Received anchor tokens after final omega burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//         let anchorBalanceNew = await token1.balanceOf(energyAddress);
//         console.log("Anchor balance new", ethers.utils.formatEther(anchorBalanceNew))
//
//         expect(balancePostBurn.sub(balancePreBurn)).to.eq(ethers.BigNumber.from('5198298382734026184'))
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//
//         console.log("Pylon FTV after all burns: ", ethers.utils.formatEther(tpv.mul(gamma).div(ethers.BigNumber.from('1000000000000000000'))))
//
//         console.log("Pylon Pair Reserve0 after everything: ", ethers.utils.formatEther(pairResT[0]))
//         console.log("Pylon Pair Reserve1 after everything: ", ethers.utils.formatEther(pairResT[1]))
//         console.log("Pylon ptb: ", ethers.utils.formatEther(ptb))
//         console.log("Pylon ptt: ", ethers.utils.formatEther(ptt))
//         console.log("Pylon vab: ", ethers.utils.formatEther(vabF))
//         // console.log("Pylon anchorK: ", ethers.utils.formatEther(anchorK))
//         console.log("Pylon gamma: ", ethers.utils.formatEther(gamma))
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after all burns", ethers.utils.formatEther(derVfb));
//
//
//     });
//
//
//
//     it('AnchorK Test', async function () {
//
//         let token0Amount = expandTo18Decimals(1700)
//         let token1Amount = expandTo18Decimals(5300)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount)
//         await token1.transfer(pylonInstance.address, token1Amount)
//
//         // Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         let pairResIni = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//
//         // Pylon initialized.
//
//         //We mint some Async first to make sure we send with correct proportions
//
//         let initialPtBalance = await poolTokenInstance1.balanceOf(account.address)
//         //Now we deposit a large amount of Anchors to test Omega
//         //We do it with async 50/50 to make sure we avoid slippage distortions
//
//         //await token0.transfer(pylonInstance.address, token0Amount.div(50))
//         await token1.transfer(pylonInstance.address, token1Amount.div(25))
//
//         console.log("anchors sent for minting: ", ethers.utils.formatEther(token1Amount.div(25)));
//         ptt = await pair.totalSupply();
//         console.log("ptt before async mint", ethers.utils.formatEther(ptt));
//
//         let tpv = pairResIni[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//
//         let gamma = await pylonInstance.gammaMulDecimals();
//         let derVfb = tpv.mul(gamma).mul(pairResIni[0]).div(pairResIni[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb before async mint", ethers.utils.formatEther(derVfb));
//
//         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         ptt = await pair.totalSupply();
//         // // // let anchorFactor = await pylonInstance.anchorKFactor();
//
//         console.log("ptt after async mint", ethers.utils.formatEther(ptt));
//         // console.log("anchorFactor after async mint", ethers.utils.formatEther(anchorFactor));
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //force update
//         await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         console.log("gamma after async mint", ethers.utils.formatEther(gamma));
//
//         let pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         console.log("derVfb after async mint", ethers.utils.formatEther(derVfb));
//
//
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
//
//         ptBalance = await pair.balanceOf(energyAddress);
//
//         console.log("pt energy balance before any burn:", ethers.utils.formatEther(ptBalance));
//
//         let balancePreBurn = await token1.balanceOf(account.address)
//
//         let aptBalance = await poolTokenInstance1.balanceOf(account.address)
//         let oldVab = await pylonInstance.virtualAnchorBalance();
//         let totalApt = await poolTokenInstance1.totalSupply();
//
//         aptBalance = aptBalance.sub(initialPtBalance); //We only want the new tokens.
//
//         console.log("AptBalance:", ethers.utils.formatEther(aptBalance.div(40)));
//
//         // //AnchorFactor check
//
//         pairResT = await pair.getReserves();
//
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//
//         console.log("Pylon tpv: ", ethers.utils.formatEther(tpv))
//         console.log("Pylon FTV before burn: ", ethers.utils.formatEther(tpv.mul(gamma).div(ethers.BigNumber.from('1000000000000000000'))))
//         console.log("Pylon ptb: ", ethers.utils.formatEther(ptb))
//         console.log("Pylon ptt: ", ethers.utils.formatEther(ptt))
//         console.log("Pylon vab: ", ethers.utils.formatEther(vabF))
//         // console.log("Pylon anchorK: ", ethers.utils.formatEther(anchorK))
//         console.log("Pylon gamma: ", ethers.utils.formatEther(gamma))
//
//         // derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//         //
//         // console.log("derVfb all burns", ethers.utils.formatEther(derVfb));
//
//
//         //We test with burn
//         await poolTokenInstance1.transfer(pylonInstance.address, aptBalance);
//
//         ptt = await pair.totalSupply();
//         console.log("uniptt before burn", ethers.utils.formatEther(ptt));
//
//         pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 before burn: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 before burn: ", ethers.utils.formatEther(pylonRes[1]));
//
//
//
//         await pylonInstance.burn(account.address, true);
//
//         ptt = await pair.totalSupply();
//         console.log("uniptt after burn", ethers.utils.formatEther(ptt));
//
//         pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after first burn: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after first burn: ", ethers.utils.formatEther(pylonRes[1]));
//
//
//         let balancePostBurn = await token1.balanceOf(account.address);
//
//         console.log("Received anchor tokens after burn:", ethers.utils.formatEther(balancePostBurn.sub(balancePreBurn)))
//
//         let newVab = await pylonInstance.virtualAnchorBalance();
//         let totalAptnew = await poolTokenInstance1.totalSupply();
//
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//
//         //force update
//         await token1.transfer(pylonInstance.address, token0Amount.div(10000))
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         console.log("Pylon tpv: ", ethers.utils.formatEther(tpv))
//         console.log("Pylon FTV after burn: ", ethers.utils.formatEther(tpv.mul(gamma).div(ethers.BigNumber.from('1000000000000000000'))))
//         console.log("Pylon ptb: ", ethers.utils.formatEther(ptb))
//         console.log("Pylon ptt: ", ethers.utils.formatEther(ptt))
//         console.log("Pylon vab: ", ethers.utils.formatEther(vabF))
//         // console.log("Pylon anchorK: ", ethers.utils.formatEther(anchorK))
//         console.log("Pylon gamma: ", ethers.utils.formatEther(gamma))
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//         //
//         console.log("derVfb after burn same amount", ethers.utils.formatEther(derVfb));
//
//
//
//
//     });
//
//
//
//
//     it('Test Creating Pylon With Unbalanced Quantities', async function () {
//         let token0Amount = expandTo18Decimals(1700)
//         let token1Amount = expandTo18Decimals(5300)
//         await addLiquidity(token0Amount, token1Amount)
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount.div(100))
//         await token1.transfer(pylonInstance.address, token1Amount.div(11))
//         //Let's initialize the Pylon, this should call two sync
//         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount.div(100)));
//         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount.div(11)));
//         await pylonInstance.initPylon(account.address)
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairRes[1]))
//
//         let tpvAnchorPrime = pairRes[1].mul(2).mul(ptb).div(ptt);
//
//         console.log("Derived tpv: ", ethers.utils.formatEther(tpvAnchorPrime));
//
//         let gamma = await pylonInstance.gammaMulDecimals()
//         console.log("gamma: ", ethers.utils.formatEther(gamma));
//         await expect(gamma).to.eq(ethers.BigNumber.from("500000000000000000")) // 473684210526315789
//         await token0.transfer(pylonInstance.address, expandTo18Decimals(4))
//         await token1.transfer(pylonInstance.address, expandTo18Decimals(4))
//         await ethers.provider.send("hardhat_mine", ['0x30']);
//         await expect(pylonInstance.mintPoolTokens(account.address, false)).to.be.revertedWith("ZP: VFB2");
//
//         // await token0.transfer(pylonInstance.address, token0Amount.div(100000))
//         // await pylonInstance.mintAsync100(account.address, false)
//         // await token0.transfer(pylonInstance.address, token0Amount.div(100000))
//         // await pylonInstance.mintAsync100(account.address, false)
//
//         let gamma2 = await pylonInstance.gammaMulDecimals()
//         console.log("gamma after mint: ", ethers.utils.formatEther(gamma2));
//
//         let pylonRes2 = await pylonInstance.getSyncReserves();
//         console.log("Pylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes2[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes2[1]));
//
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//         console.log("ptb post sync: ", ethers.utils.formatEther(ptb));
//         console.log("ptt post sync: ", ethers.utils.formatEther(ptt));
//
//         //Gamma changes because init takes it before extra liquidity is donated to pool.
//         //After that's done the value of floats rises (we had tons of extra anchors) so a new sync gives it higher gamma
//         await expect(gamma2).to.eq(ethers.BigNumber.from("910943885181109448")) // 473684210526315789
//
//         await expect(pylonInstance.mintPoolTokens(account.address, true))
//         gamma = await pylonInstance.gammaMulDecimals()
//         await expect(gamma).to.eq(ethers.BigNumber.from("910943885181109448"))
//
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("17600035087348505237"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("52999999999999999000"))
//
//     });
//
//     it('should add float/anchor liquidity', async function () {
//         // Adding some tokens and minting
//         // here we initialize the pool
//         await init(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb: ", ethers.utils.formatEther(ptb));
//         console.log("ptt: ", ethers.utils.formatEther(ptt));
//
//
//
//         // Let's check if pair tokens and poolToken have b000een given correctly...
//         expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from("259234808523880957500"))
//         // On init the tokens sent to the pylon exceeds maxSync
//         // So we have less tokens
//         // We donated some tokens to the pylon over there
//         // Let's check that we have the current quantities...
//
//         let pt0 = await poolTokenInstance0.balanceOf(account.address);
//         let pt1 = await poolTokenInstance1.balanceOf(account.address);
//         console.log("Pooltoken0: ", ethers.utils.formatEther(pt0));
//         console.log("PoolToken1: ", ethers.utils.formatEther(pt1));
//
//
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544454"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("481818181818181817181"))
//
//         let pylonRes2 = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 before first mint: ", ethers.utils.formatEther(pylonRes2[0]));
//         console.log("Pylon Sync Reserve1 before first mint: ", ethers.utils.formatEther(pylonRes2[1]));
//
//
//
//         // Let's put some minor quantities into the pylon
//         //There is a slight mismatch between how maxSync is calculated at init and during operation
//         //So the first mint will always match a small portion of liquidity (diff between 5% of 100% and 5% of 95%)
//         // First Float...
//         const token0Amount = expandTo18Decimals(4)
//         await token0.transfer(pylonInstance.address, token0Amount)
//         await expect(pylonInstance.mintPoolTokens(account.address, false))
//             .to.emit(pylonInstance, 'MintAT')
//             .to.emit(pylonInstance, 'PylonUpdate')
//             .withArgs(ethers.BigNumber.from('11340507338607474275'), ethers.BigNumber.from('22886358694307110634'));
//
//         pylonRes2 = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after first mint: ", ethers.utils.formatEther(pylonRes2[0]));
//         console.log("Pylon Sync Reserve1 after first mint: ", ethers.utils.formatEther(pylonRes2[1]));
//
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//         console.log("ptb after first mint: ", ethers.utils.formatEther(ptb));
//         console.log("ptt after first mint: ", ethers.utils.formatEther(ptt));
//
//         // Then Anchor...
//         await token1.transfer(pylonInstance.address, token0Amount)
//         await expect(pylonInstance.mintPoolTokens(account.address, true))
//             .to.emit(pylonInstance, 'MintAT')
//             .to.emit(pylonInstance, 'PylonUpdate')
//             .withArgs(ethers.BigNumber.from('10076934486719759897'), ethers.BigNumber.from('22946586212897978093'))
//
//         pylonRes2 = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after second mint: ", ethers.utils.formatEther(pylonRes2[0]));
//         console.log("Pylon Sync Reserve1 after second mint: ", ethers.utils.formatEther(pylonRes2[1]));
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//         console.log("ptb after second mint: ", ethers.utils.formatEther(ptb));
//         console.log("ptt after second mint: ", ethers.utils.formatEther(ptt));
//
//
//
//         expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from("262148080749109876510"))
//         // We increase by 4 the Anchor and Float share...
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("158545022002841072563"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("485817781818181817181"))
//         // Ok Let's send some higher random quantities to the pylon
//         // Here we increase the float token
//         // The pylon has to donate the exceeding tokens to the pair
//         // The pylon shouldn't mint any pair tokens yet...
//
//         pylonRes2 = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 before mint: ", ethers.utils.formatEther(pylonRes2[0]));
//         console.log("Pylon Sync Reserve1 before mint: ", ethers.utils.formatEther(pylonRes2[1]));
//
//         const newAmount0 = expandTo18Decimals(5)
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await expect(pylonInstance.mintPoolTokens(account.address, false))
//             .to.emit(pylonInstance, 'MintAT')
//             .to.emit(pylonInstance, 'PylonUpdate')
//             .withArgs(ethers.BigNumber.from("14846819199968110273"), ethers.BigNumber.from('22946586212897978093'))
//
//         pylonRes2 = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes2[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes2[1]));
//
//         // Same pair tokens as before on pylon...
//         expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from("262350464281896781767"))
//
//         // Let's send some anchor token
//         // Pylon should mint some pair tokens
//         const newAmount1 = expandTo18Decimals(8)
//         await token1.transfer(pylonInstance.address, newAmount1)
//         await expect(pylonInstance.mintPoolTokens(account.address, true))
//             .to.emit(pylonInstance, 'MintAT')
//             .to.emit(pylonInstance, 'PylonUpdate')
//             .withArgs(ethers.BigNumber.from("12349172409476023415"), ethers.BigNumber.from("23159979763185532590"))
//         // We increase pylon float reserves by 242.5*1e18 and we minted that quantity for the user
//         // And we donated to the pair 257.5*1e18
//         // For a total of 500*1e18
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("163543773877876826090"))
//         // We increased pylon anchor reserves by 764 and we minted that quantity for the user
//         // And we didn't donate...
//         // We minted some more pool shares for the pylon for 165*1e18 float and 516*1e18 anchor
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("493816981818181817181"))
//         // And here Pylon increased the pair share 516*totalSupply/reserves1 ->
//         expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from("266760247791591214123"));
//     });
//
//
//     //Somewhat useless test
//
//     // const syncTestCase = [
//     //     [2, 5, 10, '43295890992529249', '43181405676534741','972330211413936584','909090909090908090', false],
//     // ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : expandTo18Decimals(n))))
//     // syncTestCase.forEach((mintCase, i) => {
//     //     it(`syncPylon`, async () => {
//     //         const [mint, token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor] = mintCase
//     //         // Add some liquidity to the Pair...
//     //         await addLiquidity(token0Amount, token1Amount)
//     //         // Transferring some tokens
//     //         let maxSync = await factoryPylonInstance.maximumPercentageSync()
//     //
//     //         await token0.transfer(pylonInstance.address, token0Amount.div(maxSync.toNumber()+1))
//     //         await token1.transfer(pylonInstance.address, token1Amount.div(maxSync.toNumber()+1))
//     //         // Let's start the pylon
//     //         await pylonInstance.initPylon(account.address)
//     //         // for (let i = 0; i < 10; i++){
//     //         // Transferring some liquidity to pylon
//     //         let pylonRes = await pylonInstance.getSyncReserves()
//     //         let pairRes = await pair.getReserves()
//     //
//     //         if (isAnchor) {
//     //             let t = (pairRes[1].mul(maxSync).div(100)).sub(pylonRes[1]).sub(10)
//     //             console.log(t)
//     //             await token1.transfer(pylonInstance.address, t)
//     //         }else{
//     //             let t = (pairRes[0].mul(maxSync).div(100)).sub(pylonRes[0]).sub(10)
//     //             console.log(t)
//     //             await token0.transfer(pylonInstance.address, t)
//     //         }
//     //         // Minting some float/anchor tokens
//     //         await expect(pylonInstance.mintPoolTokens(account.address, isAnchor))
//     //             .to.emit(pylonInstance, 'PylonUpdate')
//     //             .withArgs(expectedRes0, expectedRes1);
//     //         console.log(await poolTokenInstance0.balanceOf(account.address))
//     //         console.log(await poolTokenInstance1.balanceOf(account.address))
//     //         // Let's check the balances, float
//     //         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(expectedOutputAmount0);
//     //         // Anchor
//     //         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(expectedOutputAmount1);
//     //         // }
//     //     })
//     // })
//
//     it('should initialize pair from pylon', async function () {
//         const token0Amount = expandTo18Decimals(4)
//         const token1Amount = expandTo18Decimals(8)
//
//         // Let's transfer some tokens to the Pylon
//         let maxSync = await factoryPylonInstance.maximumPercentageSync()
//         await token0.transfer(pylonInstance.address, token0Amount.div(maxSync.toNumber()+1))
//         await token1.transfer(pylonInstance.address, token1Amount.div(maxSync.toNumber()+1))
//         //Let's initialize the Pylon, this should call two sync
//         await pylonInstance.initPylon(account.address)
//
//         console.log("Initialized pylon")
//         // TODO: Should receive max float sync
//         await token1.transfer(pylonInstance.address, token0Amount.div(200))
//         // Minting some float/anchor tokens
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         console.log("Finished first mint")
//
//         expect(await token0.balanceOf(pair.address)).to.eq(ethers.BigNumber.from('346363636363636399'))
//         expect(await token1.balanceOf(pair.address)).to.eq(ethers.BigNumber.from('692727272727272799'))
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('363636363636362636'))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('747270727272726272'))
//         expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from('489832152058316516'))
//
//         let atb = await poolTokenInstance1.balanceOf(account.address);
//         await poolTokenInstance1.transfer(pylonInstance.address, atb);
//         await pylonInstance.burn(account2.address, true)
//
//         console.log(await token1.balanceOf(account2.address));
//     });
//
//     it('creating two pylons', async function () {
//         await init(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//         await factoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
//         let pylonAddress = await factoryPylonInstance.getPylon(token1.address, token0.address)
//
//         let zPylon = await ethers.getContractFactory('ZirconPylon', {
//             libraries: {
//                 ZirconLibrary: library.address,
//             },
//         })
//         let newPylonInstance = await zPylon.attach(pylonAddress);
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(newPylonInstance.address, expandTo18Decimals(17))
//         await token1.transfer(newPylonInstance.address, expandTo18Decimals(  53))
//         //Let's initialize the Pylon, this should call two sync
//         await newPylonInstance.initPylon(account.address, overrides)
//         // TODO: make sonme checks here, think if there is some way of concurrency between pylons
//     });
//
//     // TODO: Do test extracting liquidity here
//     it('sync', async function () {
//         // Initializing
//         await init(expandTo18Decimals(10), expandTo18Decimals(  100))
//
//         // VAB at the beginning is equal to the minted pool tokens
//         let vab = await pylonInstance.virtualAnchorBalance();
//         console.log(vab)
//         expect(vab).to.eq(ethers.BigNumber.from('9090909090909090909'))
//         // Time to swap, let's generate some fees
//         await token0.transfer(pair.address, expandTo18Decimals(1))
//         await pair.swap(0, ethers.BigNumber.from('1662497915624478906'), account.address, '0x', overrides)
//         // // Minting tokens is going to trigger a change in the VAB & anchorFactor so let's check
//         const newAmount0 = ethers.BigNumber.from('5000000000000000')
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, false)
//
//         // // So here we increase our vab and anchorFactor
//         let vab2 = await pylonInstance.virtualAnchorBalance();
//         // // expect(anchorFactor).to.eq(ethers.BigNumber.from('902024227015522550'))
//         expect(vab2).to.eq(ethers.BigNumber.from('9351458600930847310'))
//         // Let's mint some LP Tokens
//         // // no fee changes so vab & anchorFactor should remain the same
//         await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(10))
//         let vab3 = await pylonInstance.virtualAnchorBalance();
//         // // expect(anchorFactor3).to.eq(ethers.BigNumber.from('902024227015522550'))
//         expect(vab3).to.eq(ethers.BigNumber.from('9351458600930847310'))
//
//         await token1.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, true)
//
//         await token1.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, true)
//     })
//
//     it('should burn anchor liquidity', async function () {
//         console.log("Beginning anchor burn test");
//         console.log("token0Balance", ethers.utils.formatEther(await token0.balanceOf(account2.address)));
//         console.log("token1Balance", ethers.utils.formatEther(await token1.balanceOf(account2.address)));
//         let token1Amount = expandTo18Decimals(10)
//         let token0Amount = expandTo18Decimals(5)
//
//         let floatSum = token0Amount.div(11)
//         let anchorSum = token1Amount.div(220).add(token1Amount.div(11))
//
//         //Pylon init with 1/11 of token amounts into pylon.
//         await init(token0Amount, token1Amount)
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//         console.log("ptb after first mint: ", ethers.utils.formatEther(ptb));
//         console.log("ptt after first mint: ", ethers.utils.formatEther(ptt));
//
//
//
//         let pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//
//
//         // Minting some float/anchor tokens (1/20 of Pylon)
//         await token1.transfer(pylonInstance.address, token1Amount.div(220))
//         console.log("Anchors sent for minting: ", ethers.utils.formatEther(token1Amount.div(220)))
//         let initialPTS = await poolTokenInstance1.balanceOf(account.address);
//         console.log("initialPTS: ", ethers.utils.formatEther(initialPTS));
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//
//
//         //Initiating burn. This burns the 1/20 of Anchors sent before.
//         ptb = await poolTokenInstance1.balanceOf(account.address);
//
//         console.log("ptb after mint: ", ethers.utils.formatEther(ptb));
//         let liquidityMinted = ptb.sub(initialPTS);
//         console.log("liquidityMinted: ", ethers.utils.formatEther(liquidityMinted));
//         await poolTokenInstance1.transfer(pylonInstance.address, liquidityMinted)
//         await pylonInstance.burn(account2.address, true) //Burns to an account2
//
//         console.log("initialFloat", ethers.utils.formatEther(floatSum))
//         console.log("initialAnchor", ethers.utils.formatEther(anchorSum))
//         console.log("floatBalance (should be 0)", ethers.utils.formatEther(await token0.balanceOf(account2.address)))
//         console.log("anchorBalance (should be roughly 1/20 of token1 minus fees and slippage)", ethers.utils.formatEther(await token1.balanceOf(account2.address)))
//
//         ptb = await poolTokenInstance0.balanceOf(account.address)
//         console.log("Ptb after burn: ", ethers.utils.formatEther(ptb))
//         expect(ptb).to.eq(ethers.BigNumber.from("454545454545453545"))
//
//         //Burns half of the floats now
//         let ftb = await poolTokenInstance0.balanceOf(account.address)
//         await poolTokenInstance0.transfer(pylonInstance.address, ftb.div(2))
//
//         console.log("Floats to be burned: ", ethers.utils.formatEther(floatSum.div(2)));
//         ptt = await pair.totalSupply();
//         console.log("PTT:", ptt);
//         //
//         await pylonInstance.burn(account2.address, false)
//         console.log("Burn tests complete\ninitialFloat", ethers.utils.formatEther(floatSum))
//         console.log("initialAnchor", ethers.utils.formatEther(anchorSum))
//         console.log("Account2 Float (1/20 of token1 minus slippage)", ethers.utils.formatEther(await token0.balanceOf(account2.address)))
//         console.log("Account2 Anchor (same as before)", ethers.utils.formatEther(await token1.balanceOf(account2.address)))
//         //45454545454545454
//         //45454545454545454
//         //954545454545454544
//         expect(await token0.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("225009136622295663"))
//         expect(await token1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("45437717419695353"))
//
//         await token0.transfer(pylonInstance.address, token0Amount.div(220))
//         console.log("sending more tokens: ", ethers.utils.formatEther(token0Amount.div(220)))
//         await expect(pylonInstance.mintPoolTokens(account.address, false)).to.be.revertedWith("Z: FTH")
//
//         // ptb = await poolTokenInstance0.balanceOf(account.address)
//         // //249999999999999500
//         // //454545454545453545
//         // expect(ptb).to.eq(ethers.BigNumber.from("249999999999999500"))
//     })
//
//     it('should burn async', async function () {
//         let tokenAmount = expandTo18Decimals(  10)
//         await init(expandTo18Decimals(5), tokenAmount)
//         // Minting some float/anchor tokens
//         let ptb = await poolTokenInstance1.balanceOf(account.address)
//
//         expect(ptb).to.eq(ethers.BigNumber.from("909090909090908090"))
//
//         console.log("Anchor ptb after init", ethers.utils.formatEther(ptb))
//         await token1.transfer(pylonInstance.address, tokenAmount.div(220))
//         await pylonInstance.mintPoolTokens(account.address, true);
//         ptb = await poolTokenInstance1.balanceOf(account.address)
//
//         console.log("Anchor ptb after additional mint", ethers.utils.formatEther(ptb))
//         console.log("Anchors added", ethers.utils.formatEther(tokenAmount.div(220)))
//         expect(ptb).to.eq(ethers.BigNumber.from("954533170736768028"))
//         await poolTokenInstance1.transfer(pylonInstance.address, ptb.div(2))
//         console.log("Anchor ptb sent for burn", ethers.utils.formatEther(ptb.div(2)))
//
//         let uniPtt = await pair.totalSupply();
//         let uniPtb = await pair.balanceOf(pylonInstance.address);
//         let anchorPtt = await poolTokenInstance1.totalSupply();
//         console.log("DEBUG: Uni PTT", ethers.utils.formatEther(uniPtt));
//         console.log("DEBUG: Uni Ptb", ethers.utils.formatEther(uniPtb));
//         console.log("DEBUG: Anchor PTT", ethers.utils.formatEther(anchorPtt));
//         await pylonInstance.burnAsync(account2.address, true)
//
//         let balance0 = await token0.balanceOf(account2.address);
//         let balance1 = await token1.balanceOf(account2.address);
//
//         console.log("balance0", ethers.utils.formatEther(balance0));
//         console.log("balance1", ethers.utils.formatEther(balance1));
//         //TODO: After using energy this value dropped
//         expect(balance0).to.eq(ethers.BigNumber.from("119282310261102355"))
//         expect(balance1).to.eq(ethers.BigNumber.from("238609429354923585"))
//
//         let ftb = await poolTokenInstance0.balanceOf(account.address)
//         await poolTokenInstance0.transfer(pylonInstance.address, ftb.div(2))
//         await expect(pylonInstance.burnAsync(account2.address, false)).to.be.revertedWith("Z: FTH")
//         //
//         // expect(await token0.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("216753615257390768"))
//         // expect(await token1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("432354244161447790"))
//         //
//         // await token1.transfer(pylonInstance.address, tokenAmount.div(220))
//         // await pylonInstance.mintPoolTokens(account.address, true);
//         //
//         // ptb = await poolTokenInstance1.balanceOf(account.address)
//         // expect(ptb).to.eq(ethers.BigNumber.from("522727272727272226"))
//     })
//
//
//
//
//
//     it('should burn after init', async function () {
//         let tokenAmount = expandTo18Decimals(10)
//         await init(expandTo18Decimals(5), tokenAmount)
//
//         let pairResT = await pair.getReserves();
//
//         let ptb = await pair.balanceOf(pylonInstance.address);
//         let ptt = await pair.totalSupply();
//
//         let tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // let anchorK = await pylonInstance.anchorKFactor();
//         let vabF = await pylonInstance.virtualAnchorBalance();
//         let gamma = await pylonInstance.gammaMulDecimals();
//
//         let derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//
//         derVfb = derVfb.add(pylonRes[0]);
//
//
//         console.log("derVfb Initial: ", ethers.utils.formatEther(derVfb));
//
//
//         let ftb = await poolTokenInstance0.balanceOf(account.address)
//         console.log("ftb: ", ethers.utils.formatEther(ftb));
//         await poolTokenInstance0.transfer(pylonInstance.address, ftb.div(10))
//
//         await pylonInstance.burn(account2.address, false)
//
//         pairResT = await pair.getReserves();
//
//         ptb = await pair.balanceOf(pylonInstance.address);
//         ptt = await pair.totalSupply();
//
//         tpv = pairResT[1].mul(2).mul(ptb).div(ptt);
//         // // anchorK = await pylonInstance.anchorKFactor();
//         vabF = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//
//         derVfb = tpv.mul(gamma).mul(pairResT[0]).div(pairResT[1]).div(ethers.BigNumber.from('1000000000000000000'));
//
//         pylonRes = await pylonInstance.getSyncReserves();
//
//         derVfb = derVfb.add(pylonRes[0]);
//
//         console.log("derVfb After burm: ", ethers.utils.formatEther(derVfb));
//
//         let token0Balance = await token0.balanceOf(account2.address);
//         console.log("token0", ethers.utils.formatEther(token0Balance));
//         expect(token0Balance).to.lt(ftb.div(10));
//
//         let aptb = await poolTokenInstance1.balanceOf(account.address)
//         console.log("ptb tokens", ethers.utils.formatEther(aptb));
//
//
//         await poolTokenInstance1.transfer(pylonInstance.address, aptb.div(10))
//
//         await pylonInstance.burn(account2.address, true);
//
//         let token1Balance = await token1.balanceOf(account2.address);
//         console.log("token1", ethers.utils.formatEther(token1Balance));
//         expect(token1Balance).to.lt(aptb.div(10));
//
//     })
//
//
//     it('should add async liquidity', async function () {
//         // Let's initialize the pool and pylon
//         await addLiquidity(expandTo18Decimals(1700), expandTo18Decimals(5300))
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
//         await token1.transfer(pylonInstance.address, expandTo18Decimals(5300).div(11))
//         //Let's initialize the Pylon, this should call two sync
//         await pylonInstance.initPylon(account.address)
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544454"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq((ethers.BigNumber.from("481818181818181817181")))
//
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("Pylon Sync Reserve0: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1: ", ethers.utils.formatEther(pylonRes[1]));
//         let pairRes = await pair.getReserves()
//         console.log("Pylon Pair Reserve0: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's send some tokens
//         const token0Amount = expandTo18Decimals(25)
//         await token0.transfer(pylonInstance.address, token0Amount)
//         await token1.transfer(pylonInstance.address, token0Amount)
//
//         console.log("Sent to both sides: ", ethers.utils.formatEther(token0Amount));
//         console.log("Token0 if equal value: ", ethers.utils.formatEther(token0Amount.mul(pairRes[0]).div(pairRes[1])));
//         let floatBalance0 = await poolTokenInstance0.balanceOf(account.address);
//         console.log("FloatPTBalance before mint: ", ethers.utils.formatEther(floatBalance0))
//         // Let's try to mint async
//         await pylonInstance.mintAsync(account.address, false);
//         // We should receive float tokens and pylon should've minted some pair shares
//         // Let's check...
//         let floatBalance = await poolTokenInstance0.balanceOf(account.address);
//         console.log("FloatPTBalance after mint: ", ethers.utils.formatEther(floatBalance))
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("172072197131758949544"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("481818181818181817181"))
//
//         // Now let's test to receive some anchor tokens
//         await token0.transfer(pylonInstance.address, token0Amount)
//         await token1.transfer(pylonInstance.address, token0Amount)
//
//         let anchorBalance = await poolTokenInstance0.balanceOf(account.address);
//         console.log("anchor PT Balance before anchor mint: ", ethers.utils.formatEther(floatBalance))
//
//         await pylonInstance.mintAsync(account.address, true);
//
//         anchorBalance = await poolTokenInstance0.balanceOf(account.address);
//         console.log("anchor PT Balance after anchor mint: ", ethers.utils.formatEther(floatBalance))
//
//         // Let's check...
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("172072197131758949544"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('531803181818181817181'))
//     });
//
//
//     // it('should add async liquidity 100', async function () {
//     //     // Let's initialize the pool and pylon
//     //     await addLiquidity(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//     //     // Let's transfer some tokens to the Pylon
//     //     await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
//     //     await token1.transfer(pylonInstance.address, expandTo18Decimals(5300).div(11))
//     //     //Let's initialize the Pylon, this should call two sync
//     //     await pylonInstance.initPylon(account.address)
//     //     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544454"))
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('481818181818181817181'))
//     //
//     //     let pylonRes = await pylonInstance.getSyncReserves();
//     //     console.log("Pylon Sync Reserve0: ", ethers.utils.formatEther(pylonRes[0]));
//     //     console.log("Pylon Sync Reserve1: ", ethers.utils.formatEther(pylonRes[1]));
//     //     let pairRes = await pair.getReserves()
//     //     console.log("Pylon Pair Reserve0: ", ethers.utils.formatEther(pairRes[0]))
//     //     console.log("Pylon Pair Reserve1: ", ethers.utils.formatEther(pairRes[1]))
//     //
//     //     // Let's send some tokens
//     //     const token0Amount = expandTo18Decimals(50)
//     //     await token0.transfer(pylonInstance.address, token0Amount)
//     //     // await token1.transfer(pylonInstance.address, token0Amount)
//     //     // Let's try to mint async
//     //     console.log("Sent floats:", ethers.utils.formatEther(token0Amount));
//     //     let floatBalance = await poolTokenInstance0.balanceOf(account.address);
//     //     console.log("FloatPTBalance before mint: ", ethers.utils.formatEther(floatBalance))
//     //     let uniPtt = await pair.totalSupply()
//     //     let uniPtb = await pair.balanceOf(pylonInstance.address)
//     //
//     //     console.log("Uni PTT before mint: ", ethers.utils.formatEther(uniPtt))
//     //     console.log("Uni PTB before mint: ", ethers.utils.formatEther(uniPtb))
//     //
//     //     await pylonInstance.mintAsync100(account.address, false);
//     //     // // We should receive float tokens and pylon should've minted some pair shares
//     //     // // Let's check...
//     //
//     //     uniPtt = await pair.totalSupply()
//     //     uniPtb = await pair.balanceOf(pylonInstance.address)
//     //
//     //     console.log("Uni PTT after mint: ", ethers.utils.formatEther(uniPtt))
//     //     console.log("Uni PTB after mint: ", ethers.utils.formatEther(uniPtb))
//     //
//     //
//     //     floatBalance = await poolTokenInstance0.balanceOf(account.address);
//     //     console.log("FloatPTBalance after mint: ", ethers.utils.formatEther(floatBalance))
//     //
//     //     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("203726650987666912909"))
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('481818181818181817181'))
//     //     // Now let's test to receive some anchor tokens
//     //     // await token0.transfer(pylonInstance.address, token0Amount)
//     //     console.log("Sent anchors:", ethers.utils.formatEther(token0Amount));
//     //     await token1.transfer(pylonInstance.address, token0Amount)
//     //
//     //     await pylonInstance.mintAsync100(account.address, true);
//     //
//     //     //This tx should trigger delta tax of 66% or 33 tokens (somewhat sensitive to min deltagamma fee)
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('498140827236244021391'));
//     //     // Let's check...
//     //     // expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("205399122053959623788"))
//     //     // expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('491739746157257981776'))
//     // });
//
//     it('should dump::float', async function () {
//         // Let's initialize the pool and pylon
//         await addLiquidity(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
//         await token1.transfer(pylonInstance.address, expandTo18Decimals(  5300).div(11))
//         //Let's initialize the Pylon, this should call two sync
//         await pylonInstance.initPylon(account.address)
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544454"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('481818181818181817181'))
//
//         let vab = await pylonInstance.virtualAnchorBalance();
//         let gamma = await pylonInstance.gammaMulDecimals();
//         console.log("vab", vab)
//         console.log("gamma", gamma)
//         console.log("totalSupply", await poolTokenInstance0.totalSupply())
//
//         let ftb = await poolTokenInstance0.balanceOf(account.address)
//         await poolTokenInstance0.transfer(pylonInstance.address, ftb)
//
//         await pylonInstance.burn(account2.address, false)
//         let input = expandTo18Decimals(100)
//         await token0.transfer(pair.address, input)
//         let reserves = await pair.getReserves()
//         console.log("hey", reserves[0])
//         //let outcome = (input.mul(reserves[1]).div(reserves[0])).sub(ethers.BigNumber.from('1000000000000000000'))
//         let outcome = getAmountOut(input, reserves[0],reserves[1])
//         console.log("out", outcome)
//         await token0.transfer(pair.address, input)
//         await pair.swap(0, outcome, account.address, '0x', overrides)
//         vab = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//         console.log("totalsupply", await poolTokenInstance0.totalSupply())
//         console.log("vab", vab)
//         console.log("gamma", gamma)
//         await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
//
//         await expect(pylonInstance.mintPoolTokens(account.address, false))
//
//
//         //expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("159325210871602624179"))
//
//         vab = await pylonInstance.virtualAnchorBalance();
//         gamma = await pylonInstance.gammaMulDecimals();
//         console.log("totalsupply", await poolTokenInstance0.totalSupply())
//         console.log("vab", vab)
//         console.log("gamma", gamma)
//     });
//
//
//     // it('should add async liquidity 100', async function () {
//     //     // Let's initialize the pool and pylon
//     //     await addLiquidity(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//     //     // Let's transfer some tokens to the Pylon
//     //     await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
//     //     await token1.transfer(pylonInstance.address, expandTo18Decimals(5300).div(11))
//     //     //Let's initialize the Pylon, this should call two sync
//     //     await pylonInstance.initPylon(account.address)
//     //     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544454"))
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('481818181818181817181'))
//     //
//     //     let pylonRes = await pylonInstance.getSyncReserves();
//     //     console.log("Pylon Sync Reserve0: ", ethers.utils.formatEther(pylonRes[0]));
//     //     console.log("Pylon Sync Reserve1: ", ethers.utils.formatEther(pylonRes[1]));
//     //     let pairRes = await pair.getReserves()
//     //     console.log("Pylon Pair Reserve0: ", ethers.utils.formatEther(pairRes[0]))
//     //     console.log("Pylon Pair Reserve1: ", ethers.utils.formatEther(pairRes[1]))
//     //
//     //     // Let's send some tokens
//     //     const token0Amount = expandTo18Decimals(50)
//     //     await token0.transfer(pylonInstance.address, token0Amount)
//     //     // await token1.transfer(pylonInstance.address, token0Amount)
//     //     // Let's try to mint async
//     //     console.log("Sent floats:", ethers.utils.formatEther(token0Amount));
//     //     let floatBalance = await poolTokenInstance0.balanceOf(account.address);
//     //     console.log("FloatPTBalance before mint: ", ethers.utils.formatEther(floatBalance))
//     //     let uniPtt = await pair.totalSupply()
//     //     let uniPtb = await pair.balanceOf(pylonInstance.address)
//     //
//     //     console.log("Uni PTT before mint: ", ethers.utils.formatEther(uniPtt))
//     //     console.log("Uni PTB before mint: ", ethers.utils.formatEther(uniPtb))
//     //
//     //     await pylonInstance.mintAsync100(account.address, false);
//     //     // // We should receive float tokens and pylon should've minted some pair shares
//     //     // // Let's check...
//     //
//     //     uniPtt = await pair.totalSupply()
//     //     uniPtb = await pair.balanceOf(pylonInstance.address)
//     //
//     //     console.log("Uni PTT after mint: ", ethers.utils.formatEther(uniPtt))
//     //     console.log("Uni PTB after mint: ", ethers.utils.formatEther(uniPtb))
//     //
//     //
//     //     floatBalance = await poolTokenInstance0.balanceOf(account.address);
//     //     console.log("FloatPTBalance after mint: ", ethers.utils.formatEther(floatBalance))
//     //
//     //     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("203726650987666912909"))
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('481818181818181817181'))
//     //     // Now let's test to receive some anchor tokens
//     //     // await token0.transfer(pylonInstance.address, token0Amount)
//     //     console.log("Sent anchors:", token0Amount.toString());
//     //     await token1.transfer(pylonInstance.address, token0Amount)
//     //
//     //     await saveValuesForSDK()
//     //     await pylonInstance.mintAsync100(account.address, true);
//     //
//     //     //This tx should trigger delta tax of 66% or 33 tokens (somewhat sensitive to min deltagamma fee)
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('498140827236244021391'));
//     //     // Let's check...
//     //     // expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("205399122053959623788"))
//     //     // expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('491739746157257981776'))
//     // });
//
// })
