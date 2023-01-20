// const { expect } = require("chai");
// const { ethers } = require('hardhat');
// const assert = require("assert");
// const {BigNumber} = require("ethers");
// const {expandTo18Decimals, getAmountOut} = require("./shared/utils");
// const {coreFixtures} = require("./shared/fixtures");
// const { initPylonsFromProdSnapshot } = require("./shared/commands");
// const { librarySetup} = require("./shared/fixtures");
//
// let factoryPylonInstance, factoryEnergyInstance,  token0, token1,
//     pylonInstance, poolTokenInstance0, poolTokenInstance1,
//     factoryInstance, deployerAddress, account2, account,
//     pair, factoryPTInstance, library;
//
// const overrides = {
//     gasLimit: 9999999
// }
//
//
// describe("Pylon", () => {
//     before(async () => {
//         library = await librarySetup()
//     })
//
//     function getTokenBySymbol(tokens, symbol) {
//         return tokens.find(token => token.symbol == symbol)
//     }
//
//     //Let's try to calculate some cases for pylon
//     it(`Prod Testing ZRG/ETH Bug FTT`, async () => {
//
//         let fixtures = await initPylonsFromProdSnapshot(library);
//
//         let zrg = getTokenBySymbol(tokens, "ZRG")
//         let eth = getTokenBySymbol(tokens, "ETH")
//         console.log("Tokens loaded", zrg, eth)
//
//         // Getting Pylon
//         let zrgETHPylon = await factoryPylonInstance.getPylon(zrg.address, eth.address)
//         let pylonContract = await ethers.getContractFactory("ZirconPylon")
//         let pylon = await pylonContract.attach(zrgETHPylon)
//
//         console.log("Getting Pylon", zrgETHPylon)
//
//         // Getting Some Tokens
//         let token = await ethers.getContractFactory("Token")
//         let zrgToken = await token.attach(zrg.address)
//         let ethToken = await token.attach(eth.address)
//
//         await zrgToken.mint(account.address, expandTo18Decimals(10))
//         await ethToken.mint(account.address, expandTo18Decimals(10))
//
//         console.log("Getting Some Tokens")
//
//         // Minting a bit of ETH Stable PT
//
//         await ethToken.transfer(pylon.address, "100000000000000000")
//         await pylon.mintPoolTokens(account.address, true)
//
//         console.log("Minting a bit of ETH Stable PT")
//
//         // Getting the PT Instances
//         let stablePT = await factoryPTInstance.getPoolToken(zrgETHPylon, ethToken.address)
//         let stablePTContract = await ethers.getContractFactory("ZirconPoolToken")
//         let stablePTInstance = await stablePTContract.attach(stablePT)
//
//         let stablePTBalance = await stablePTInstance.balanceOf(account.address)
//
//         await stablePTInstance.transfer(pylon.address, stablePTBalance)
//
//         console.log("Transferred the PT to the Pylon", stablePTBalance.toString())
//
//         // Burning (should fire FTT hopefully)
//         await pylon.burn(account.address, true)
//
//         console.log("Burned the PT")
//     })
// })
