const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals} = require("./shared/utils");
const {coreFixtures} = require("./shared/fixtures");

describe("Simulation", () => {
    // For this simulation test, it'll mantain the same ratio

    let TOKEN0_AMOUNT = expandTo18Decimals(1)
    let TOKEN1_AMOUNT = expandTo18Decimals(2)

    beforeEach(async () => {
        [account, account2] = await ethers.getSigners();
        deployerAddress = account.address;
        let fixtures = await coreFixtures(deployerAddress)
       



    });


    it('should send tokens to energy', async function () {

    });

})
