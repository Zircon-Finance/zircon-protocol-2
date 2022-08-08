

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
    pair;

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
const overrides = {
    gasLimit: 9999999
}

async function addLiquidity(token0Amount, token1Amount) {
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)
    await pair.mint(account.address)
}


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

    //     feeValueAnchor: BigintIsh,
    //     lastBlockNumber: BigintIsh,
    const printValues = async () => {
        console.log("VALUES WE NEED");
        let pylonRes = await pylonInstance.getSyncReserves();
        console.log("\nPylon Sync Reserve0 after mint: ", pylonRes[0].toString());
        console.log("Pylon Sync Reserve1 after mint: ", pylonRes[1].toString());

        let pairResIni = await pair.getReserves();
        console.log("Pylon Pair Reserve0 after initPylon: ", (pairResIni[0].toString()))
        console.log("Pylon Pair Reserve1 after initPylon: ", (pairResIni[1].toString()))

        let ptb = await pair.balanceOf(pylonInstance.address);
        let ptt = await pair.totalSupply();
        console.log("ptb: ", (ptb.toString()));
        console.log("ptt: ", (ptt.toString()));

        let ftt = await poolTokenInstance0.totalSupply();
        let att = await poolTokenInstance1.totalSupply();
        console.log("ftt: ", (ftt.toString()));
        console.log("att: ", (att.toString()));

        let gamma = await pylonInstance.gammaMulDecimals()
        console.log("gamma: ", (gamma.toString()));

        let muuu = await pylonInstance.muMulDecimals()
        console.log("muuu: ", (muuu.toString()));

        let vab = await pylonInstance.virtualAnchorBalance()
        console.log("vab: ", (vab.toString()));

        let gEMA = await pylonInstance.gammaEMA()
        console.log("gEMA: ", (gEMA.toString()));

        let EMABlockNumber = await pylonInstance.EMABlockNumber()
        console.log("EMABlockNumber: ", (EMABlockNumber.toString()));

        let eRevAddress = await pylonInstance.energyRevAddress()
        let energyRev = (await ethers.getContractFactory('ZirconEnergyRevenue')).attach(eRevAddress);
        let feeValueAnchor1 = await energyRev.pylon1Balance()
        let feeValueAnchor0 = await energyRev.pylon0Balance()
        console.log("feeValueAnchor1: ", (feeValueAnchor1.toString()));
        console.log("feeValueAnchor0: ", (feeValueAnchor0.toString()));

        let feeValueAnchor = await pylonInstance.energyRevAddress()
        let thisBlockEMA = await pylonInstance.thisBlockEMA()
        console.log("thisBlockEMA: ", (thisBlockEMA.toString()));

        let strikeBlock = await pylonInstance.strikeBlock()
        console.log("strikeBlock: ", (strikeBlock.toString()));

        let block = await ethers.provider.getBlockNumber()
        console.log("blockNumber: ", block)

        console.log("END VALUES")
    }
