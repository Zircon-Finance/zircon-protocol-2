const { expect } = require("chai");
const { ethers } = require('hardhat');
const assert = require("assert");
const {BigNumber} = require("ethers");
const {expandTo18Decimals} = require("./shared/utils");
const {coreFixtures, librarySetup} = require("./shared/fixtures");
const TEST_ADDRESSES = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000'
]
let factoryPylonInstance,  token0, token1,
    pylonInstance, poolTokenInstance0, poolTokenInstance1,
    factoryInstance, deployerAddress, account2, account,
    pair, feeToSetter, factoryEnergyInstance, library;

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

describe("Energy", () => {
    before(async () => {
        library = await librarySetup()
    })
    beforeEach(async () => {
        [account, account2] = await ethers.getSigners();
        deployerAddress = account.address;
        let fixtures = await coreFixtures(deployerAddress, library)
        factoryInstance = fixtures.factoryInstance
        token0 = fixtures.token0
        token1 = fixtures.token1
        poolTokenInstance0 = fixtures.poolTokenInstance0
        poolTokenInstance1 = fixtures.poolTokenInstance1
        pair = fixtures.pair
        pylonInstance = fixtures.pylonInstance
        factoryPylonInstance = fixtures.factoryPylonInstance
        feeToSetter = fixtures.feeToSetterInstance
        factoryEnergyInstance = fixtures.factoryEnergyInstance
        zirconPylonLibrary = fixtures.zirconPylonLibrary
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

    it("Should verify that the contract address generated are correct", async () => {
        let energy0Address = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
        // let energy1Address = await factoryEnergyInstance.getEnergy(token1.address, token0.address);
        let energyRevAddress = await factoryEnergyInstance.getEnergyRevenue(token0.address, token1.address);

        let energyRevAddressPair = await pair.energyRevenueAddress();
        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyRevAddress);
        let information = await zirconEnergyRevenue.zircon();

        expect(energyRevAddress).to.equal(energyRevAddressPair);
        expect(information.energy0).to.equal(energy0Address);
        expect(information.pylon0).to.equal(pylonInstance.address);
    });

    it('should send tokens to energy', async function () {
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

        let tok1Amount = expandTo18Decimals(5300)
        await init(expandTo18Decimals(1700), tok1Amount)

        let tokTransfer = tok1Amount.div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        await pylonInstance.mintPoolTokens(account.address, true);

        expect(await token1.balanceOf(energyAddress)).to.eq('1918552036199095')
    });

    it('should send tokens to energy (rev fee energy on)', async function () {
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
        let energyRevAddress = await pair.energyRevenueAddress()

        let tok1Amount = expandTo18Decimals(5300)
        await init(expandTo18Decimals(1700), tok1Amount)
        await feeToSetter.setFeePercentageEnergy(20)

        let tokTransfer = tok1Amount.div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        await pylonInstance.mintPoolTokens(account.address, true);


        console.log("sending", ethers.utils.formatEther(tokTransfer))
        console.log("fees", ethers.utils.formatEther(await token1.balanceOf(energyAddress)))

        expect(await token1.balanceOf(energyAddress)).to.eq('1918552036199095') // TODO: Change fee percentage
        expect(await token1.balanceOf(energyRevAddress)).to.eq('479638009049773') // TODO: Change fee percentage
    });


    it('should send tokens to energy (increased fees) ', async function () {
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

        let tok1Amount = expandTo18Decimals(5300)
        await init(expandTo18Decimals(1700), tok1Amount)

        let tokTransfer = tok1Amount.div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        await feeToSetter.setMinMaxFee(2, 51);

        await pylonInstance.mintPoolTokens(account.address, true);

        console.log("sending", ethers.utils.formatEther(tokTransfer))
        console.log("fees", ethers.utils.formatEther(await token1.balanceOf(energyAddress)))

        expect(await token1.balanceOf(energyAddress)).to.eq('3837104072398190') // TODO: Change fee percentage

    });

    it('should create oposite pylon and check energy', async function () {
        let tok1Amount = expandTo18Decimals(5300)
        await init(expandTo18Decimals(1700), tok1Amount)
        console.log("pairBalance account:", (await pair.balanceOf(account.address)).toString())

        await factoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
        let pylonAddress = await factoryPylonInstance.getPylon(token1.address, token0.address)

        let zPylon = await ethers.getContractFactory('ZirconPylon', {
            libraries: {
                ZirconLibrary: zirconPylonLibrary.address
            }
        })
        let newPylonInstance = await zPylon.attach(pylonAddress);
        // Let's transfer some tokens to the Pylon
        await token0.transfer(newPylonInstance.address, expandTo18Decimals(17))
        await token1.transfer(newPylonInstance.address, expandTo18Decimals(53))
        //Let's initialize the Pylon, this should call two sync
        await newPylonInstance.initPylon(account.address, overrides)

        let tokTransfer = tok1Amount.div(221)
        await token0.transfer(newPylonInstance.address, tokTransfer);
        await newPylonInstance.mintPoolTokens(account.address, true);
        let energyAddress = await factoryEnergyInstance.getEnergy(token1.address, token0.address);

        expect(await token0.balanceOf(energyAddress)).to.eq("2398190045248868")

        await token0.transfer(pair.address, expandTo18Decimals(1))
        await pair.swap(0, ethers.BigNumber.from('1662497915624478906'), account.address, '0x', overrides)

        tokTransfer = expandTo18Decimals(1)
        await token1.transfer(pylonInstance.address, tokTransfer);
        await pylonInstance.mintPoolTokens(account.address, true);

        let eAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
        let eAddress2 = await factoryEnergyInstance.getEnergy(token1.address, token0.address);
        console.log("energyRev", ethers.utils.formatEther(await pair.balanceOf(await pair.energyRevenueAddress())))
        console.log("energy", ethers.utils.formatEther(await pair.balanceOf(eAddress)))
        console.log("energy2", ethers.utils.formatEther(await pair.balanceOf(eAddress2)))
        expect(await pair.balanceOf(eAddress)).to.eq("4212324986358431")
        expect(await pair.balanceOf(eAddress2)).to.eq("794816008065010")

    });

    it('should send fees on swap to energy revenue', async function () {
        let energyRevAddress = await pair.energyRevenueAddress()
        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyRevAddress);

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

        expect(await pair.balanceOf(energyRevAddress)).to.eq("192444554813788688")

            // let balancePylon0 = await zirconEnergyRevenue.pylon0Balance()
            // let balancePylon1 = await zirconEnergyRevenue.pylon1Balance()
        console.log("contain", ethers.utils.formatEther(await pair.balanceOf(energyRevAddress)))

        // console.log("pylon0", ethers.utils.formatEther(balancePylon0))
        // console.log("pylon1", ethers.utils.formatEther(balancePylon1))

        expect(await zirconEnergyRevenue.reserve()).to.eq("192444554813788688")
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

        expect(await pair.balanceOf(energyAddress)).to.eq("12987469326803628")

    });

    it('should send fees on swap to energy revenue (changing rev fee percentage)', async function () {
        let energyRevAddress = await pair.energyRevenueAddress()
        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyRevAddress);

        await init(expandTo18Decimals(10), expandTo18Decimals(100))
        await feeToSetter.setFeePercentageRev(40)

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


        expect(await pair.balanceOf(energyRevAddress)).to.eq("195691422145489596")


        console.log("contain", ethers.utils.formatEther(await pair.balanceOf(energyRevAddress)))

        expect(await zirconEnergyRevenue.reserve()).to.eq("195691422145489596")
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

        expect(await pair.balanceOf(energyAddress)).to.eq("9740601995102720")

    });

    it('should send fees on swap to energy revenue (getting fees from rev)', async function () {
        let energyRevAddress = await pair.energyRevenueAddress()
        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyRevAddress);

        await init(expandTo18Decimals(10), expandTo18Decimals(100))
        await feeToSetter.setFeePercentageRev(40)
        await feeToSetter.setFeePercentageEnergy(20)

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

        expect(await pair.balanceOf(energyRevAddress)).to.eq("195691422145489596")

        // let balancePylon0 = await zirconEnergyRevenue.pylon0Balance()
        // let balancePylon1 = await zirconEnergyRevenue.pylon1Balance()
        console.log("contain", ethers.utils.formatEther(await pair.balanceOf(energyRevAddress)))

        // console.log("pylon0", ethers.utils.formatEther(balancePylon0))
        // console.log("pylon1", ethers.utils.formatEther(balancePylon1))

        let balance = await pair.balanceOf(energyRevAddress)

        let aBalance = ethers.BigNumber.from("31622776601683792319")
        expect(await pair.balanceOf(account.address)).to.eq(aBalance)
        await feeToSetter.getFees(pair.address, balance, account.address, energyRevAddress)
        expect(await pair.balanceOf(account.address)).to.eq(aBalance.add(balance))

        let pt1Balance = await token1.balanceOf(energyRevAddress)
        console.log("pt1Balance", ethers.utils.formatEther(pt1Balance))
        let aBalancept1 = ethers.BigNumber.from("999892526339955937107455")
        expect(await token1.balanceOf(account.address)).to.eq(aBalancept1)
        await feeToSetter.getFees(token1.address, pt1Balance, account.address, energyRevAddress)
        expect(await token1.balanceOf(account.address)).to.eq(aBalancept1.add(pt1Balance))

        expect(await zirconEnergyRevenue.reserve()).to.eq("0")
        expect(await token1.balanceOf(zirconEnergyRevenue.address)).to.eq("0")
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

        expect(await pair.balanceOf(energyAddress)).to.eq("9740601995102720")



    });

    it('should send fees on swap to energy revenue (changing pair fees)', async function () {
        let energyAddress = await pair.energyRevenueAddress()
        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyAddress);

        let energyContract = await ethers.getContractFactory('ZirconEnergy')
        let eAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

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

        // let balancePylon0 = await zirconEnergyRevenue.pylon0Balance()
        // let balancePylon1 = await zirconEnergyRevenue.pylon1Balance()
        expect(await pair.balanceOf(energyInstance.address)).to.eq("19481203990205442")

        console.log("contain", ethers.utils.formatEther(await pair.balanceOf(energyAddress)))

        // console.log("pylon0", ethers.utils.formatEther(balancePylon0))
        // console.log("pylon1", ethers.utils.formatEther(balancePylon1))

        let tokTransfer = expandTo18Decimals(10).div(221)
        await token1.transfer(pylonInstance.address, tokTransfer);
        console.log("sending", ethers.utils.formatEther(tokTransfer))


        await pylonInstance.mintPoolTokens(account.address, true);

        expect(await pair.balanceOf(energyAddress)).to.eq("289590940353806836")

        expect(await zirconEnergyRevenue.reserve()).to.eq("289590940353806836")
    });

    it('should send fees on swap to energy revenue on opposite pylon', async function () {
        await init(expandTo18Decimals(100), expandTo18Decimals(10))
        await factoryPylonInstance.addPylon(pair.address, token1.address, token0.address);
        let pylonAddress = await factoryPylonInstance.getPylon(token1.address, token0.address)
        let zPylon = await ethers.getContractFactory('ZirconPylon', {
            libraries: {
                ZirconLibrary: zirconPylonLibrary.address
            }
        })
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
        expect(await pair.balanceOf(energyAddress)).to.eq("189199575776119059")

        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyAddress);
        expect(await zirconEnergyRevenue.reserve()).to.eq("189199575776119059")

    });

    it('burning with energy', async function () {
        await init(expandTo18Decimals(10), expandTo18Decimals(10))
        let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
        let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
        let energyRevenueAddress = await pair.energyRevenueAddress()

        const newAmount0 = ethers.BigNumber.from('500000000000000000')
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("0") //TODO
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

        // Let's get some float shares...
        let swappedTokens = "49849771254208"
        await token0.transfer(pylonInstance.address, newAmount0)
        await expect(pylonInstance.mintPoolTokens(account.address, false))
            .to.emit(pair, 'Swap')
            .withArgs(pylonInstance.address, "50000000000000", "0", "0", swappedTokens, energyAddress)

        // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
        // Let's check that...


        // Here the fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("11704967097")

        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("39879817003367")

        // Let's get some anchor shares...
        // await token1.transfer(pylonInstance.address, newAmount0);
        // await pylonInstance.mintPoolTokens(account.address, true);
        //
        // // Here no fees for swapping
        // expect(await pair.balanceOf(energyRevenueAddress)).to.eq("115062756")
        //
        // // Here the Fees for entering the pool
        // expect(await token1.balanceOf(energyAddress)).to.eq(swappedTokens)
        //
        // let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        // await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        // await pylonInstance.burn(account2.address, true) //Burns to an account2
        // console.log("Burning...", ptb1.sub(initialPTS1).toString());
        //
        // // Here no fees for swapping
        // expect(await pair.balanceOf(energyRevenueAddress)).to.eq("115062756")

        // Here the Fees for entering the pool
        // expect(await token1.balanceOf(energyAddress)).to.eq("241")
        //
        // let ptb0 = await poolTokenInstance0.balanceOf(account.address);
        // await poolTokenInstance0.transfer(pylonInstance.address, ptb0)
        // await pylonInstance.burn(account2.address, false) //Burns to an account2
        // console.log("Burning...", ptb0.toString());
        //
        // // Here no fees for swapping
        // expect(await pair.balanceOf(energyRevenueAddress)).to.eq("0")
        //
        // // Here the Fees for entering the pool
        // expect(await token1.balanceOf(energyAddress)).to.eq("481")
    });

    it('burning without energy (checking pt slashing token)', async function () {

        await init(expandTo18Decimals(10), expandTo18Decimals(100))
        let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
        let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);

        // Time to swap, let's generate some fees
        await token0.transfer(pair.address, expandTo18Decimals(1))
        await pair.swap(0, ethers.BigNumber.from('1662497915624478906'), account.address, '0x', overrides)


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
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);
        let energyRevAddress = await pair.energyRevenueAddress()

        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zEnergy = await ethers.getContractFactory('ZirconEnergy')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyRevAddress);
        let zirconEnergy = await zEnergy.attach(energyAddress);

        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))

        await expect(pylonInstance.burnAsync(account2.address, true))

        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        await expect(pylonInstance.burnAsync(account2.address, true))

    });

    it('burning with energy (checking anchor slashing tokens)', async function () {
        await init(expandTo18Decimals(12), expandTo18Decimals(10))
        let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
        let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
        console.log("pair address", pair.address)
        await feeToSetter.setFeePercentageRev(90)

            await feeToSetter.setFees(10, ethers.BigNumber.from("40000000000000000"), 100, 240, 3,2);

        // Time to swap, let's generate some fees
        await token0.transfer(pair.address, expandTo18Decimals(4))
        let output = getOutputAmount(expandTo18Decimals(4), expandTo18Decimals(12), expandTo18Decimals(10))
        await pair.swap(0, output, account.address, '0x', overrides)

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
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

        let energyRevAddress = await pair.energyRevenueAddress()

        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zEnergy = await ethers.getContractFactory('ZirconEnergy')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyRevAddress);
        let zirconEnergy = await zEnergy.attach(energyAddress);

        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, initialPTS1)
        await expect(pylonInstance.burn(account2.address, true))
        let tok2Balance = await token1.balanceOf(account2.address)
        expect(tok2Balance).to.eq("845725770755454833")
        // 1790392821657 (From Omega Anchor)
        // 2429159020919464 (From Pylon + Omega PT)

    });
    it('burning async with energy (checking anchor slashing tokens)', async function () {
        await init(expandTo18Decimals(12), expandTo18Decimals(10))
        let initialPTS0 = await poolTokenInstance0.balanceOf(account.address);
        let initialPTS1 = await poolTokenInstance1.balanceOf(account.address);
        console.log("pair address", pair.address)
        await feeToSetter.setFeePercentageRev(90)

        // Time to swap, let's generate some fees
        await token0.transfer(pair.address, expandTo18Decimals(4))
        let output = getOutputAmount(expandTo18Decimals(4), expandTo18Decimals(12), expandTo18Decimals(10))
        await pair.swap(0, output, account.address, '0x', overrides)

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
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

        let energyRevAddress = await pair.energyRevenueAddress()

        let zEnergyRev = await ethers.getContractFactory('ZirconEnergyRevenue')
        let zEnergy = await ethers.getContractFactory('ZirconEnergy')
        let zirconEnergyRevenue = await zEnergyRev.attach(energyRevAddress);
        let zirconEnergy = await zEnergy.attach(energyAddress);

        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        // let tx = await pylonInstance.burnAsync(account2.address, true)
        // console.log("Burning...", await tx.wait());
        await expect(pylonInstance.burnAsync(account2.address, true))
        let tok2Balance = await token1.balanceOf(account2.address)
        expect(tok2Balance).to.eq("2430949413741121")
        // 1790392821657 (From Omega Anchor)
        // 2429159020919464 (From Pylon + Omega PT)

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
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);


        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        await pylonInstance.burnAsync(account2.address, true) //Burns to an account2
        console.log("Burning...", ptb1.sub(initialPTS1).toString());

        // Here no fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("117050198")

        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("1198160037127")
    });

    it('burning async with swap fees', async function () {
        let energyRevenueAddress = await pair.energyRevenueAddress()
        let energyAddress = await factoryEnergyInstance.getEnergy(token0.address, token1.address);

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
        expect(await token1.balanceOf(energyAddress)).to.eq("494160702744")

        // Let's get some anchor shares...
        await token1.transfer(pylonInstance.address, newAmount0);
        await pylonInstance.mintPoolTokens(account.address, true);
        expect(await token1.balanceOf(energyAddress)).to.eq("994160702744")

        // So After minting Float we do a swap so we pay both fees one for swapping one for entering in the pool
        // Let's check that...
        let ptb1 = await poolTokenInstance1.balanceOf(account.address);
        await poolTokenInstance1.transfer(pylonInstance.address, ptb1.sub(initialPTS1))
        await pylonInstance.burnAsync(account2.address, true)
        //Burns to an account2
        expect(await token1.balanceOf(account2.address)).to.eq("2499500022121607")
        // Here no fees for swapping
        expect(await pair.balanceOf(energyRevenueAddress)).to.eq("7350965676206650")
        // Here the Fees for entering the pool
        expect(await token1.balanceOf(energyAddress)).to.eq("1493360777454")
    });
})
