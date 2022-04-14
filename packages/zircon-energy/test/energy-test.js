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
let factoryEnergyInstance,
   deployerAddress, account2, account;

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
const overrides = {
  gasLimit: 9999999
}

describe("Energy", () => {

  beforeEach(async () => {
    [account, account2] = await ethers.getSigners();
    deployerAddress = account.address;

    let fixtures = await coreFixtures(deployerAddress)
    factoryEnergyInstance = fixtures.factoryEnergyInstance
    console.log("hello")
  });

  it('should initialize Pylon', async function () {
  });

})
