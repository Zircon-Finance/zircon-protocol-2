/*
// TODO: clean this...
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
    pair, feeToSetter;

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

// TODO: See case where we have a big dump
describe("Energy", () => {
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
        feeToSetter = fixtures.feeToSetterInstance
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

    it('should send tokens to energy', async function () {
        let energyAddress = await pylonInstance.energyAddress()

        let tok1Amount = expandTo18Decimals(5300)
        await init(expandTo18Decimals(1700), tok1Amount)

        let tokTransfer = tok1Amount.div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        await pylonInstance.mintPoolTokens(account.address, true);

        console.log("sending", ethers.utils.formatEther(tokTransfer))
        console.log("fees", ethers.utils.formatEther(await token1.balanceOf(energyAddress)))

        expect(await token1.balanceOf(energyAddress)).to.eq('2398190045248868') // TODO: Change fee percentage

    });

    it('should send tokens to energy with increased fees', async function () {
        let energyAddress = await pylonInstance.energyAddress()

        let tok1Amount = expandTo18Decimals(5300)
        await init(expandTo18Decimals(1700), tok1Amount)

        let tokTransfer = tok1Amount.div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        await feeToSetter.setMinMaxFee(2, 51);

        await pylonInstance.mintPoolTokens(account.address, true);

        console.log("sending", ethers.utils.formatEther(tokTransfer))
        console.log("fees", ethers.utils.formatEther(await token1.balanceOf(energyAddress)))

        expect(await token1.balanceOf(energyAddress)).to.eq('4796380090497737') // TODO: Change fee percentage

    });

    it('should create oposite pylon and check energy', async function () {
        let tok1Amount = expandTo18Decimals(5300)
        await init(expandTo18Decimals(1700), tok1Amount)

        await factoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
        let pylonAddress = await factoryPylonInstance.getPylon(token1.address, token0.address)

        let zPylon = await ethers.getContractFactory('ZirconPylon')
        let newPylonInstance = await zPylon.attach(pylonAddress);
        // Let's transfer some tokens to the Pylon
        await token0.transfer(newPylonInstance.address, expandTo18Decimals(17))
        await token1.transfer(newPylonInstance.address, expandTo18Decimals(53))
        //Let's initialize the Pylon, this should call two sync
        await newPylonInstance.initPylon(account.address, overrides)

        let tokTransfer = tok1Amount.div(221)
        await token0.transfer(newPylonInstance.address, tokTransfer);
        await newPylonInstance.mintPoolTokens(account.address, true);

        let energyAddress = await newPylonInstance.energyAddress()
        expect(await token0.balanceOf(energyAddress)).to.eq("2398190045248868") // TODO: Change fee percentage

        await token0.transfer(pair.address, expandTo18Decimals(1))
        await pair.swap(0, ethers.BigNumber.from('1662497915624478906'), account.address, '0x', overrides)

        tokTransfer = expandTo18Decimals(1)
        await token1.transfer(pylonInstance.address, tokTransfer);
        await pylonInstance.mintPoolTokens(account.address, true);

        let eAddress = await pylonInstance.energyAddress()
        let eAddress2 = await newPylonInstance.energyAddress()

        expect(await pair.balanceOf(eAddress)).to.eq("5265289425935735") // TODO: Change fee percentage
        expect(await pair.balanceOf(eAddress2)).to.eq("993161967017842") // TODO: Change fee percentage

    });

    it('should send fees on swap to energy revenue', async function () {
        let energyAddress = await pair.energyRevenueAddress()
        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyAddress);

        await init(expandTo18Decimals(10), expandTo18Decimals(100))

        // Time to swap, let's generate some fees
        await token0.transfer(pair.address, expandTo18Decimals(1))
        await pair.swap(0, ethers.BigNumber.from('1662497915624478906'), account.address, '0x', overrides)
        // Minting tokens is going to trigger a change in the VAB & VFB so let's check
        const newAmount0 = ethers.BigNumber.from('5000000000000000')
        console.log("sending", ethers.utils.formatEther(newAmount0))
        await token0.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, false)

        let tokTransfer = expandTo18Decimals(10).div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        console.log("sending", ethers.utils.formatEther(tokTransfer))
        await pylonInstance.mintPoolTokens(account.address, true);

        expect(await pair.balanceOf(energyAddress)).to.eq("189197686801517543") // TODO: Change fee percentage

        let balancePylon0 = await zirconEnergyRevenue.pylon0Balance()
        let balancePylon1 = await zirconEnergyRevenue.pylon1Balance()
        console.log("contain", ethers.utils.formatEther(await pair.balanceOf(energyAddress)))

        console.log("pylon0", ethers.utils.formatEther(balancePylon0))
        console.log("pylon1", ethers.utils.formatEther(balancePylon1))

        expect(await zirconEnergyRevenue.reserve()).to.eq("189197686801517543") // TODO: Change fee percentage

    });

    it('should send fees on swap to energy revenue (changing pair fees)', async function () {
        let energyAddress = await pair.energyRevenueAddress()
        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyAddress);

        let energyContract = await ethers.getContractFactory('ZirconEnergy')
        let eAddress = await pylonInstance.energyAddress()
        let energyInstance = await energyContract.attach(eAddress)
        await init(expandTo18Decimals(10), expandTo18Decimals(100))

        // Time to swap, let's generate some fees
        await token0.transfer(pair.address, expandTo18Decimals(1))
        await pair.swap(0, ethers.BigNumber.from('1662497915624478906'), account.address, '0x', overrides)
        // Minting tokens is going to trigger a change in the VAB & VFB so let's check
        const newAmount0 = ethers.BigNumber.from('5000000000000000')
        console.log("sending", ethers.utils.formatEther(newAmount0))
        await token0.transfer(pylonInstance.address, newAmount0)
        await feeToSetter.setDynamicRatio(3);

        await pylonInstance.mintPoolTokens(account.address, false)

        let balancePylon0 = await zirconEnergyRevenue.pylon0Balance()
        let balancePylon1 = await zirconEnergyRevenue.pylon1Balance()
        expect(await pair.balanceOf(energyInstance.address)).to.eq("24351504899890811")

        console.log("contain", ethers.utils.formatEther(await pair.balanceOf(energyAddress)))

        console.log("pylon0", ethers.utils.formatEther(balancePylon0))
        console.log("pylon1", ethers.utils.formatEther(balancePylon1))

        let tokTransfer = expandTo18Decimals(10).div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        console.log("sending", ethers.utils.formatEther(tokTransfer))


        await pylonInstance.mintPoolTokens(account.address, true);

        expect(await pair.balanceOf(energyAddress)).to.eq("284720638333668943")

        expect(await zirconEnergyRevenue.reserve()).to.eq("284720638333668943")

    });

    it('should send fees on swap to energy revenue on opposite pylon', async function () {
        await init(expandTo18Decimals(100), expandTo18Decimals(10))
        await factoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
        let pylonAddress = await factoryPylonInstance.getPylon(token1.address, token0.address)
        let zPylon = await ethers.getContractFactory('ZirconPylon')
        pylonInstance = await zPylon.attach(pylonAddress);
        let t = token0
        token0 = token1
        token1 = t
        // Time to swap, let's generate some fees
        await token0.transfer(pair.address, expandTo18Decimals(1))
        await pair.swap(ethers.BigNumber.from('1662497915624478906'), 0, account.address, '0x', overrides)
        // Minting tokens is going to trigger a change in the VAB & VFB so let's check
        // Let's transfer some tokens to the Pylon
        await token0.transfer(pylonInstance.address, expandTo18Decimals(5))
        await token1.transfer(pylonInstance.address, expandTo18Decimals(2))
        //Let's initialize the Pylon, this should call two sync
        await pylonInstance.initPylon(account.address, overrides)

        const newAmount0 = expandTo18Decimals(1)
        await token0.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, false)

        let tokTransfer = expandTo18Decimals(10).div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        await pylonInstance.mintPoolTokens(account.address, true);

        let energyAddress = await pair.energyRevenueAddress()
        expect(await pair.balanceOf(energyAddress)).to.eq("189199528554537436")

        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyAddress);
        expect(await zirconEnergyRevenue.reserve()).to.eq("189199528554537436")

    });

    it('burning with energy', async function () {
        await init(expandTo18Decimals(10), expandTo18Decimals(10))
        let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
        let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
        let energyRevenueAddress = await pair.energyRevenueAddress()

        const newAmount0 = ethers.BigNumber.from('500000000000000000')
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("0") //TODO

        // Let's get some float shares...
        await token0.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, false)

        // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
        // Let's check that...
        let energyAddress = await pylonInstance.energyAddress()

        // Here the fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("115062756") //TODO

        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("498499977125")

        // Let's get some anchor shares...
        await token1.transfer(pylonInstance.address, newAmount0);
        await pylonInstance.mintPoolTokens(account.address, true);

        // Here no fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("115062756")

        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("998499977125")

        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        await pylonInstance.burn(account2.address, true) //Burns to an account2
        console.log("Burning...", ptb1.sub(initialPTS1).toString());

        // Here no fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("115062756")

        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("241")

        let ptb0 = await poolTokenInstance0.balanceOf(account.address);
        await poolTokenInstance0.transfer(pylonInstance.address, ptb0)
        await pylonInstance.burn(account2.address, false) //Burns to an account2
        console.log("Burning...", ptb0.toString());

        // Here no fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("0")

        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("481")
    });

    it('burning async with energy', async function () {
        await init(expandTo18Decimals(10), expandTo18Decimals(10))
        let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
        let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
        console.log("pair address", pair.address)
        const newAmount0 = ethers.BigNumber.from('5000000000000000')

        // Let's get some float shares...
        await token0.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, false)
        // Let's get some anchor shares...
        await token1.transfer(pylonInstance.address, newAmount0);
        await pylonInstance.mintPoolTokens(account.address, true);
        // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
        // Let's check that...
        let energyRevenueAddress = await pair.energyRevenueAddress()
        let energyAddress = await pylonInstance.energyAddress()
        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyAddress);

        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        await pylonInstance.burnAsync(account2.address, true) //Burns to an account2
        console.log("Burning...", ptb1.sub(initialPTS1).toString());
        console.log("Burning...", energyAddress);
        //
        // // Here no fees for swapping
        // expect(await pair.balanceOf(energyRevenueAddress)).to.eq("0")
        //
        // // Here the Fees for entering the pool
        // expect(await token1.balanceOf(energyAddress)).to.eq("319")
    });

    it('burning async with energy', async function () {
        await init(expandTo18Decimals(10), expandTo18Decimals(10))
        let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
        let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);

        const newAmount0 = ethers.BigNumber.from('5000000000000000')

        // Let's get some float shares...
        await token0.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, false)
        // Let's get some anchor shares...
        await token1.transfer(pylonInstance.address, newAmount0);
        await pylonInstance.mintPoolTokens(account.address, true);
        // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
        // Let's check that...
        let energyRevenueAddress = await pair.energyRevenueAddress()
        let energyAddress = await pylonInstance.energyAddress()

        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        await pylonInstance.burnAsync(account2.address, true) //Burns to an account2
        console.log("Burning...", ptb1.sub(initialPTS1).toString());

        // Here no fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("0")

        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("319")
    });

    it('burning async with swap fees', async function () {
        let energyRevenueAddress = await pair.energyRevenueAddress()
        let energyAddress = await pylonInstance.energyAddress()

        await init(expandTo18Decimals(200), expandTo18Decimals(200))
        let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
        let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);

        const newAmount0 = ethers.BigNumber.from('5000000000000000')

        await token0.transfer(pair.address, expandTo18Decimals(1))
        await pair.swap(0, ethers.BigNumber.from('900000000000000000'), account.address, '0x', overrides)
        // Let's get some float shares...
        await token0.transfer(pylonInstance.address, newAmount0)
        await pylonInstance.mintPoolTokens(account.address, false)
        //expect(await pair.balanceOf(energyAddress)).to.eq("2728835295394547")
        expect(await token1.balanceOf(energyAddress)).to.eq("79")

        // Let's get some anchor shares...
        await token1.transfer(pylonInstance.address, newAmount0);
        await pylonInstance.mintPoolTokens(account.address, true);
        expect(await token1.balanceOf(energyAddress)).to.eq("159")


        // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
        // Let's check that...
        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        await pylonInstance.burnAsync(account2.address, true)
        //Burns to an account2
        expect(await token1.balanceOf(account2.address)).to.eq("2440604150336633")
        // Here no fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("7985796330232221")
        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("317")
    });
})

*/
