// const { expect } = require("chai");
// const { ethers } = require('hardhat');
// const assert = require("assert");
// const {BigNumber} = require("ethers");
// const {expandTo18Decimals, getAmountOut, format, sqrt, findDeviation, calculateOmega, getFtv} = require("./shared/utils");
// const {coreFixtures, librarySetup} = require("./shared/fixtures");
// const {initPylon, printState, printPoolTokens, printPairState, getPTPrice, burn, burnAsync, forwardTime, unblockOracle, mintAsync, mintSync, setPrice, updateMint} = require("./shared/commands");
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
//
//
// })