//     // Let's try to calculate some cases for pylon
//     // TODO: recheck the values, they are way to similar
//     // const mintTestCases = [
//     //     [5, 10, '4625004224854010', '4749990617651023','148764938113096088','99999999999999000', false],
//     //     [10, 5, '4749999999999999', '4624999999999999','99999999999999000', '148765121965639520', true],
//     //     [5, 10, '2374999999999999', '9249999999999997','49999999999999000', '149756841739232199', true],
//     //     [10, 10, '9250004224858901', '4749995308820878','199256623189905469', '99999999999999000', false],
//     //     [1000, 1000, '475000000000000000', '925000000000000000','9999999999999999000', '19925671603971329722', true],
//     // ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : expandTo18Decimals(n))))
//     // mintTestCases.forEach((mintCase, i) => {
//     //     it(`mintPylon:${i}`, async () => {
//     //         const [token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor] = mintCase
//     //         // Add some liquidity to the Pair...
//     //         await addLiquidity(token0Amount, token1Amount)
//     //         let pairRes1 = await pair.getReserves()
//     //         console.log("Pylon Pair Reserve0: ", ethers.utils.formatEther(pairRes1[0]))
//     //         console.log("Pylon Pair Reserve1: ", ethers.utils.formatEther(pairRes1[1]))
//     //         // Transferring some tokens
//     //         let maxSync = await factoryPylonInstance.maximumPercentageSync();
//     //         console.log("maxSync: ", maxSync);
//     //         await token0.transfer(pylonInstance.address, token0Amount.div(100))
//     //         await token1.transfer(pylonInstance.address, token1Amount.div(100))
//     //         console.log("Mint test token0Amount: ", ethers.utils.formatEther(token0Amount.div(100)));
//     //         console.log("Mint test token1Amount: ", ethers.utils.formatEther(token1Amount.div(100)));
//     //         // Let's start the pylon
//     //         await pylonInstance.initPylon(account.address)
//     //         // Transferring some liquidity to pylon
//     //         let pylonRes = await pylonInstance.getSyncReserves();
//     //         console.log("Pylon Sync Reserve0: ", ethers.utils.formatEther(pylonRes[0]));
//     //         console.log("Pylon Sync Reserve1: ", ethers.utils.formatEther(pylonRes[1]));
//     //         let pairRes = await pair.getReserves()
//     //         console.log("Pylon Pair Reserve0: ", ethers.utils.formatEther(pairRes[0]))
//     //         console.log("Pylon Pair Reserve1: ", ethers.utils.formatEther(pairRes[1]))
//     //
//     //         console.log("=======\nCreation gamma: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()))
//     //
//     //         console.log("balanceOfPooltoken1 premint: ", ethers.utils.formatEther(await poolTokenInstance1.balanceOf(account.address)));
//     //         console.log("balanceOfPooltoken0 premint: ", ethers.utils.formatEther(await poolTokenInstance0.balanceOf(account.address)));
//     //
//     //         if (isAnchor) {
//     //             let t = token0Amount.div(100)
//     //             console.log("Mint test token1Amount for second mint: ", t);
//     //             await token1.transfer(pylonInstance.address, t)
//     //         }else{
//     //             let t = token1Amount.div(100)
//     //             console.log("Mint test token0Amount for second mint: ", t);
//     //             await token0.transfer(pylonInstance.address, t)
//     //         }
//     //
//     //         await printValues()
//     //
//     //         // Minting some float/anchor tokens
//     //
//     //         await expect(pylonInstance.mintPoolTokens(account.address, isAnchor))
//     //             .to.emit(pylonInstance, 'PylonUpdate')
//     //             .withArgs(expectedRes0, expectedRes1);
//     //
//     //
//     //         let pylonRes2 = await pylonInstance.getSyncReserves();
//     //         console.log("Pylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes2[0]));
//     //         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes2[1]));
//     //         let pairRes2 = await pair.getReserves()
//     //         console.log("Pylon Pair Reserve0 after mint: ", ethers.utils.formatEther(pairRes2[0]))
//     //         console.log("Pylon Pair Reserve1 after mint: ", ethers.utils.formatEther(pairRes2[1]))
//     //
//     //         console.log("Reserve diff0", ethers.utils.formatEther(pairRes2[0].sub(pairRes[0])));
//     //         console.log("Reserve diff1", ethers.utils.formatEther(pairRes2[1].sub(pairRes[1])));
//     //
//     //         console.log("Post mint gamma: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()))
//     //         // Let's check the balances, float
//     //         // expect(await pylonInstance.gammaMulDecimals()).to.eq(ethers.BigNumber.from('1000000000000000000'));
//     //         console.log("balanceOfInstance1: ", ethers.utils.formatEther(await poolTokenInstance1.balanceOf(account.address)));
//     //         console.log("expectedOutput1: ", ethers.utils.formatEther(expectedOutputAmount1));
//     //
//     //         console.log("balanceOfInstance0: ", ethers.utils.formatEther(await poolTokenInstance0.balanceOf(account.address)));
//     //         console.log("expectedOutput0: ", ethers.utils.formatEther(expectedOutputAmount0));
//     //         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(expectedOutputAmount1);
//     //         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(expectedOutputAmount0);
//     //         // Anchor
//     //     })
//     // })  // Let's try to calculate some cases for pylon
//
// //     it('Fee assignment + mu Test', async function () {
// //         let token0Amount = expandTo18Decimals(1700)
// //         let token1Amount = expandTo18Decimals(5300)
// //         await addLiquidity(token0Amount, token1Amount)
// //
// //         let pairRes = await pair.getReserves();
// //         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
// //         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
// //
// //         // Let's transfer some tokens to the Pylon
// //         await token0.transfer(pylonInstance.address, token0Amount.div(100))
// //         await token1.transfer(pylonInstance.address, token1Amount.div(100))
// //         //Let's initialize the Pylon, this should call two sync
// //         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount.div(100)));
// //         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount.div(100)));
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
// //
// //         let gamma = await pylonInstance.gammaMulDecimals()
// //         console.log("gamma: ", ethers.utils.formatEther(gamma));
// //
// //         let muuu = await pylonInstance.muMulDecimals()
// //         console.log("muuu: ", ethers.utils.formatEther(muuu));
// //
// //         //await expect(gamma).to.eq(ethers.BigNumber.from("277500000000000000")) // 473684210526315789
// //
// //         //We swap a token and then reverse it to create fees while having the same gamma
// //
// //         //Swapping 1% of pool
// //         let input = pairRes[0].div(100);
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
// //
// //         pairRes = await pair.getReserves();
// //         console.log("Pylon Pair Reserve0 after first swap: ", ethers.utils.formatEther(pairRes[0]))
// //         console.log("Pylon Pair Reserve1 after first swap: ", ethers.utils.formatEther(pairRes[1]))
// //
// //
// //         //Second swap
// //
// //         input = balance1New.sub(balance1);
// //         console.log("input to second swap: ", ethers.utils.formatEther(input))
// //         outcome = getAmountOut(input, pairRes[1], pairRes[0]);
// //         await token1.transfer(pair.address, input);
// //         await pair.swap(outcome, 0, account.address, '0x', overrides)
// //
// //         let balanceDiff = (await token0.balanceOf(account.address)).sub(balance);
// //         console.log("postSwap2 token0 balance: ", ethers.utils.formatEther(balanceDiff));
// //
// //         let balance1Diff = (await token1.balanceOf(account.address)).sub(balance1);
// //         console.log("postSwap2 token1 balance: ", ethers.utils.formatEther(balance1Diff));
// //
// //         pairRes = await pair.getReserves();
// //         console.log("Pylon Pair Reserve0 after second swap: ", ethers.utils.formatEther(pairRes[0]))
// //         console.log("Pylon Pair Reserve1 after second swap: ", ethers.utils.formatEther(pairRes[1]))
// //
// //         let kprime = pairRes[0].mul(pairRes[1]);
// //         let k = pairResIni[0].mul(pairResIni[1]);
// //
// //         expect(kprime).to.gt(k);
// //
// //         console.log("mu before new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
// //         console.log("gamma before new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
// //         console.log("vab before new token: ", ethers.utils.formatEther(await pylonInstance.virtualAnchorBalance()));
// //
// //
// //         //Need to mint twice to see results. The first calls mintFee, the second assigns them to the pool
// //         await token0.transfer(pylonInstance.address, token0Amount.div(20000))
// //         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
// //         pair.swap(outcome, 0, account.address, '0x', overrides)
// //
// //         pylonInstance.mintPoolTokens(account.address, false)
// //
// //         await token0.transfer(pylonInstance.address, token0Amount.div(20000))
// //         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
// //         await pylonInstance.mintPoolTokens(account.address, false)
// //
// //
// //         console.log("mu after new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
// //         console.log("gamma after new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
// //         let vab = await pylonInstance.virtualAnchorBalance();
// //         console.log("vab after new token: ", ethers.utils.formatEther(vab));
// //         console.log(token0.address);
// //         //We swapped slightly less than 1% of the pool, vab should be increased by
// //         // 50% (gamma) * 1% (swap amount) * 0.3% (fee) * 1% (pylon ownership) * 5/6 (mintfee)
// //         expect(vab).to.eq(ethers.BigNumber.from("53001252067667698169"));
// //
// //
// //     });
// //
//     it('Change mu Test', async function () {
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
//         //Let's initialize the Pylon, this should call two sync
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
//         //Pylon initialized. Now we advance time by muSamplingPeriod
//
//         let blockNumber = await ethers.provider.getBlockNumber()
//         let blocksToMine = await factoryPylonInstance.muUpdatePeriod();
//         await ethers.provider.send("hardhat_mine", [blocksToMine.add(1).toHexString()]);
//
//         let newBlockNumber = await ethers.provider.getBlockNumber();
//
//         console.log("newBN, oldBN diff:", newBlockNumber - blockNumber);
//
//         let gamma = await pylonInstance.gammaMulDecimals()
//         console.log("gamma: ", ethers.utils.formatEther(gamma));
//         //await expect(gamma).to.eq(ethers.BigNumber.from("277500000000000000")) // 473684210526315789
//
//         //We swap a token, force a sync(), roll time forward again, reverse the swap
//
//         //Swapping 25% of pool to create large gamma change
//         let input = pairRes[0].div(4);
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
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after first swap: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after first swap: ", ethers.utils.formatEther(pairRes[1]))
//
//         //Mint dust tokens to force sync
//         //Should assign according to new gamma
//
//         //Need to advance time again because of deltaGamma protection
//
//         await ethers.provider.send("hardhat_mine", [blocksToMine.div(10).toHexString()]);
//
//         console.log("mu before new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
//         console.log("gamma before new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
//         console.log("vab before new token: ", ethers.utils.formatEther(await pylonInstance.virtualAnchorBalance()));
//
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//         await pylonInstance.mintPoolTokens(account.address, false)
//
//         console.log("mu after new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
//         console.log("gamma after new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
//         let vab = await pylonInstance.virtualAnchorBalance();
//         console.log("vab after new token: ", ethers.utils.formatEther(vab));
//
//         //Advance time again
//
//         await ethers.provider.send("hardhat_mine", [blocksToMine.add(1).toHexString()]);
//
//         //Second swap
//         //Reduce amount to better see effect of mu
//
//         input = (balance1New.sub(balance1)).div(2);
//         console.log("input to second swap: ", ethers.utils.formatEther(input))
//         pairRes = await pair.getReserves();
//         outcome = getAmountOut(input, pairRes[1], pairRes[0]);
//         await token1.transfer(pair.address, input);
//         await pair.swap(outcome, 0, account.address, '0x', overrides)
//
//         let balanceDiff = (await token0.balanceOf(account.address)).sub(balance);
//         console.log("postSwap2 token0 balance: ", ethers.utils.formatEther(balanceDiff));
//
//         let balance1Diff = (await token1.balanceOf(account.address)).sub(balance1);
//         console.log("postSwap2 token1 balance: ", ethers.utils.formatEther(balance1Diff));
//
//         pairRes = await pair.getReserves();
//         console.log("Pylon Pair Reserve0 after second swap: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1 after second swap: ", ethers.utils.formatEther(pairRes[1]))
//
//         console.log("Swap2 mu before new token: ", ethers.utils.formatEther(await pylonInstance.muMulDecimals()));
//         console.log("Swap2 gamma before new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
//         console.log("Swap2 vab before new token: ", ethers.utils.formatEther(await pylonInstance.virtualAnchorBalance()));
//
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//         await pylonInstance.mintPoolTokens(account.address, false)
//
//         let mu = await pylonInstance.muMulDecimals();
//         console.log("Swap2 mu after new token: ", ethers.utils.formatEther(mu));
//         console.log("Swap2 gamma after new token: ", ethers.utils.formatEther(await pylonInstance.gammaMulDecimals()));
//         vab = await pylonInstance.virtualAnchorBalance();
//         console.log("Swap2 vab after new token: ", ethers.utils.formatEther(vab));
//
//         //Gamma moved by 5% to 0.45, we expect mu to change by 5%* 5%*3 = 0.0075 (ish)
//         expect(mu).to.eq(ethers.BigNumber.from("408503052279670093"));
//
//
//     });
//
//     // it('Delta Gamma test', async function () {
//     //     let token0Amount = expandTo18Decimals(1700)
//     //     let token1Amount = expandTo18Decimals(5300)
//     //     await addLiquidity(token0Amount, token1Amount)
//     //
//     //     let pairRes = await pair.getReserves();
//     //     console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
//     //     console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
//     //
//     //     // Let's transfer some tokens to the Pylon
//     //     await token0.transfer(pylonInstance.address, token0Amount.div(100))
//     //     await token1.transfer(pylonInstance.address, token1Amount.div(100))
//     //
//     //     // Let's initialize the Pylon, this should call two sync
//     //     console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount.div(100)));
//     //     console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount.div(100)));
//     //     await pylonInstance.initPylon(account.address)
//     //
//     //     let pylonRes = await pylonInstance.getSyncReserves();
//     //     console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes[0]));
//     //     console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes[1]));
//     //
//     //     let ptb = await pair.balanceOf(pylonInstance.address);
//     //     let ptt = await pair.totalSupply();
//     //     console.log("ptb: ", ethers.utils.formatEther(ptb));
//     //     console.log("ptt: ", ethers.utils.formatEther(ptt));
//     //
//     //     let pairResIni = await pair.getReserves();
//     //     console.log("Pylon Pair Reserve0 after initPylon: ", ethers.utils.formatEther(pairResIni[0]))
//     //     console.log("Pylon Pair Reserve1 after initPylon: ", ethers.utils.formatEther(pairResIni[1]))
//     //
//     //     // Pylon initialized.
//     //
//     //     // We first try a massive swap + small syncMint. Should pass
//     //
//     //     // 12% of pool swap
//     //     let input = pairRes[0].div(4);
//     //     await token0.transfer(pair.address, input)
//     //
//     //     let balance = await token0.balanceOf(account.address);
//     //     console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//     //     let balance1 = await token1.balanceOf(account.address);
//     //     console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//     //
//     //     let outcome = getAmountOut(input, pairRes[0], pairRes[1])
//     //     await pair.swap(0, outcome, account.address, '0x', overrides)
//     //
//     //     let balanceNew = await token0.balanceOf(account.address);
//     //     console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//     //     let balance1New = await token1.balanceOf(account.address);
//     //     console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//     //
//     //
//     //     pairRes = await pair.getReserves();
//     //     console.log("Pylon Pair Reserve0 after first swap: ", ethers.utils.formatEther(pairRes[0]))
//     //     console.log("Pylon Pair Reserve1 after first swap: ", ethers.utils.formatEther(pairRes[1]))
//     //
//     //
//     //     let gammaEMA = await pylonInstance.gammaEMA();
//     //     let thisBlockEMA = await pylonInstance.thisBlockEMA();
//     //     let strikeBlock = await pylonInstance.strikeBlock();
//     //
//     //     console.log("GammaEMA before: ", ethers.utils.formatEther(gammaEMA))
//     //     console.log("thisblockEMA before: ", ethers.utils.formatEther(thisBlockEMA))
//     //     console.log("strikeBlock before: ", strikeBlock.toBigInt())
//     //
//     //
//     //     await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//     //     // await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//     //     await pylonInstance.mintPoolTokens(account.address, false)
//     //
//     //
//     //     gammaEMA = await pylonInstance.gammaEMA();
//     //     thisBlockEMA = await pylonInstance.thisBlockEMA();
//     //     strikeBlock = await pylonInstance.strikeBlock();
//     //
//     //     let blockNumber = await ethers.provider.getBlockNumber()
//     //
//     //     console.log("GammaEMA after: ", ethers.utils.formatEther(gammaEMA))
//     //     console.log("thisblockEMA after: ", ethers.utils.formatEther(thisBlockEMA))
//     //     console.log("strikeBlock after: ", strikeBlock.toBigInt())
//     //
//     //     expect(thisBlockEMA).to.eq(ethers.BigNumber.from("98821055882662832"));
//     //     expect(strikeBlock).to.eq(blockNumber);
//     //
//     //     // Advance time to reset this block ema. GammaEMA should also bleed to zero
//     //
//     //     let blocksToMine = await factoryPylonInstance.muUpdatePeriod(); //random but should do the trick here
//     //     await ethers.provider.send("hardhat_mine", [blocksToMine.add(1).toHexString()]);
//     //
//     //     // Then we do a mint async100 + small syncMint. Should fail
//     //
//     //     token0Amount = pairRes[0].div(4);
//     //     await token0.transfer(pylonInstance.address, token0Amount)
//     //
//     //     gammaEMA = await pylonInstance.gammaEMA();
//     //     thisBlockEMA = await pylonInstance.thisBlockEMA();
//     //     strikeBlock = await pylonInstance.strikeBlock();
//     //
//     //     console.log("GammaEMA before mint async: ", ethers.utils.formatEther(gammaEMA))
//     //     console.log("thisblockEMA before mint async: ", ethers.utils.formatEther(thisBlockEMA))
//     //     console.log("strikeBlock before mint async: ", strikeBlock.toBigInt())
//     //
//     //     await pylonInstance.mintAsync100(account.address, false);
//     //
//     //     gammaEMA = await pylonInstance.gammaEMA();
//     //     thisBlockEMA = await pylonInstance.thisBlockEMA();
//     //     strikeBlock = await pylonInstance.strikeBlock();
//     //
//     //     //These actually read old values, which is expected
//     //
//     //     console.log("GammaEMA after mint async: ", ethers.utils.formatEther(gammaEMA))
//     //     console.log("thisblockEMA after mint async: ", ethers.utils.formatEther(thisBlockEMA))
//     //     console.log("strikeBlock after mint async: ", strikeBlock.toBigInt())
//     //     //But strikeBlock is set in _update() so consumes a strike
//     //     //Now it reads the mintAsync gamma change and fails any interaction
//     //     await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//     //     //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//     //     await expect(pylonInstance.mintPoolTokens(account.address, false)).to.be.revertedWith("ZP: FTH")
//     //
//     // });
// // //
// // //
// //     it('Delta Gamma test 2', async function () {
// //         let token0Amount = expandTo18Decimals(1700)
// //         let token1Amount = expandTo18Decimals(5300)
// //         await addLiquidity(token0Amount, token1Amount)
// //
// //         let pairRes = await pair.getReserves();
// //         console.log("Pylon Pair Reserve0 initial: ", ethers.utils.formatEther(pairRes[0]))
// //         console.log("Pylon Pair Reserve1 initial: ", ethers.utils.formatEther(pairRes[1]))
// //
// //         // Let's transfer some tokens to the Pylon
// //         await token0.transfer(pylonInstance.address, token0Amount.div(100))
// //         await token1.transfer(pylonInstance.address, token1Amount.div(100))
// //         //Let's initialize the Pylon, this should call two sync
// //         console.log("token0Amount init: ", ethers.utils.formatEther(token0Amount.div(100)));
// //         console.log("token1Amount init: ", ethers.utils.formatEther(token1Amount.div(100)));
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
// //         //We now do massive swap + mint async to counterbalance. Subsequent mint still shouldn't pass
// //
// //         //12% of pool swap
// //         let input = pairRes[0].div(4);
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
// //
// //         pairRes = await pair.getReserves();
// //         console.log("Pylon Pair Reserve0 after first swap: ", ethers.utils.formatEther(pairRes[0]))
// //         console.log("Pylon Pair Reserve1 after first swap: ", ethers.utils.formatEther(pairRes[1]))
// //
// //
// //         //Now the mint async
// //         // We do it with the other token
// //
// //         token1Amount = pairRes[1].div(4);
// //         await token1.transfer(pylonInstance.address, token1Amount)
// //         console.log("token0Amount: ", token1Amount.toString());
// //
// //
// //         gammaEMA = await pylonInstance.gammaEMA();
// //         thisBlockEMA = await pylonInstance.thisBlockEMA();
// //         strikeBlock = await pylonInstance.strikeBlock();
// //
// //         console.log("GammaEMA before mint async: ", ethers.utils.formatEther(gammaEMA))
// //         console.log("thisblockEMA before mint async: ", ethers.utils.formatEther(thisBlockEMA))
// //         console.log("strikeBlock before mint async: ", strikeBlock.toBigInt())
// //
// //         await printValues()
// //         await pylonInstance.mintAsync100(account.address, true);
// //
// //         gammaEMA = await pylonInstance.gammaEMA();
// //         thisBlockEMA = await pylonInstance.thisBlockEMA();
// //         strikeBlock = await pylonInstance.strikeBlock();
// //
// //         console.log("GammaEMA after mint async: ", ethers.utils.formatEther(gammaEMA))
// //         console.log("thisblockEMA after mint async: ", ethers.utils.formatEther(thisBlockEMA))
// //         console.log("strikeBlock after mint async: ", strikeBlock.toBigInt())
// //
// //         //Should've hit the strike
// //
// //         let blockNumber = await ethers.provider.getBlockNumber();
// //
// //         expect(strikeBlock).to.eq(blockNumber);
// //         //And we shouldn't be able to do more operations
// //
// //         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
// //         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
// //         await expect(pylonInstance.mintPoolTokens(account.address, false)).to.be.revertedWith("ZP: FTH")
// //
// //
// //         //Now we send an absolutely gargantuan swap, wait for lockdown and then begin a cycle adding 3% of pool liquidity every block.
// //
// //         //Pool should be in lockdown for about 20 blocks or so. Then the 3% should keep gammaEMA somewhat high but easily below threshold
// //
// //         //Advance time to reset EMAs.
// //
// //         let blocksToMine = await factoryPylonInstance.muUpdatePeriod(); //random but should do the trick here
// //         await ethers.provider.send("hardhat_mine", [blocksToMine.toHexString()]);
// //
// //         console.log("\n===GammaEMA Cycle=====\n")
// //
// //         //200% of pool
// //         input = pairRes[0].mul(4);
// //         await token0.transfer(pair.address, input)
// //
// //         balance = await token0.balanceOf(account.address);
// //         console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
// //         balance1 = await token1.balanceOf(account.address);
// //         console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
// //
// //         outcome = getAmountOut(input, pairRes[0], pairRes[1])
// //         await pair.swap(0, outcome, account.address, '0x', overrides)
// //
// //         balanceNew = await token0.balanceOf(account.address);
// //         console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
// //         balance1New = await token1.balanceOf(account.address);
// //         console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
// //
// //
// //         pairRes = await pair.getReserves();
// //         console.log("Pylon Pair Reserve0 after first swap: ", ethers.utils.formatEther(pairRes[0]))
// //         console.log("Pylon Pair Reserve1 after first swap: ", ethers.utils.formatEther(pairRes[1]))
// //
// //
// //         //Send tokens to trigger strike
// //
// //         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
// //         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
// //         await pylonInstance.mintPoolTokens(account.address, false)
// //
// //         let i = 1;
// //
// //         let blockNumberIni = await ethers.provider.getBlockNumber();
// //         for(i; i < 30; i+= 1) {
// //             //Advance by a block, try to enter pool
// //
// //             await ethers.provider.send("evm_mine");
// //
// //             blockNumber = await ethers.provider.getBlockNumber();
// //             console.log("advanced, blockNumber: ", blockNumber);
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
// //                 await token0.transfer(pylonInstance.address, token0Amount.div(10000))
// //                 //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
// //                 await pylonInstance.mintPoolTokens(account.address, false)
// //
// //                 gammaEMA = await pylonInstance.gammaEMA();
// //                 thisBlockEMA = await pylonInstance.thisBlockEMA();
// //                 strikeBlock = await pylonInstance.strikeBlock();
// //
// //                 console.log("GammaEMA after cycle: ", ethers.utils.formatEther(gammaEMA))
// //                 console.log("thisblockEMA after cycle: ", ethers.utils.formatEther(thisBlockEMA))
// //                 console.log("strikeBlock after cycle: ", strikeBlock.toBigInt())
// //
// //             } catch(e) {
// //                 continue;
// //             }
// //             break;
// //
// //         }
// //
// //         console.log("Finished cycle, i: ", i);
// //         blockNumber = await ethers.provider.getBlockNumber();
// //         //It's only supposed to unlock after at least 10 blocks
// //         //It's still a partial unlock with 90% fee
// //
// //         expect(blockNumber - blockNumberIni).to.gt(10);
// //
// //
// //     });
// // //
//     it('Delta Gamma test 3', async function () {
//
//         //We now test the multi-block manipulation
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
//         await token0.transfer(pylonInstance.address, token0Amount.div(100))
//         await token1.transfer(pylonInstance.address, token1Amount.div(100))
//         //Let's initialize the Pylon, this should call two sync
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
//         //Pylon initialized.
//
//         //We send a moderately large amount to trip thisBlock
//
//         pairRes = await pair.getReserves();
//         let input = pairRes[0].div(10);
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
//         gammaEMA = await pylonInstance.gammaEMA();
//         thisBlockEMA = await pylonInstance.thisBlockEMA();
//         strikeBlock = await pylonInstance.strikeBlock();
//
//         console.log("GammaEMA before cycle: ", ethers.utils.formatEther(gammaEMA))
//         console.log("thisblockEMA before cycle: ", ethers.utils.formatEther(thisBlockEMA))
//         console.log("strikeBlock before cycle: ", strikeBlock.toBigInt())
//
//
//         //Token mint for syncing
//         await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//         //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//         await pylonInstance.mintPoolTokens(account.address, false)
//
//         gammaEMA = await pylonInstance.gammaEMA();
//         thisBlockEMA = await pylonInstance.thisBlockEMA();
//         strikeBlock = await pylonInstance.strikeBlock();
//
//         //We begin a cycle where we swap a bit less than 4% gamma of pool back and forth
//         //mine_block seems to work like shit, skipping 3 blocks at a time instead of 1
//         //We shouldn't trip gammaEMA after 5 cycles or so
//
//         let i = 1
//         let blockNumberIni = await ethers.provider.getBlockNumber();
//
//         for(i; i < 5; i+= 1) {
//             //Advance by a block, try to enter pool
//
//             await ethers.provider.send("evm_mine");
//
//             let blockNumber = await ethers.provider.getBlockNumber();
//             console.log("advanced, blockNumber: ", blockNumber);
//
//             //5% of pool
//
//             if(i % 2 == 0) {
//
//                 pairRes = await pair.getReserves();
//                 let input = pairRes[0].div(13);
//                 await token0.transfer(pair.address, input)
//
//                 let balance = await token0.balanceOf(account.address);
//                 console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//                 let balance1 = await token1.balanceOf(account.address);
//                 console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//                 let outcome = getAmountOut(input, pairRes[0], pairRes[1])
//                 await pair.swap(0, outcome, account.address, '0x', overrides)
//
//                 let balanceNew = await token0.balanceOf(account.address);
//                 console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//                 let balance1New = await token1.balanceOf(account.address);
//                 console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//
//             } else {
//                 pairRes = await pair.getReserves();
//                 let input = pairRes[1].div(13);
//                 await token1.transfer(pair.address, input)
//
//                 let balance = await token0.balanceOf(account.address);
//                 console.log("preSwap balance token0: ", ethers.utils.formatEther(balance));
//                 let balance1 = await token1.balanceOf(account.address);
//                 console.log("preSwap balance token1: ", ethers.utils.formatEther(balance1));
//
//                 let outcome = getAmountOut(input, pairRes[1], pairRes[0])
//                 await pair.swap(outcome, 0, account.address, '0x', overrides)
//
//                 let balanceNew = await token0.balanceOf(account.address);
//                 console.log("postSwap1 balance token0: ", ethers.utils.formatEther(balanceNew));
//                 let balance1New = await token1.balanceOf(account.address);
//                 console.log("postSwap1 balance token1: ", ethers.utils.formatEther(balance1New));
//             }
//
//
//             pairRes = await pair.getReserves();
//             console.log("Pylon Pair Reserve0 after first swap: ", ethers.utils.formatEther(pairRes[0]))
//             console.log("Pylon Pair Reserve1 after first swap: ", ethers.utils.formatEther(pairRes[1]))
//
//
//
//             try {
//
//                 gammaEMA = await pylonInstance.gammaEMA();
//                 thisBlockEMA = await pylonInstance.thisBlockEMA();
//                 strikeBlock = await pylonInstance.strikeBlock();
//
//                 console.log("GammaEMA before cycle: ", ethers.utils.formatEther(gammaEMA))
//                 console.log("thisblockEMA before cycle: ", ethers.utils.formatEther(thisBlockEMA))
//                 console.log("strikeBlock before cycle: ", strikeBlock.toBigInt())
//
//
//                 //Token mint for syncing
//                 await token0.transfer(pylonInstance.address, token0Amount.div(10000))
//                 //await token1.transfer(pylonInstance.address, token0Amount.div(1000))
//
//                 console.log("Token0Amount: ", (token0Amount.div(10000)).toString())
//                 await printValues()
//                 await pylonInstance.mintPoolTokens(account.address, false)
//                 let gamma = await pylonInstance.gammaMulDecimals();
//                 let vab = await pylonInstance.virtualAnchorBalance();
//                 gammaEMA = await pylonInstance.gammaEMA();
//                 thisBlockEMA = await pylonInstance.thisBlockEMA();
//                 strikeBlock = await pylonInstance.strikeBlock();
//
//                 console.log("VAB after cycle: ", vab.toString())
//                 console.log("Gamma after cycle: ", gamma.toString())
//                 console.log("GammaEMA after cycle: ", ethers.utils.formatEther(gammaEMA))
//                 console.log("thisblockEMA after cycle: ", ethers.utils.formatEther(thisBlockEMA))
//                 console.log("strikeBlock after cycle: ", strikeBlock.toBigInt())
//
//                 // if(strikeBlock != 0n) {
//                 //     i+=1;
//                 //     break;
//                 // }
//
//             } catch(e) {
//                 i+=1;
//                 break;
//             }
//
//         }
//
//         //Should've hit the strike
//
//         let blockNumber = await ethers.provider.getBlockNumber();
//
//         console.log("Finished cycle, i: ", i);
//         blockNumber = await ethers.provider.getBlockNumber();
//
//         expect(i).to.eq(5);
//
//
//     });
// //
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
//         await expect(gamma).to.eq(ethers.BigNumber.from("277500000000000000")) // 473684210526315789
//         await token0.transfer(pylonInstance.address, expandTo18Decimals(4))
//         await token1.transfer(pylonInstance.address, expandTo18Decimals(4))
//         await pylonInstance.mintPoolTokens(account.address, false)
//         // await token0.transfer(pylonInstance.address, token0Amount.div(100000))
//         //
//         // await pylonInstance.mintAsync100(account.address, false)
//         //
//         // await token0.transfer(pylonInstance.address, token0Amount.div(100000))
//         //
//         // await pylonInstance.mintAsync100(account.address, false)
//
//
//         let gamma2 = await pylonInstance.gammaMulDecimals()
//         console.log("gamma after mint: ", ethers.utils.formatEther(gamma2));
//
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
//         await expect(gamma2).to.eq(ethers.BigNumber.from("282409814351996217")) // 473684210526315789
//
//         await expect(pylonInstance.mintPoolTokens(account.address, true))
//         gamma = await pylonInstance.gammaMulDecimals()
//         await expect(gamma).to.eq(ethers.BigNumber.from("282409814351996217"))
//
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("33289645407723808151"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("481818181818181817181"))
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
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544763"))
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
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("158545053722499853169"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("485817781817153124049"))
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
//             .withArgs(ethers.BigNumber.from("14846819200972104582"), ethers.BigNumber.from('22946586212897978093'))
//
//         pylonRes2 = await pylonInstance.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after mint: ", ethers.utils.formatEther(pylonRes2[0]));
//         console.log("Pylon Sync Reserve1 after mint: ", ethers.utils.formatEther(pylonRes2[1]));
//
//         // Same pair tokens as before on pylon...
//         expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from("262350464280998200022"))
//
//         // Let's send some anchor token
//         // Pylon should mint some pair tokens
//         const newAmount1 = expandTo18Decimals(8)
//         await token1.transfer(pylonInstance.address, newAmount1)
//         await expect(pylonInstance.mintPoolTokens(account.address, true))
//             .to.emit(pylonInstance, 'MintAT')
//             .to.emit(pylonInstance, 'PylonUpdate')
//             .withArgs(ethers.BigNumber.from("12349172410457972236"), ethers.BigNumber.from("23159979763112582815"))
//         // We increase pylon float reserves by 242.5*1e18 and we minted that quantity for the user
//         // And we donated to the pair 257.5*1e18
//         // For a total of 500*1e18
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("163543849408245066508"))
//         // We increased pylon anchor reserves by 764 and we minted that quantity for the user
//         // And we didn't donate...
//         // We minted some more pool shares for the pylon for 165*1e18 float and 516*1e18 anchor
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("493816981812518817232"))
//         // And here Pylon increased the pair share 516*totalSupply/reserves1 ->
//         expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from("266760247790732736210"));
//     });
//
//     // it('should test mint async ', async function () {
//     //     await init(expandTo18Decimals(1700), expandTo18Decimals(5300))
//     //
//     //     const token0Amount = expandTo18Decimals(500)
//     //     await token0.transfer(pylonInstance.address, token0Amount)
//     //
//     //     await pylonInstance.mintAsync100(account.address, false)
//     // });
//
//
//     //
//     // it('should test fees on sync', async () => {
//     //     await factoryInstance.setFeeTo(account2.address)
//     //     await init(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//     //
//     //     const token0Amount = expandTo18Decimals(4)
//     //     await token0.transfer(pylonInstance.address, token0Amount)
//     //     await expect(pylonInstance.mintPoolTokens(account.address, false))
//     //         .to.emit(pylonInstance, 'MintAT')
//     //         .to.emit(pylonInstance, 'PylonUpdate')
//     //         .withArgs(ethers.BigNumber.from('11340909090909090910'), ethers.BigNumber.from('22886363636363636363'));
//     //     // Then Anchor...
//     //     await token1.transfer(pylonInstance.address, token0Amount)
//     //     await expect(pylonInstance.mintPoolTokens(account.address, true))
//     //         .to.emit(pylonInstance, 'MintAT')
//     //         .to.emit(pylonInstance, 'PylonUpdate')
//     //         .withArgs(ethers.BigNumber.from('10077208404802744427'), ethers.BigNumber.from('22946590909090909090'))
//     //     // We increase by 4 the Anchor and Float share...
//     //     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("150618181818181817232"))
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("461527272727272726322"))
//     //     // Let's check the fees...
//     //     expect(await poolTokenInstance0.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("7927272727272727222"))
//     //     expect(await poolTokenInstance1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("24290909090909090859"))
//     //
//     //
//     // })
//
//     // it('should test fees on async 100', async () => {
//     //     await factoryInstance.setFeeTo(account2.address)
//     //     await init(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//     //
//     //     const token0Amount = expandTo18Decimals(1)
//     //     await token0.transfer(pylonInstance.address, token0Amount)
//     //     await pylonInstance.mintAsync100(account.address, false)
//     //     // Then Anchor...
//     //     await token1.transfer(pylonInstance.address, token0Amount)
//     //     await pylonInstance.mintAsync100(account.address, true)
//     //     // We increase by 4 the Anchor and Float share...
//     //     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("147814912776871850369"))
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("458724186415182923591"))
//     //     // Let's check the fees...
//     //     expect(await poolTokenInstance0.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("7727272727272727222"))
//     //     expect(await poolTokenInstance1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("24090909090909090859"))
//     // })
//
//     // it('should test fees on async', async () => {
//     //     await factoryInstance.setFeeTo(account2.address)
//     //     await init(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//     //
//     //     const token0Amount = expandTo18Decimals(4)
//     //     await token0.transfer(pylonInstance.address, token0Amount)
//     //     await token1.transfer(pylonInstance.address, token0Amount)
//     //     await expect(pylonInstance.mintAsync(account.address, false))
//     //     // Then Anchor...
//     //     await token0.transfer(pylonInstance.address, token0Amount)
//     //     await token1.transfer(pylonInstance.address, token0Amount)
//     //     await expect(pylonInstance.mintAsync(account.address, true))
//     //     // We increase by 4 the Anchor and Float share...
//     //     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("149255917667238421005"))
//     //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("465327272727272726322"))
//     //     // Let's check the fees...
//     //     expect(await poolTokenInstance0.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("7855574614065180052"))
//     //     expect(await poolTokenInstance1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("24490909090909090859"))
//     // })
//
//     const syncTestCase = [
//         [2, 5, 10, '42045640295561429', '43181405676534741','951577191489363845','909090909090908090', false],
//     ].map(a => a.map(n => (typeof n  === "boolean" ? n : typeof n === 'string' ? ethers.BigNumber.from(n) : expandTo18Decimals(n))))
//     syncTestCase.forEach((mintCase, i) => {
//         it(`syncPylon`, async () => {
//             const [mint, token0Amount, token1Amount, expectedRes0, expectedRes1, expectedOutputAmount0, expectedOutputAmount1, isAnchor] = mintCase
//             // Add some liquidity to the Pair...
//             await addLiquidity(token0Amount, token1Amount)
//             // Transferring some tokens
//             let maxSync = await factoryPylonInstance.maximumPercentageSync()
//
//             await token0.transfer(pylonInstance.address, token0Amount.div(maxSync.toNumber()+1))
//             await token1.transfer(pylonInstance.address, token1Amount.div(maxSync.toNumber()+1))
//             // Let's start the pylon
//             await pylonInstance.initPylon(account.address)
//             // for (let i = 0; i < 10; i++){
//             // Transferring some liquidity to pylon
//             let pylonRes = await pylonInstance.getSyncReserves()
//             let pairRes = await pair.getReserves()
//
//             if (isAnchor) {
//                 let t = (pairRes[1].mul(maxSync).div(100)).sub(pylonRes[1]).sub(10)
//                 console.log(t)
//                 await token1.transfer(pylonInstance.address, t)
//             }else{
//                 let t = (pairRes[0].mul(maxSync).div(100)).sub(pylonRes[0]).sub(10)
//                 console.log(t)
//                 await token0.transfer(pylonInstance.address, t)
//             }
//             // Minting some float/anchor tokens
//             await expect(pylonInstance.mintPoolTokens(account.address, isAnchor))
//                 .to.emit(pylonInstance, 'PylonUpdate')
//                 .withArgs(expectedRes0, expectedRes1);
//             console.log(await poolTokenInstance0.balanceOf(account.address))
//             console.log(await poolTokenInstance1.balanceOf(account.address))
//             // Let's check the balances, float
//             expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(expectedOutputAmount0);
//             // Anchor
//             expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(expectedOutputAmount1);
//             // }
//         })
//     })
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
//         let zPylon = await ethers.getContractFactory('ZirconPylon')
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
//         // Minting tokens is going to trigger a change in the VAB & VFB so let's check
//         const newAmount0 = ethers.BigNumber.from('5000000000000000')
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, false)
//
//         // So here we increase our vab and vfb
//         let vab2 = await pylonInstance.virtualAnchorBalance();
//         // expect(vfb).to.eq(ethers.BigNumber.from('902024227015522550'))
//         expect(vab2).to.eq(ethers.BigNumber.from('9090909090909090909'))
//         // Let's mint some LP Tokens
//         // no fee changes so vab & vfb should remain the same
//         await addLiquidity(expandTo18Decimals(1), expandTo18Decimals(10))
//         let vab3 = await pylonInstance.virtualAnchorBalance();
//         // expect(vfb3).to.eq(ethers.BigNumber.from('902024227015522550'))
//         expect(vab3).to.eq(ethers.BigNumber.from('9090909090909090909'))
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
//         expect(await token0.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("225010471503459158"))
//         expect(await token1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from("45430890580482040"))
//
//         await token0.transfer(pylonInstance.address, token0Amount.div(220))
//         console.log("sending more tokens: ", ethers.utils.formatEther(token0Amount.div(220)))
//         await expect(pylonInstance.mintPoolTokens(account.address, false)).to.be.revertedWith("ZP: FTH")
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
//         expect(ptb).to.eq(ethers.BigNumber.from("954526343214802519"))
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
//         expect(balance0).to.eq(ethers.BigNumber.from("119250068460987132"))
//         expect(balance1).to.eq(ethers.BigNumber.from("238619091825264039"))
//
//         let ftb = await poolTokenInstance0.balanceOf(account.address)
//         await poolTokenInstance0.transfer(pylonInstance.address, ftb.div(2))
//         await expect(pylonInstance.burnAsync(account2.address, false)).to.be.revertedWith("ZP: FTH")
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
//     it('should burn after init', async function () {
//         let tokenAmount = expandTo18Decimals(10)
//         await init(expandTo18Decimals(5), tokenAmount)
//         let ftb = await poolTokenInstance0.balanceOf(account.address)
//         console.log("ftb: ", ethers.utils.formatEther(ftb));
//         await poolTokenInstance0.transfer(pylonInstance.address, ftb.div(10))
//
//         await pylonInstance.burn(account2.address, false)
//
//         let token0Balance = await token0.balanceOf(account2.address);
//         console.log("token0", ethers.utils.formatEther(token0Balance));
//         expect(token0Balance).to.lt(ftb.div(10));
//
//         let ptb = await poolTokenInstance1.balanceOf(account.address)
//         console.log("ptb tokens", ethers.utils.formatEther(ptb));
//
//
//         await poolTokenInstance1.transfer(pylonInstance.address, ptb.div(10))
//
//         await pylonInstance.burn(account2.address, true);
//
//         let token1Balance = await token1.balanceOf(account2.address);
//         console.log("token1", ethers.utils.formatEther(token1Balance));
//         expect(token1Balance).to.lt(ptb.div(10));
//
//     })
//
//
// it('should add async liquidity', async function () {
//     // Let's initialize the pool and pylon
//     await addLiquidity(expandTo18Decimals(1700), expandTo18Decimals(5300))
//     // Let's transfer some tokens to the Pylon
//     await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
//     await token1.transfer(pylonInstance.address, expandTo18Decimals(5300).div(11))
//     //Let's initialize the Pylon, this should call two sync
//     await pylonInstance.initPylon(account.address)
//     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544763"))
//     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq((ethers.BigNumber.from("481818181818181817181")))
//
//
//     let pylonRes = await pylonInstance.getSyncReserves();
//     console.log("Pylon Sync Reserve0: ", ethers.utils.formatEther(pylonRes[0]));
//     console.log("Pylon Sync Reserve1: ", ethers.utils.formatEther(pylonRes[1]));
//     let pairRes = await pair.getReserves()
//     console.log("Pylon Pair Reserve0: ", ethers.utils.formatEther(pairRes[0]))
//     console.log("Pylon Pair Reserve1: ", ethers.utils.formatEther(pairRes[1]))
//
//     // Let's send some tokens
//     const token0Amount = expandTo18Decimals(25)
//     await token0.transfer(pylonInstance.address, token0Amount)
//     await token1.transfer(pylonInstance.address, token0Amount)
//
//     console.log("Sent to both sides: ", ethers.utils.formatEther(token0Amount));
//     console.log("Token0 if equal value: ", ethers.utils.formatEther(token0Amount.mul(pairRes[0]).div(pairRes[1])));
//     let floatBalance0 = await poolTokenInstance0.balanceOf(account.address);
//     console.log("FloatPTBalance before mint: ", ethers.utils.formatEther(floatBalance0))
//     // Let's try to mint async
//     await pylonInstance.mintAsync(account.address, false);
//     // We should receive float tokens and pylon should've minted some pair shares
//     // Let's check...
//     let floatBalance = await poolTokenInstance0.balanceOf(account.address);
//     console.log("FloatPTBalance after mint: ", ethers.utils.formatEther(floatBalance))
//     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("170581609348976165945"))
//     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("481818181818181817181"))
//
//     // Now let's test to receive some anchor tokens
//     await token0.transfer(pylonInstance.address, token0Amount)
//     await token1.transfer(pylonInstance.address, token0Amount)
//
//     let anchorBalance = await poolTokenInstance0.balanceOf(account.address);
//     console.log("anchor PT Balance before anchor mint: ", ethers.utils.formatEther(floatBalance))
//
//     await pylonInstance.mintAsync(account.address, true);
//
//     anchorBalance = await poolTokenInstance0.balanceOf(account.address);
//     console.log("anchor PT Balance after anchor mint: ", ethers.utils.formatEther(floatBalance))
//
//     // Let's check...
//     expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("170581609348976165945"))
//     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('531803181737831423586'))
// });
//
//
//     it('should add async liquidity 100', async function () {
//         // Let's initialize the pool and pylon
//         await addLiquidity(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
//         await token1.transfer(pylonInstance.address, expandTo18Decimals(5300).div(11))
//         //Let's initialize the Pylon, this should call two sync
//         await pylonInstance.initPylon(account.address)
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544763"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('481818181818181817181'))
//
//         let pylonRes = await pylonInstance.getSyncReserves();
//         console.log("Pylon Sync Reserve0: ", ethers.utils.formatEther(pylonRes[0]));
//         console.log("Pylon Sync Reserve1: ", ethers.utils.formatEther(pylonRes[1]));
//         let pairRes = await pair.getReserves()
//         console.log("Pylon Pair Reserve0: ", ethers.utils.formatEther(pairRes[0]))
//         console.log("Pylon Pair Reserve1: ", ethers.utils.formatEther(pairRes[1]))
//
//         // Let's send some tokens
//         const token0Amount = expandTo18Decimals(50)
//         await token0.transfer(pylonInstance.address, token0Amount)
//         // await token1.transfer(pylonInstance.address, token0Amount)
//         // Let's try to mint async
//         console.log("Sent floats:", ethers.utils.formatEther(token0Amount));
//         let floatBalance = await poolTokenInstance0.balanceOf(account.address);
//         console.log("FloatPTBalance before mint: ", ethers.utils.formatEther(floatBalance))
//         let uniPtt = await pair.totalSupply()
//         let uniPtb = await pair.balanceOf(pylonInstance.address)
//
//         console.log("Uni PTT before mint: ", ethers.utils.formatEther(uniPtt))
//         console.log("Uni PTB before mint: ", ethers.utils.formatEther(uniPtb))
//
//         await pylonInstance.mintAsync100(account.address, false);
//         // // We should receive float tokens and pylon should've minted some pair shares
//         // // Let's check...
//
//         uniPtt = await pair.totalSupply()
//         uniPtb = await pair.balanceOf(pylonInstance.address)
//
//         console.log("Uni PTT after mint: ", ethers.utils.formatEther(uniPtt))
//         console.log("Uni PTB after mint: ", ethers.utils.formatEther(uniPtb))
//
//
//         floatBalance = await poolTokenInstance0.balanceOf(account.address);
//         console.log("FloatPTBalance after mint: ", ethers.utils.formatEther(floatBalance))
//
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("203726650987666912909"))
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('481818181818181817181'))
//         // Now let's test to receive some anchor tokens
//         // await token0.transfer(pylonInstance.address, token0Amount)
//         console.log("Sent anchors:", ethers.utils.formatEther(token0Amount));
//         await token1.transfer(pylonInstance.address, token0Amount)
//
//         await pylonInstance.mintAsync100(account.address, true);
//
//         //This tx should trigger delta tax of 66% or 33 tokens (somewhat sensitive to min deltagamma fee)
//         expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('498140827236244021391'));
//         // Let's check...
//         // expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("205399122053959623788"))
//         // expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('491739746157257981776'))
//     });
//
//     it('should dump::float', async function () {
//         // Let's initialize the pool and pylon
//         await addLiquidity(expandTo18Decimals(1700), expandTo18Decimals(  5300))
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
//         await token1.transfer(pylonInstance.address, expandTo18Decimals(  5300).div(11))
//         //Let's initialize the Pylon, this should call two sync
//         await pylonInstance.initPylon(account.address)
//         expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544763"))
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

    it('should dump::anchor', async function () {
        // Let's initialize the pool and pylon
        await addLiquidity(expandTo18Decimals(1700), expandTo18Decimals(5300))
        // Let's transfer some tokens to the Pylon
        await token0.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
        await token1.transfer(pylonInstance.address, expandTo18Decimals(5300).div(11))
        //Let's initialize the Pylon, this should call two sync
        await pylonInstance.initPylon(account.address)
        expect(await poolTokenInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from("154545454545454544763"))
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('481818181818181817181'))

        let vab = await pylonInstance.virtualAnchorBalance();
        let gamma = await pylonInstance.gammaMulDecimals();
        console.log("vab", vab.toString())
        console.log("gamma", gamma.toString())
        console.log("totalSupply", (await poolTokenInstance1.totalSupply()).toString())

        let ftb = await poolTokenInstance1.balanceOf(account.address)
        await poolTokenInstance1.transfer(pylonInstance.address, ftb)

        await pylonInstance.burn(account2.address, true)
        let input = expandTo18Decimals(100)
        await token1.transfer(pair.address, input)
        let reserves = await pair.getReserves()
        let outcome = getAmountOut(input, reserves[0],reserves[1])
        await token0.transfer(pair.address, input)
        await pair.swap(0, outcome, account.address, '0x', overrides)

        vab = await pylonInstance.virtualAnchorBalance();
        gamma = await pylonInstance.gammaMulDecimals();

        console.log("totalSupply", (await poolTokenInstance1.totalSupply()).toString())
        console.log("vab", vab.toString())
        console.log("gamma", gamma.toString())
        console.log("investing", expandTo18Decimals(1700).div(11))

        await token1.transfer(pylonInstance.address, expandTo18Decimals(1700).div(11))
        await printValues()
        await expect(pylonInstance.mintPoolTokens(account.address, true))


        // expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from("159325210871602624179"))

        vab = await pylonInstance.virtualAnchorBalance();
        gamma = await pylonInstance.gammaMulDecimals();
        console.log("mintedTokens", (await poolTokenInstance1.balanceOf(account.address)).toString())
        console.log("totalsupply", (await poolTokenInstance0.totalSupply()).toString())
        console.log("vab", vab.toString())
        console.log("gamma", gamma.toString())
    });
//     //TODO: Test energy system
//     //TODO: Create Exponential fees on burn async
//     // Exponential Fees has to be 0.01 on 50 Gamma, and 0.75 on 100 or 0 gamma
//     // Exponential fees has to be half to revenue, half to insurance
})
