// // TODO: clean this...
// const { expect } = require("chai");
// const { ethers } = require('hardhat');
// const assert = require("assert");
// const {BigNumber} = require("ethers");
// const {expandTo18Decimals, getAmountOut} = require("./shared/utils");
// const {coreFixtures} = require("./shared/fixtures");
// const TEST_ADDRESSES = [
//     '0x1000000000000000000000000000000000000000',
//     '0x2000000000000000000000000000000000000000'
// ]
// let factoryPylonInstance,  token0, token1,
//     pylonInstance, poolTokenInstance0, poolTokenInstance1,
//     factoryInstance, deployerAddress, account2, account,
//     pair, migrator, factoryEnergyInstance, ptFactoryInstance, feeToSetterInstance, newFactoryPylonInstance, factoryEnergyInstance2;
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
//
//
// // TODO: See case where we have a big dump
// describe("Migrations", () => {
//     beforeEach(async () => {
//         [account, account2] = await ethers.getSigners();
//         deployerAddress = account.address;
//         let fixtures = await coreFixtures(deployerAddress)
//         migrator = fixtures.migratorInstance
//         factoryInstance = fixtures.factoryInstance
//         token0 = fixtures.token0
//         token1 = fixtures.token1
//         poolTokenInstance0 = fixtures.poolTokenInstance0
//         poolTokenInstance1 = fixtures.poolTokenInstance1
//         pair = fixtures.pair
//         pylonInstance = fixtures.pylonInstance
//         factoryPylonInstance = fixtures.factoryPylonInstance
//         factoryEnergyInstance = fixtures.factoryEnergyInstance
//         ptFactoryInstance = fixtures.ptFactoryInstance
//         feeToSetterInstance = fixtures.feeToSetterInstance
//
//     });
//     const migratePylon = async () => {
//         let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
//         factoryEnergyInstance2 = await factoryEnergy.deploy(feeToSetterInstance.address, migrator.address);
//         let zPylon = await ethers.getContractFactory('ZirconPylon');
//
//         await factoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
//         let pAddress = await factoryPylonInstance.getPylon(token1.address, token0.address)
//         let pylonInstance2 = zPylon.attach(pAddress)
//         let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory');
//
//         newFactoryPylonInstance = await factoryPylon.deploy(
//             factoryInstance.address,
//             factoryEnergyInstance2.address,
//             ptFactoryInstance.address,
//             feeToSetterInstance.address,
//             migrator.address);
//
//
//         await migrator.startNewPylon(pylonInstance.address, newFactoryPylonInstance.address, pair.address, token0.address, token1.address)
//         await migrator.startNewPylon(pylonInstance2.address, newFactoryPylonInstance.address, pair.address, token1.address, token0.address)
//
//         //await migrator.updateFactories(factoryEnergyInstance2.address, ptFactoryInstance.address, newFactoryPylonInstance.address, factoryInstance.address)
//
//         // await newFactoryPylonInstance.addPylon(pair.address, token0.address, token1.address);
//
//         // await newFactoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
//         // let pylonAddress2 = await newFactoryPylonInstance.getPylon(token1.address, token0.address)
//
//         // let poolToken1 = await ethers.getContractFactory('ZirconPoolToken');
//         // let poolToken2 = await ethers.getContractFactory('ZirconPoolToken');
//
//         // let pylonAddressOld2 = await factoryPylonInstance.getPylon(token1.address, token0.address)
//
//         // let oldPylonInstance2 = await zPylon.attach(pylonAddressOld2);
//         // let newPylonInstance = await zPylon.attach(pylonAddress);
//         // let newPylonInstance2 = await zPylon.attach(pylonAddress2);
//
//         // let energyAddressA = await newPylonInstance.energyAddress()
//         // let energyAddressB = await newPylonInstance2.energyAddress()
//
//         // function migratePylon(address oldPylon, address newPylon, address tokenA,
//         //     address tokenB, address pair, address newEnergy) public onlyOwner {
//
//         let pylonAddress = await newFactoryPylonInstance.getPylon(token0.address, token1.address)
//         let pylonAddress2 = await newFactoryPylonInstance.getPylon(token1.address, token0.address)
//         let newPylonInstance = await zPylon.attach(pylonAddress)
//         let newPylonInstance2 = await zPylon.attach(pylonAddress2)
//
//         return [newPylonInstance, newPylonInstance2]
//     }
//
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
//     // Let's try to calculate some cases for pylon
//     it('should migrate pylon', async function () {
//         //         // Adding some tokens and minting
// //         // here we initialize the pool
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
//         // Changing to new migrated pylon
//
//         let newPylon = (await migratePylon())[0]
//         const token0Amount = expandTo18Decimals(4)
//         await token0.transfer(newPylon.address, token0Amount)
//         await expect(newPylon.mintPoolTokens(account.address, false))
//             .to.emit(newPylon, 'MintAT')
//             .to.emit(newPylon, 'PylonUpdate')
//             .withArgs(ethers.BigNumber.from('11340507338607474275'), ethers.BigNumber.from('22886358694307110634'));
//
//         pylonRes2 = await newPylon.getSyncReserves();
//         console.log("\nPylon Sync Reserve0 after first mint: ", ethers.utils.formatEther(pylonRes2[0]));
//         console.log("Pylon Sync Reserve1 after first mint: ", ethers.utils.formatEther(pylonRes2[1]));
//
//
//         ptb = await pair.balanceOf(newPylon.address);
//         ptt = await pair.totalSupply();
//         console.log("ptb after first mint: ", ethers.utils.formatEther(ptb));
//         console.log("ptt after first mint: ", ethers.utils.formatEther(ptt));
//     })
//
//     it('should burn after init with migrated pylon', async function () {
//         let tokenAmount = expandTo18Decimals(10)
//         await init(expandTo18Decimals(5), tokenAmount)
//
//         let newPylon = (await migratePylon())[0]
//
//         let ftb = await poolTokenInstance0.balanceOf(account.address)
//         await poolTokenInstance0.transfer(newPylon.address, ftb)
//         await newPylon.burn(account2.address, false)
//
//         let ptb = await poolTokenInstance1.balanceOf(account.address)
//         console.log("ptb tokens", ptb)
//         await poolTokenInstance1.transfer(newPylon.address, ptb)
//         console.log("ptb tokens2", ptb)
//
//         await expect(newPylon.burn(account2.address, true)).to.be.revertedWith("ZP: Fee too high");
//     })
//
//     it('burning async with swap fees and changing pylons', async function () {
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
//         let newPylon = (await migratePylon())[0]
//         await migrator.migrateEnergyRevenue(pair.address, energyRevenueAddress, token0.address, token1.address, newFactoryPylonInstance.address, factoryEnergyInstance2.address)
//         energyRevenueAddress = await pair.energyRevenueAddress()
//
//         let newEnergyAddress = await newPylon.energyAddress()
//         expect(await token1.balanceOf(energyAddress)).to.eq("0")
//         expect(await token1.balanceOf(newEnergyAddress)).to.eq("494160702744")
//
//         // Let's get some anchor shares...
//         await token1.transfer(newPylon.address, newAmount0);
//         await newPylon.mintPoolTokens(account.address, true);
//         expect(await token1.balanceOf(newEnergyAddress)).to.eq("994160702744")
//
//         // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
//         // Let's check that...
//         let ptb1 = await poolTokenInstance1.balanceOf(account.address);
//         await poolTokenInstance1.transfer(newPylon.address, ptb1.sub(initialPTS1))
//         await newPylon.burnAsync(account2.address, true)
//         //Burns to an account2
//         expect(await token1.balanceOf(account2.address)).to.eq("2440059483769185")
//         // Here no fees for swapping
//         expect(await pair.balanceOf(energyRevenueAddress)).to.eq("7985796454641249")
//         // Here the Fees for entering the pool
//         expect(await token1.balanceOf(newEnergyAddress)).to.eq("317")
//     });
//
//     it('test two pylons', async function () {
//         await init(expandTo18Decimals(1700), expandTo18Decimals(5300))
//         let newPylonInstance = (await migratePylon())[1]
//
//         // Let's transfer some tokens to the Pylon
//         await token0.transfer(newPylonInstance.address, expandTo18Decimals(17))
//         await token1.transfer(newPylonInstance.address, expandTo18Decimals( 53))
//         //Let's initialize the Pylon, this should call two sync
//         await expect(newPylonInstance.initPylon(account.address, overrides)).to.be.revertedWith("Already initialized");
//         // TODO: make sonme checks here, think if there is some way of concurrency between pylons
//     });
//
// });
//