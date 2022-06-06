// // TODO: clean this...
// const { expect } = require("chai");
// const { ethers } = require('hardhat');
// const assert = require("assert");
// const {BigNumber} = require("ethers");
// const {expandTo18Decimals} = require("./shared/utils");
// const {coreFixtures} = require("./shared/fixtures");
// const TEST_ADDRESSES = [
//     '0x1000000000000000000000000000000000000000',
//     '0x2000000000000000000000000000000000000000'
// ]
// let factoryPylonInstance,  token0, token1,
//     pylonInstance, poolTokenInstance0, poolTokenInstance1,
//     factoryInstance, deployerAddress, account2, account,
//     pair;
//
// const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
// const overrides = {
//     gasLimit: 9999999
// }
//
// async function addLiquidity(token0Amount, token1Amount) {
//     await token0.transfer(pair.address, token0Amount)
//     await token1.transfer(pair.address, token1Amount)
//     await pair.mint(account.address)
// }
// async function getOutputAmount(input, inputReserves, outputReserves) {
//     let amountWithFees = input.mul(ethers.BigNumber.from("977"))
//     let numerator = amountWithFees.mul(outputReserves)
//     let denominator = amountWithFees.add(inputReserves.mul(ethers.BigNumber.from("1000")))
//     return numerator.div(denominator)
// }
//
// // TODO: See case where we have a big dump
// describe("Energy", () => {
//     beforeEach(async () => {
//         [account, account2] = await ethers.getSigners();
//         deployerAddress = account.address;
//         let fixtures = await coreFixtures(deployerAddress)
//         factoryInstance = fixtures.factoryInstance
//         token0 = fixtures.token0
//         token1 = fixtures.token1
//         poolTokenInstance0 = fixtures.poolTokenInstance0
//         poolTokenInstance1 = fixtures.poolTokenInstance1
//         pair = fixtures.pair
//         pylonInstance = fixtures.pylonInstance
//         factoryPylonInstance = fixtures.factoryPylonInstance
//     });
//     const init = async (token0Amount, token1Amount) => {
//         // Let's initialize the Pool, inserting some liquidity in it
//         await addLiquidity(token0Amount, token1Amount)
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, token0Amount.div(11))
//         await token1.transfer(pylonInstance.address, token1Amount.div(11))
//         //Let's initialize the Pylon, this should call two sync
//         await pylonInstance.initPylon(account.address)
//     }
//
//     it('should send tokens to energy', async function () {
//         let tok1Amount = expandTo18Decimals(5300)
//         await init(expandTo18Decimals(1700), tok1Amount)
//
//         let tokTransfer = tok1Amount.div(221)
//         await token1.transfer(pylonInstance.address, tokTransfer);
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         let energyAddress = await pylonInstance.energyAddress()
//         expect(await token1.balanceOf(energyAddress)).to.eq(tokTransfer.mul(5).div(100)) // TODO: Change fee percentage
//
//     });
//
//     it('should create oposite pair and check energy', async function () {
//         let tok1Amount = expandTo18Decimals(5300)
//         await init(expandTo18Decimals(1700), tok1Amount)
//
//         await factoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
//         let pylonAddress = await factoryPylonInstance.getPylon(token1.address, token0.address)
//
//         let zPylon = await ethers.getContractFactory('ZirconPylon')
//         let newPylonInstance = await zPylon.attach(pylonAddress);
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(newPylonInstance.address, expandTo18Decimals(17))
//         await token1.transfer(newPylonInstance.address, expandTo18Decimals(53))
//         //Let's initialize the Pylon, this should call two sync
//         await newPylonInstance.initPylon(account.address, overrides)
//
//         let tokTransfer = tok1Amount.div(221)
//         await token0.transfer(newPylonInstance.address, tokTransfer);
//         await newPylonInstance.mintPoolTokens(account.address, true);
//
//         let energyAddress = await newPylonInstance.energyAddress()
//         expect(await token0.balanceOf(energyAddress)).to.eq(tokTransfer.mul(5).div(100)) // TODO: Change fee percentage
//
//     });
//
//     it('should send fees on swap to energy revenue', async function () {
//         await init(expandTo18Decimals(10), expandTo18Decimals(  100))
//
//         // Time to swap, let's generate some fees
//         await token0.transfer(pair.address, expandTo18Decimals(1))
//         await pair.swap(0, ethers.BigNumber.from('1662497915624478906'), account.address, '0x', overrides)
//         // Minting tokens is going to trigger a change in the VAB & VFB so let's check
//         const newAmount0 = ethers.BigNumber.from('5000000000000000')
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, false)
//
//         let tokTransfer = expandTo18Decimals(10).div(221)
//         await token1.transfer(pylonInstance.address, tokTransfer);
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         let energyAddress = await pair.energyRevenueAddress()
//         expect(await pair.balanceOf(energyAddress)).to.eq("189197849219453481") // TODO: Change fee percentage
//
//         let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
//         let zirconEnergyRevenue = await zEnergyRev.attach(energyAddress);
//         console.log(pylonInstance.address);
//         expect(await zirconEnergyRevenue.reserve()).to.eq("189197849219453481") // TODO: Change fee percentage
//
//     });
//
//     it('should send fees on swap to energy revenue on opposite pylon', async function () {
//         await init(expandTo18Decimals(100), expandTo18Decimals(10))
//         await factoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
//         let pylonAddress = await factoryPylonInstance.getPylon(token1.address, token0.address)
//         let zPylon = await ethers.getContractFactory('ZirconPylon')
//         pylonInstance = await zPylon.attach(pylonAddress);
//         let t = token0
//         token0 = token1
//         token1 = t
//         // Time to swap, let's generate some fees
//         await token0.transfer(pair.address, expandTo18Decimals(1))
//         await pair.swap(ethers.BigNumber.from('1662497915624478906'), 0, account.address, '0x', overrides)
//         // Minting tokens is going to trigger a change in the VAB & VFB so let's check
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(pylonInstance.address, expandTo18Decimals(5))
//         await token1.transfer(pylonInstance.address, expandTo18Decimals(2))
//         //Let's initialize the Pylon, this should call two sync
//         await pylonInstance.initPylon(account.address, overrides)
//
//         const newAmount0 = expandTo18Decimals(1)
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, false)
//
//         let tokTransfer = expandTo18Decimals(10).div(221)
//         await token1.transfer(pylonInstance.address, tokTransfer);
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         let energyAddress = await pair.energyRevenueAddress()
//         expect(await pair.balanceOf(energyAddress)).to.eq("189221562047013988") // TODO: Change fee percentage
//
//         let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
//         let zirconEnergyRevenue = await zEnergyRev.attach(energyAddress);
//         console.log(pylonInstance.address);
//         expect(await zirconEnergyRevenue.reserve()).to.eq("189221562047013988") // TODO: Change fee percentage
//
//     });
//
//     it('burning with energy', async function () {
//         await init(expandTo18Decimals(10), expandTo18Decimals(10))
//         let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
//         let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
//
//         const newAmount0 = ethers.BigNumber.from('5000000000000000')
//
//         // Let's get some float shares...
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, false)
//
//         // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
//         // Let's check that...
//         let energyRevenueAddress = await pair.energyRevenueAddress()
//         let energyAddress = await pylonInstance.energyAddress()
//
//         // Here the fees for swapping
//         expect(await pair.balanceOf(energyRevenueAddress)).to.eq("57530058192")
//
//         // Here the Fees for entering the pool
//         expect(await token1.balanceOf(energyAddress)).to.eq("249244281460178")
//
//         // Let's get some anchor shares...
//         await token1.transfer(pylonInstance.address, newAmount0);
//         await pylonInstance.mintPoolTokens(account.address, true);
//
//         // Here no fees for swapping
//         expect(await pair.balanceOf(energyRevenueAddress)).to.eq("57530058192")
//
//         // Here the Fees for entering the pool
//         expect(await token1.balanceOf(energyAddress)).to.eq("499244281460178")
//
//         let ptb1 = await poolTokenInstance1.balanceOf(account.address);
//         await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
//         await pylonInstance.burn(account2.address, true) //Burns to an account2
//         console.log("Burning...", ptb1.sub(initialPTS1).toString());
//
//         // Here no fees for swapping
//         expect(await pair.balanceOf(energyRevenueAddress)).to.eq("57530058192")
//
//         // Here the Fees for entering the pool
//         expect(await token1.balanceOf(energyAddress)).to.eq("736744281460177")
//
//         let ptb0 = await poolTokenInstance0.balanceOf(account.address);
//         await poolTokenInstance0.transfer(pylonInstance.address, ptb0)
//         await pylonInstance.burn(account2.address, false) //Burns to an account2
//         console.log("Burning...", ptb0.toString());
//
//         // Here no fees for swapping
//         expect(await pair.balanceOf(energyRevenueAddress)).to.eq("556399968662")
//
//         // Here the Fees for entering the pool
//         expect(await token1.balanceOf(energyAddress)).to.eq("47590686696995891")
//     });
//
//     it('burning async with energy', async function () {
//         await init(expandTo18Decimals(10), expandTo18Decimals(10))
//         let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
//         let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
//
//         const newAmount0 = ethers.BigNumber.from('5000000000000000')
//
//         // Let's get some float shares...
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, false)
//         // Let's get some anchor shares...
//         await token1.transfer(pylonInstance.address, newAmount0);
//         await pylonInstance.mintPoolTokens(account.address, true);
//         // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
//         // Let's check that...
//         let energyRevenueAddress = await pair.energyRevenueAddress()
//         let energyAddress = await pylonInstance.energyAddress()
//
//         let ptb1 = await poolTokenInstance1.balanceOf(account.address);
//         await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
//         await pylonInstance.burnAsync(account2.address, true) //Burns to an account2
//         console.log("Burning...", ptb1.sub(initialPTS1).toString());
//
//         // Here no fees for swapping
//         expect(await pair.balanceOf(energyRevenueAddress)).to.eq("57530058192")
//
//         // Here the Fees for entering the pool
//         expect(await token1.balanceOf(energyAddress)).to.eq("730166386806977")
//     });
//
//     it('burning async with energy', async function () {
//         await init(expandTo18Decimals(10), expandTo18Decimals(10))
//         let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
//         let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
//
//         const newAmount0 = ethers.BigNumber.from('5000000000000000')
//
//         // Let's get some float shares...
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, false)
//         // Let's get some anchor shares...
//         await token1.transfer(pylonInstance.address, newAmount0);
//         await pylonInstance.mintPoolTokens(account.address, true);
//         // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
//         // Let's check that...
//         let energyRevenueAddress = await pair.energyRevenueAddress()
//         let energyAddress = await pylonInstance.energyAddress()
//
//         let ptb1 = await poolTokenInstance1.balanceOf(account.address);
//         await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
//         await pylonInstance.burnAsync(account2.address, true) //Burns to an account2
//         console.log("Burning...", ptb1.sub(initialPTS1).toString());
//
//         // Here no fees for swapping
//         expect(await pair.balanceOf(energyRevenueAddress)).to.eq("57530058192")
//
//         // Here the Fees for entering the pool
//         expect(await token1.balanceOf(energyAddress)).to.eq("730166386806977")
//     });
//
//     it('burning async with swap fees', async function () {
//         let energyRevenueAddress = await pair.energyRevenueAddress()
//         let energyAddress = await pylonInstance.energyAddress()
//
//         await init(expandTo18Decimals(200), expandTo18Decimals(200))
//         let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
//         let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
//
//         const newAmount0 = ethers.BigNumber.from('5000000000000000')
//
//         await token0.transfer(pair.address, expandTo18Decimals(1))
//         await pair.swap(0, ethers.BigNumber.from('900000000000000000'), account.address, '0x', overrides)
//         // Let's get some float shares...
//         await token0.transfer(pylonInstance.address, newAmount0)
//         await pylonInstance.mintPoolTokens(account.address, false)
//         //expect(await pair.balanceOf(energyAddress)).to.eq("2728835295394547")
//         expect(await token1.balanceOf(energyAddress)).to.eq("247080069791011")
//
//         // Let's get some anchor shares...
//         await token1.transfer(pylonInstance.address, newAmount0);
//         await pylonInstance.mintPoolTokens(account.address, true);
//         expect(await token1.balanceOf(energyAddress)).to.eq("497080069791011")
//
//
//         // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
//         // Let's check that...
//         let ptb1 = await poolTokenInstance1.balanceOf(account.address);
//         await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
//         await pylonInstance.burnAsync(account2.address, true)
//         //Burns to an account2
//         expect(await token1.balanceOf(account2.address)).to.eq("2196831538574518")
//         // Here no fees for swapping
//         expect(await pair.balanceOf(energyRevenueAddress)).to.eq("7351022821370392")
//         // Here the Fees for entering the pool
//         expect(await token1.balanceOf(energyAddress)).to.eq("727980359353443")
//     });
// })
