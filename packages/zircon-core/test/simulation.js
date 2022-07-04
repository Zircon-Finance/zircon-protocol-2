const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals} = require("./shared/utils");
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

async function getOutputAmount(input, inputReserves, outputReserves) {
    let amountWithFees = input.mul(ethers.BigNumber.from("977"))
    let numerator = amountWithFees.mul(outputReserves)
    let denominator = amountWithFees.add(inputReserves.mul(ethers.BigNumber.from("1000")))
    return numerator.div(denominator)
}

describe("Simulation", () => {
    // For this simulation test, it'll mantain the same ratio

    let TOKEN0_AMOUNT = expandTo18Decimals(1)
    let TOKEN1_AMOUNT = expandTo18Decimals(2)

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

    const rebalancePool = async () => {
        let reserves = await pair.getReserves();
        let reserve0 = reserves[0]
        let reserve1 = reserves[1]
        let desiredRatio = TOKEN0_AMOUNT.div(TOKEN1_AMOUNT)
        let currentRatio = reserve0.div(reserve1)
        let reserve1Translated = reserve1.mul(TOKEN0_AMOUNT).div(TOKEN1_AMOUNT)
        if (!reserve1Translated.eq(reserve0)) {
            let denominator = (TOKEN0_AMOUNT.mul(reserve1)).add(TOKEN1_AMOUNT.mul(reserve0)).div(expandTo18Decimals(1))
            if (reserve1Translated.gt(reserve0)) {
                let numerator = (reserve1.mul(TOKEN0_AMOUNT).sub(reserve0.mul(TOKEN1_AMOUNT)))
                let result = ((numerator.div(denominator)).mul(reserve0)).div(expandTo18Decimals(1))
                let resOut = getOutputAmount(result, reserve0, reserve1)
                await token0.transfer(pair.address, result)
                await pair.swap(0, resOut, account.address, '0x', overrides)
                let reserves = await pair.getReserves();
            }else{
                let numerator = (reserve0.mul(TOKEN1_AMOUNT).sub(reserve1.mul(TOKEN0_AMOUNT)))
                let result = ((numerator.div(denominator)).mul(reserve1)).div(expandTo18Decimals(1))
                let resOut = getOutputAmount(result, reserve1, reserve0)
                await token1.transfer(pair.address, result)
                await pair.swap(resOut, 0, account.address, '0x', overrides)
                let reserves = await pair.getReserves();
            }
        }
    }
    const changeBalances = async () => {
        let block = await ethers.provider.getBlockNumber()

        let sinBlock = ethers.BigNumber.from("" + ((5 + 2*Math.sin(block)) * 1e18))
        TOKEN0_AMOUNT = sinBlock
        // console.log("" + Math.floor((5 + 2*Math.exp(block)) / 1e18))
        // let expBlock = ethers.BigNumber.from("" + ((5 + 2*Math.exp(block)) * 1e18))
        // TOKEN1_AMOUNT = expBlock
        // console.log(sinBlock)

    }

    const executeFunction = async (code, args) => {
        let reserves = await pair.getReserves();
        let reserve0 = reserves[0]
        let reserve1 = reserves[1]
        let amount;
        let percentage;
        let amount0;
        let amount1;
        let isAnchor;
        let tk0;
        let isFloatReserve0;
        let isReserve0;
        let ownedLP = await pair.balanceOf(account.address)
        let ownedFLP = await poolTokenInstance0.balanceOf(account.address)
        let ownedALP = await poolTokenInstance1.balanceOf(account.address)
        switch(code) {
            case 0:
                // pair: swap
                amount = ethers.BigNumber.from("" + args[0])
                isAnchor = args[1]
                if (!isAnchor) {
                    let resOut = getOutputAmount(amount, reserve0, reserve1)
                    await token0.transfer(pair.address, amount)
                    await pair.swap(0, resOut, account.address, '0x', overrides)
                }else{
                    let resOut = getOutputAmount(amount, reserve1, reserve0)
                    await token1.transfer(pair.address, amount)
                    await pair.swap(resOut, 0, account.address, '0x', overrides)
                }
                break
            case 1:
                // pair: mint
                amount0 = ethers.BigNumber.from("" + args[0])
                amount1 = ethers.BigNumber.from("" + args[1])
                await token0.transfer(pair.address, amount0)
                await token1.transfer(pair.address, amount1)
                await pair.mint(account.address)
                break
            case 2:
                // pylon: sync
                amount = ethers.BigNumber.from("" + args[0])
                isAnchor = args[1]
                if (!isAnchor) {
                    await token0.transfer(pylonInstance.address, amount)
                }else{
                    await token1.transfer(pylonInstance.address, amount)
                }
                await pylonInstance.mintPoolTokens(account.address, isAnchor)
                break
            case 3:
                // pylon: async100
                amount = ethers.BigNumber.from("" + args[0])
                isAnchor = args[1]
                if (!isAnchor) {
                    await token0.transfer(pylonInstance.address, amount)
                }else{
                    await token1.transfer(pylonInstance.address, amount)
                }
                await pylonInstance.mintAsync100(account.address, isAnchor)
                break
            case 4:
                // pylon: async
                amount0 = ethers.BigNumber.from("" + args[0])
                amount1 = ethers.BigNumber.from("" + args[1])
                isAnchor = args[2]
                await token0.transfer(pylonInstance.address, amount0)
                await token1.transfer(pylonInstance.address, amount1)
                await pylonInstance.mintAsync(account.address, isAnchor)
                break
            case 5:
                // pylon: burn
                percentage = args[0]
                isAnchor = args[1]
                if (!isAnchor) {
                    amount = ownedFLP.mul(percentage).div(100)

                    await poolTokenInstance0.transfer(pylonInstance.address, amount)
                }else{
                    amount = ownedALP.mul(percentage).div(100)

                    await poolTokenInstance1.transfer(pylonInstance.address, amount)
                }
                await pylonInstance.burn(account.address, isAnchor)
                break
            case 6:
                // pair: burn
                percentage = args[0]
                amount = ownedLP.mul(percentage).div(100)
                await pair.transfer(pair.address, amount)
                await pair.burn(account.address)
                break
            case 7:
                // pylon: burnAsync
                percentage = args[0]
                isAnchor = args[1]
                if (!isAnchor) {
                    amount = ownedFLP.mul(percentage).div(100)
                    await poolTokenInstance0.transfer(pylonInstance.address, amount)
                }else{
                    amount = ownedALP.mul(percentage).div(100)
                    await poolTokenInstance1.transfer(pylonInstance.address, amount)
                }
                await pylonInstance.burnAsync(account.address, isAnchor)
                break
            case 8:
                // pair: mint one side
                amount = ethers.BigNumber.from("" + args[0])
                isAnchor = args[1]
                tk0 = await pair.token0
                isFloatReserve0 = token0.address === tk0.address
                isReserve0 = isFloatReserve0 ? !isAnchor : isAnchor
                if (isReserve0) {
                    await token0.transfer(pair.address, amount)
                }else{
                    await token1.transfer(pair.address, amount)
                }
                await pair.mintOneSide(account.address, isReserve0)
                break
            case 9:
                // pair: burn one side
                percentage = args[0]
                amount = ownedLP.mul(percentage).div(100)
                isAnchor = args[1]
                tk0 = await pair.token0
                isFloatReserve0 = token0.address === tk0.address
                isReserve0 = isFloatReserve0 ? !isAnchor : isAnchor
                await pair.transfer(pair.address, amount)
                await pair.burnOneSide(account.address, isReserve0)
                break
        }
    }
    let ops = [
        {
            code: 0, // PAIR Swap: amount, isAnchor
            args: [0, 1]
        },
        {
            code: 1, // PAIR Mint: amount amount
            args: [0, 0]
        },
        {
            code: 2, // PYLON Sync: amount, isAnchor
            args: [0, 1]
        },
        {
            code: 3, // PYLON Async-100: amount, isAnchor
            args: [0, 1]
        },
        {
            code: 4, // PYLON Async: amount, amount, isAnchor
            args: [0, 0, 1]
        },
        {
            code: 5, // PYLON Burn: amount burning shares as percentage of owned tokens,
            // isAnchor (Mint Operation must be done before this one)
            args: [2, 1]
        },
        {
            code: 6, // PAIR Burn: burning shares (percentage)
            args: [2]
        },
        {
            code: 7, // PYLON BurnAsync: Amount Shares (percentage, isAnchor
            args: [2, 1]
        },
        {
            code: 8, // PAIR Mint One Side: Amount, isAnchor
            args: [0, 1]
        },
        {
            code: 9, // PAIR Burn One Side: Amount Shares (percentage), isAnchor
            args: [2, 1]
        },
    ]

    let getInfoToStore = async () => {
        let reserves = await pair.getReserves();
        let pairReserve0 = reserves[0].toString()
        let pairReserve1 = reserves[1].toString()

        let pylonReserves = await pylonInstance.getSyncReserves();
        let pylonReserve0 = pylonReserves[0].toString()
        let pylonReserve1 = pylonReserves[1].toString()

        let virtualAnchorBalance = (await pylonInstance.virtualAnchorBalance()).toString();
        // let virtualFloatBalance = (await pylonInstance.virtualFloatBalance()).toString();
        let gammaMulDecimals = (await pylonInstance.gammaMulDecimals()).toString();

        return {
            pairReserve0: pairReserve0/1e18,
            pairReserve1: pairReserve1/1e18,
            pylonReserve0: pylonReserve0/1e18,
            pylonReserve1: pylonReserve1/1e18,
            virtualAnchorBalance: virtualAnchorBalance/1e18,
            // virtualFloatBalance: virtualFloatBalance/1e18,
            gammaMulDecimals: gammaMulDecimals/1e18,
            price: pairReserve0/pairReserve1
        }
    }

    const saveJSONFile = (storeInfo) => {
        var fs = require('fs');
        fs.writeFile("test.txt", JSON.stringify(storeInfo), function(err) {
            if (err) {
                console.log(err);
            }
        });
    }
    /// Random Number Seed Generator
    function cyrb128(str) {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
    }
    function sfc32(a, b, c, d) {
        return function() {
            a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
            var t = (a + b) | 0;
            a = b ^ b >>> 9;
            b = c + (c << 3) | 0;
            c = (c << 21 | c >>> 11);
            d = d + 1 | 0;
            t = t + d | 0;
            c = c + t | 0;
            return (t >>> 0) / 4294967296;
        }
    }
    function mulberry32(a) {
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

    const randomOpsGenerator = (seed, opsLength) => {
        let operations = []
        // Create cyrb128 state:
        var seed = cyrb128(seed);
        // Four 32-bit component hashes provide the seed for sfc32.
        var rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
        // Only one 32-bit component hash is needed for mulberry32.
        var rand = mulberry32(seed[0]);
        // Obtain sequential random numbers like so:

        for (let i = 0; i < opsLength; i++) {
            let randomNumber = rand()*10
            let random = Math.floor(randomNumber)
            let op = ops[random]

            let args = op.args
            let inputArgs = []
            for (let arg of args) {
                switch (arg){
                    case 0:
                        inputArgs.push(Math.floor(randomNumber*1e18))
                        break
                    case 1:
                        let boolInput = Math.floor(randomNumber*10)%2
                        inputArgs.push(boolInput === 0)
                        break
                    case 2:
                        inputArgs.push(Math.floor(randomNumber*100)%80)
                        break
                }
            }
            operations.push({
                code: random,
                args: inputArgs
            })
        }
        return operations

    }

    it('should send tokens to energy', async function () {
        this.timeout(100000);
        await init(TOKEN0_AMOUNT, TOKEN1_AMOUNT)
        let q = await token0.balanceOf(account.address)
        let ops = randomOpsGenerator("apples", 30)
        await token1.transfer(pylonInstance.address, TOKEN0_AMOUNT.div(11))
        await expect(pylonInstance.mintPoolTokens(account.address, true))
        let storeInfo = []
        let info;
        for (let op of ops) {
            try{
                await executeFunction(op.code, op.args)
                info = await getInfoToStore()
                storeInfo.push(info)
                await changeBalances()
                await rebalancePool();
                info = await getInfoToStore()
                storeInfo.push(info)
                await changeBalances()
                await rebalancePool();
                info = await getInfoToStore()
                storeInfo.push(info)
            }catch (e) {
                console.log("error on", op.code)
            }
        }
        saveJSONFile(storeInfo)
    });

})
