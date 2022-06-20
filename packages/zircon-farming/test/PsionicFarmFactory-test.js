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

        let fixtures = await coreFixtures(deployerAddress, startBlock, endBlock, [0,0]);
        psionicFarm = fixtures.psionicFarm
        psionicFactory = fixtures.psionicFactory
        psionicVault = fixtures.psionicVault

        tk0 = fixtures.tk0
        tk1 = fixtures.tk1
        tk2 = fixtures.tk2


    });


    it('shopuld deploy pool', async function () {
        let adresses = await psionicFactory.callStatic.deployPool(
            tk0.address,
            [tk2.address, tk1.address],
            0,
            100,
            0,
            0,
            account.address
        )
        await expect(psionicFactory.deployPool(
            tk0.address,
            [tk2.address, tk1.address],
            0,
            100,
            0,
            0,
            account.address
        )).to.emit(psionicFactory, 'NewPsionicFarmContract')
            .withArgs(adresses[0]);
    });
    it("should initial parameters be correct", async function () {
        expect(String(await psionicFarm.PRECISION_FACTOR())).to.eq("1000000000000")
        expect(String(await psionicFarm.lastRewardBlock())).to.eq(String(startBlock))
        expect(String(await psionicFarm.bonusEndBlock())).to.eq(String(endBlock))
        expect(String(await psionicFarm.poolLimitPerUser())).to.eq(String(0))
        expect(await psionicFarm.hasUserLimit()).to.eq(false)
        expect(String(await psionicFarm.owner())).to.eq(String(account.address))
    });

    it("should deposit", async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)
        await expect(psionicFarm.deposit(
            ethers.BigNumber.from('10000')
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, ethers.BigNumber.from('10000'));
        expect(String(await psionicFarm.pendingReward(account.address))).to.eq("0")
    });

    it("should deposit and advance block", async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(3)
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, expandTo18Decimals(3));
        let blockNumber = await ethers.provider.getBlockNumber()
        let newBlock = startBlock + 1 - blockNumber
        await ethers.provider.send("hardhat_mine", ['0x' + newBlock.toString(16)]);

        expect((await psionicFarm.pendingReward(account.address)).toString()).to.eq("999999999999000000")
    });

    it("should deposit and advance block + 10", async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(3)
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, expandTo18Decimals(3));
        let blockNumber = await ethers.provider.getBlockNumber()
        let newBlock = startBlock + 10 - blockNumber
        await ethers.provider.send("hardhat_mine", ['0x' + newBlock.toString(16)]);
        expect((await psionicFarm.pendingReward(account.address)).toString()).to.eq("9999999999999000000")
    });

    it("should withdraw", async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(3)
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, expandTo18Decimals(3));
        let blockNumber = await ethers.provider.getBlockNumber()
        let newBlock = startBlock + 10 - blockNumber
        await ethers.provider.send("hardhat_mine", ['0x' + newBlock.toString(16)]);
        let balanceTK0 = await tk0.balanceOf(account.address);
        let balanceTK1 = await tk1.balanceOf(account.address);
        let balanceLP = await tk2.balanceOf(account.address);

        let withdrawal = expandTo18Decimals(3)
        let tsVault = await psionicVault.totalSupply()
        let bVaultTK1 = await tk1.balanceOf(psionicVault.address)

        let bVaultTK0 = await tk0.balanceOf(psionicVault.address)

        // Hard Coded because it changes block on withdraw
        let pending = ethers.BigNumber.from('10999999999998000000')
        await psionicFarm.withdraw(withdrawal);

        let newBalanceTK0 = await tk0.balanceOf(account.address);
        let newBalanceTK1 = await tk1.balanceOf(account.address);
        let newBalanceLP = await tk2.balanceOf(account.address);


        let expectedWithdrawalTK0 = (pending.mul(bVaultTK0)).div(tsVault)
        let expectedWithdrawalTK1 = (pending.mul(bVaultTK1)).div(tsVault)

        expect(expectedWithdrawalTK1).to.eq(newBalanceTK1.sub(balanceTK1))
        expect(expectedWithdrawalTK0).to.eq(newBalanceTK0.sub(balanceTK0))
        expect(expandTo18Decimals(3)).to.eq(newBalanceLP.sub(balanceLP))
    });

    it("should receive rewards on deposit 0", async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(3)
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, expandTo18Decimals(3));
        let blockNumber = await ethers.provider.getBlockNumber()
        let newBlock = startBlock + 10 - blockNumber
        await ethers.provider.send("hardhat_mine", ['0x' + newBlock.toString(16)]);
        let balanceTK0 = await tk0.balanceOf(account.address);
        let balanceTK1 = await tk1.balanceOf(account.address);
        let balanceLP = await tk2.balanceOf(account.address);

        let withdrawal = expandTo18Decimals(3)
        let tsVault = await psionicVault.totalSupply()
        let bVaultTK1 = await tk1.balanceOf(psionicVault.address)

        let bVaultTK0 = await tk0.balanceOf(psionicVault.address)

        // Hard Coded because it changes block on withdraw
        let pending = ethers.BigNumber.from('10999999999998000000')
        await psionicFarm.deposit(expandTo18Decimals(0));

        let newBalanceTK0 = await tk0.balanceOf(account.address);
        let newBalanceTK1 = await tk1.balanceOf(account.address);
        let newBalanceLP = await tk2.balanceOf(account.address);


        let expectedWithdrawalTK0 = (pending.mul(bVaultTK0)).div(tsVault)
        let expectedWithdrawalTK1 = (pending.mul(bVaultTK1)).div(tsVault)

        expect(expectedWithdrawalTK1).to.eq(newBalanceTK1.sub(balanceTK1))
        expect(expectedWithdrawalTK0).to.eq(newBalanceTK0.sub(balanceTK0))

    });

    it("should receive rewards on withdraw 0", async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(3)
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, expandTo18Decimals(3));
        let blockNumber = await ethers.provider.getBlockNumber()
        let newBlock = startBlock + 10 - blockNumber
        await ethers.provider.send("hardhat_mine", ['0x' + newBlock.toString(16)]);
        let balanceTK0 = await tk0.balanceOf(account.address);
        let balanceTK1 = await tk1.balanceOf(account.address);
        let balanceLP = await tk2.balanceOf(account.address);

        let withdrawal = expandTo18Decimals(3)
        let tsVault = await psionicVault.totalSupply()
        let bVaultTK1 = await tk1.balanceOf(psionicVault.address)

        let bVaultTK0 = await tk0.balanceOf(psionicVault.address)

        // Hard Coded because it changes block on withdraw
        let pending = ethers.BigNumber.from('10999999999998000000')
        await psionicFarm.withdraw(expandTo18Decimals(0));

        let newBalanceTK0 = await tk0.balanceOf(account.address);
        let newBalanceTK1 = await tk1.balanceOf(account.address);
        let newBalanceLP = await tk2.balanceOf(account.address);


        let expectedWithdrawalTK0 = (pending.mul(bVaultTK0)).div(tsVault)
        let expectedWithdrawalTK1 = (pending.mul(bVaultTK1)).div(tsVault)

        expect(expectedWithdrawalTK1).to.eq(newBalanceTK1.sub(balanceTK1))
        expect(expectedWithdrawalTK0).to.eq(newBalanceTK0.sub(balanceTK0))

    });

    it("should receive rewards on withdraw 0", async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(3)
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, expandTo18Decimals(3));

        await expect(psionicFarm.withdraw(expandTo18Decimals(4))).to.be.revertedWith('Amount to withdraw too high')
    });

    it("Admin cannot set a limit", async function () {
        await expect(psionicFarm.updatePoolLimitPerUser(true, expandTo18Decimals(1))).to.be.revertedWith('Must be set')
    });

    it("Cannot change after start reward per block, nor start block or end block", async function () {
        let blockNumber = await ethers.provider.getBlockNumber()
        let newBlock = startBlock + 10 - blockNumber
        await ethers.provider.send("hardhat_mine", ['0x' + newBlock.toString(16)]);
        await expect(psionicFarm.updateStartAndEndBlocks("1", "10")).to.be.revertedWith('Pool has started')
    });

    it("Cannot change after start reward per block, nor start block or end block", async function () {
        await tk2.approve(psionicFarm.address, ethers.constants.MaxUint256)

        await expect(psionicFarm.deposit(
            expandTo18Decimals(3)
        )).to.emit(psionicFarm, 'Deposit')
            .withArgs(account.address, expandTo18Decimals(3));
        let blockNumber = await ethers.provider.getBlockNumber()
        let newBlock = endBlock - blockNumber
        await ethers.provider.send("hardhat_mine", ['0x' + newBlock.toString(16)]);
        let balanceTK0 = await tk0.balanceOf(account.address);
        let balanceTK1 = await tk1.balanceOf(account.address);
        let balanceLP = await tk2.balanceOf(account.address);

        let withdrawal = expandTo18Decimals(3)
        let tsVault = await psionicVault.totalSupply()
        let bVaultTK1 = await tk1.balanceOf(psionicVault.address)

        let bVaultTK0 = await tk0.balanceOf(psionicVault.address)

        // Hard Coded because it changes block on withdraw
        let pending = ethers.BigNumber.from('399999999999999000000')
        await psionicFarm.withdraw(expandTo18Decimals(0));

        let newBalanceTK0 = await tk0.balanceOf(account.address);
        let newBalanceTK1 = await tk1.balanceOf(account.address);
        let newBalanceLP = await tk2.balanceOf(account.address);


        let expectedWithdrawalTK0 = (pending.mul(bVaultTK0)).div(tsVault)
        let expectedWithdrawalTK1 = (pending.mul(bVaultTK1)).div(tsVault)

        expect(expectedWithdrawalTK1).to.eq(newBalanceTK1.sub(balanceTK1))
        expect(expectedWithdrawalTK0).to.eq(newBalanceTK0.sub(balanceTK0))

    });

    it("Cannot deploy a pool with SmartChefFactory if not owner", async function () {
        await expect(psionicFactory.connect(account2).deployPool(
            tk0.address,
            [tk2.address, tk1.address],
            0,
            100,
            0,
            0,
            account.address
        )).to.be.revertedWith("Ownable: caller is not the owner")
    });

    it("Cannot deploy a pool with reward token repeated", async function () {
        await expect(psionicFactory.deployPool(
            tk0.address,
            [tk2.address, tk2.address],
            0,
            100,
            0,
            0,
            account.address
        )).to.be.revertedWith("Tokens must be unique")
    });
    it("Owner can recover token", async function () {
        let tok = await ethers.getContractFactory('Token');
        let tk0 = await tok.deploy('Tokenino', 'TOK');
        await tk0.transfer(psionicFarm.address, expandTo18Decimals(1))

        await expect(psionicFarm.recoverToken(tk0.address)).to.emit(
            psionicFarm, 'TokenRecovery')
            .withArgs(tk0.address, expandTo18Decimals(1));

    });

    it("Owner cannot recover token if balance is zero", async function () {
        let tok = await ethers.getContractFactory('Token');
        let tk0 = await tok.deploy('Tokenino', 'TOK');
        await expect(psionicFarm.recoverToken(tk0.address)).to.be.
            revertedWith("Operations: Cannot recover zero balance")
    });
    it("Owner cannot recover staked token", async function () {
        await expect(psionicFarm.recoverToken(tk2.address)).to.be.
            revertedWith( "Operations: Cannot recover staked token")
    });

    it("Owner cannot recover reward token", async function () {
        await expect(psionicFarm.recoverToken(psionicVault.address)).to.be.
            revertedWith( "Operations: Cannot recover Psionic Vault token")
    });



})
