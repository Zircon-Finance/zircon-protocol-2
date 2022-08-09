const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals} = require("./shared/utils");
const {coreFixtures} = require("./shared/fixtures");

describe("Psionic Farm Factory", () => {
    // For this simulation test, it'll mantain the same ratio

    let TOKEN0_AMOUNT = expandTo18Decimals(1)
    let TOKEN1_AMOUNT = expandTo18Decimals(2)


    beforeEach(async () => {
        [account, account2] = await ethers.getSigners();
        deployerAddress = account.address;
        blockNumber = await ethers.provider.getBlockNumber()
        startBlock = blockNumber + 100
        endBlock =  blockNumber + 500

        let fixtures = await coreFixtures(deployerAddress, startBlock, endBlock, [expandTo18Decimals("100").toString(), 25]);
        psionicFarm = fixtures.psionicFarm
        psionicFactory = fixtures.psionicFactory
        psionicVault = fixtures.psionicVault

        tk0 = fixtures.tk0
        tk1 = fixtures.tk1
        tk2 = fixtures.tk2
    });


    it('should not allow more investment by the user', async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)
        await psionicFarm.deposit(expandTo18Decimals("100"))
        await expect(psionicFarm.deposit(expandTo18Decimals(1))).to.be.
        revertedWith("Deposit: Amount above limit")
    });

    it('should allow investment after number of blocks ', async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(100)
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, expandTo18Decimals(100));
        let blockNumber = await ethers.provider.getBlockNumber()
        let newBlock = startBlock + 30 - blockNumber
        await ethers.provider.send("hardhat_mine", ['0x' + newBlock.toString(16)]);
        await psionicFarm.deposit(expandTo18Decimals(1))
    });

    it('should revert if token is already added', async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicVault.add(tk0.address)).to.be.
        revertedWith("Vault: Token already added");
    });

    it('should add token', async function () {
        let tok = await ethers.getContractFactory('Token');
        let tk0 = await tok.deploy('Tok', 'TOK');

        await psionicVault.add(tk0.address)

        await expect(psionicVault.add(tk0.address)).to.be.
        revertedWith("Vault: Token already added");
    });

    it('should remove token', async function () {
        await psionicVault.remove(tk0.address)

        await psionicVault.add(tk0.address)

        await expect(psionicVault.add(tk0.address)).to.be.
        revertedWith("Vault: Token already added");
    });

    it('should not remove all token', async function () {
        await psionicVault.remove(tk0.address)
        await expect(psionicVault.remove(tk1.address)).to.be.revertedWith("At least 1 token is required");
    });

    it('should pause only owner', async function () {
        await expect(psionicFactory.connect(account2).switchPause()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should block on pause', async function () {
        await psionicFactory.switchPause()

        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(100)
        )).to.be.revertedWith('The factory is paused')
 

    });
})
