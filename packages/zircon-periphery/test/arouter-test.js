// TODO: clean this...
const { expect } = require("chai");
const { ethers, waffle } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals} = require("./shared/utils");
const {coreFixtures} = require("./shared/fixtures");
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]
let farm

describe("Pylon Router", () => {
    beforeEach(async () => {
        [account, account2] = await ethers.getSigners();
        deployerAddress = account.address;

        let fixtures = await coreFixtures(deployerAddress, account)
        farm = fixtures.farm

    });

    it('should initialize Pylon', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)

        expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from('1343502884254439296'))
    });



})

