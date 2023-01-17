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
let factoryPylonInstance, pylonInstance,
    token0, token1,
    poolTokenInstance0, poolTokenInstance1,
    factoryInstance,
    deployerAddress, account2, account,
    pair, router, WETH,
    pairContract,
    poolTokenContract,
    pylonContract,
    anchorFarm, floatFarm,
    psionicFactoryInstance, psionicFarmInit, classicRouter,
    ptFactoryInstance;

const MINIMUM_LIQUIDITY = ethers.BigNumber.from(10).pow(3)
const overrides = {
    gasLimit: 9999999
}

async function addLiquidity(token0Amount, token1Amount) {
    await token0.transfer(pair.address, token0Amount)
    await token1.transfer(pair.address, token1Amount)
    await pair.mint(account.address)
}

describe("Pylon Router", () => {
    beforeEach(async () => {
        [account, account2] = await ethers.getSigners();
        deployerAddress = account.address;

        let fixtures = await coreFixtures(deployerAddress, account)
        token0 = fixtures.token0
        token1 = fixtures.token1
        pair = fixtures.pair
        router = fixtures.routerInstance;
        classicRouter = fixtures.normalRouterInstance;
        WETH = fixtures.WETHInstance;
        factoryInstance = fixtures.factoryInstance
        poolTokenInstance0 = fixtures.poolTokenInstance0
        poolTokenInstance1 = fixtures.poolTokenInstance1
        pylonInstance = fixtures.pylonInstance
        factoryPylonInstance = fixtures.factoryPylonInstance
        pairContract = fixtures.pairContract
        poolTokenContract = fixtures.poolTokenContract
        pylonContract = fixtures.pylonContract
        anchorFarm = fixtures.anchorFarm
        floatFarm = fixtures.floatFarm
        psionicFactoryInstance = fixtures.psionicFactoryInstance
        psionicFarmInit = fixtures.psionicFarmInit
        ptFactoryInstance = fixtures.ptFactoryInstance

    });

    it('should initialize Pair and then Pylon', async function () {
        await token0.approve(classicRouter.address, ethers.constants.MaxUint256)
        await token1.approve(classicRouter.address, ethers.constants.MaxUint256)

        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await classicRouter.addLiquidity(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256
        )
        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)
        expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from('1131370849898476038'))
    });

    it('should initialize Pylon', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)


        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)

        expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from('1131370849898475039'))
    });

    it('should initialize Pylon WETH', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        // await WETH.approve(router.address, ethers.constants.MaxUint256)
        console.log("init")
        await router.initETH(
            token0.address,
            expandTo18Decimals(1),
            true,
            account.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})
        console.log("init done")

        //Let's get the instances of the new created Pylon and pair....
        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, WETH.address);
        let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);

        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        // Let''s check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('999999999999999000'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('200000000000000000'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('1131370849898475039'))
    });

    it('should revert when not initialized', async function () {
        await expect(router.addSyncLiquidity(
            token0.address,
            token1.address,
            expandTo18Decimals(2),
            0,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256)).to.be.revertedWith(
            'ZPR: Pylon Not Initialized'
        )
    });

    it('should add sync liquidity', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)
        await router.addSyncLiquidity(
            token0.address,
            token1.address,
            ethers.BigNumber.from('44999999999999929'),
            0,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256);
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2044995499999998930'))
    });

    it('should add sync liquidity & stake', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)
        await poolTokenInstance1.approve(anchorFarm.address, ethers.constants.MaxUint256)
        await router.addSyncLiquidity(
            token0.address,
            token1.address,
            ethers.BigNumber.from('44995499999999930'),
            0,
            true,
            account.address,
            anchorFarm.address,
            ethers.constants.MaxUint256);
        let user = await anchorFarm.userInfo(account.address);
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
        expect(user[0]).to.eq(ethers.BigNumber.from('44991000449999931'))
    });


    it('should add sync liquidity ETH', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.initETH(
            token0.address,
            expandTo18Decimals(1),
            true,
            account.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})
        await router.addSyncLiquidityETH(
            token0.address,
            true,
            0,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});
        //expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1022004889975550110'))
        //Let's get the instances of the new created Pylon and pair....



        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, WETH.address);
        let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);


        // Let''s check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('999999999999999000'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('3668641793479129693'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('47495015523107697'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('1904012860705893601'))
    });

    it('should add & stake sync liquidity ETH', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.initETH(
            token0.address,
            expandTo18Decimals(1),
            true,
            account.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})
        //Let's get the instances of the new created Pylon and pair....
        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, WETH.address);
        let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        let farmAddress = await psionicFactoryInstance.callStatic.deployPool(poolAddress0, [token0.address], 0, 1000, 0, 0, account.address)
        await psionicFactoryInstance.deployPool(poolAddress0, [token0.address], 0, 1000, 0, 0, account.address)
        let farm = psionicFarmInit.attach(farmAddress[0]);

        await ptInstance0.approve(farm.address, ethers.constants.MaxUint256)
        await router.addSyncLiquidityETH(
            token0.address,
            true,
            0,
            account.address,
            farm.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});


        // Let''s check that everything was correctly minted....
        let user = await farm.userInfo(account.address);
        expect(user[0]).to.eq(ethers.BigNumber.from('1668641793479130693'))

        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
    });

    // it('should add async-100 liquidity', async function () {
    //     await token0.approve(router.address, ethers.constants.MaxUint256)
    //     await token1.approve(router.address, ethers.constants.MaxUint256)
    //     await router.init(
    //         token0.address,
    //         token1.address,
    //         expandTo18Decimals(1),
    //         expandTo18Decimals(2),
    //         account.address,
    //         ethers.constants.MaxUint256)
    //     await router.addAsyncLiquidity100(
    //         token0.address,
    //         token1.address,
    //         ethers.BigNumber.from('44999999999999929'),
    //         true,
    //         account.address,
    //         ethers.constants.AddressZero,
    //         ethers.constants.MaxUint256);
    //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2044337096417788132'))
    // });

    // it('should add & stake async-100 liquidity', async function () {
    //     await token0.approve(router.address, ethers.constants.MaxUint256)
    //     await token1.approve(router.address, ethers.constants.MaxUint256)
    //     await router.init(
    //         token0.address,
    //         token1.address,
    //         expandTo18Decimals(1),
    //         expandTo18Decimals(2),
    //         account.address,
    //         ethers.constants.MaxUint256)
    //     await poolTokenInstance1.approve(anchorFarm.address, ethers.constants.MaxUint256)
    //     await router.addAsyncLiquidity100(
    //         token0.address,
    //         token1.address,
    //         ethers.BigNumber.from('44999999999999929'),
    //         true,
    //         account.address,
    //         anchorFarm.address,
    //         ethers.constants.MaxUint256);
    //     let user = await anchorFarm.userInfo(account.address);
    //     expect(user[0]).to.eq(ethers.BigNumber.from('44337096417789132'))
    //
    //     expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
    // });

    // it('should add async-100 liquidity ETH', async function () {
    //     await token0.approve(router.address, ethers.constants.MaxUint256)
    //     await token1.approve(router.address, ethers.constants.MaxUint256)
    //     await router.initETH(
    //         token0.address,
    //         expandTo18Decimals(1),
    //         true,
    //         account.address,
    //         ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})
    //     await router.addAsyncLiquidity100ETH(
    //         token0.address,
    //         true,
    //         account.address,
    //         ethers.constants.AddressZero,
    //         ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});
    //     //expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1022004889975550110'))
    //     //Let's get the instances of the new created Pylon and pair....
    //     let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
    //     let newPair = pairContract.attach(pairAddress);
    //
    //     let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
    //     let pylon = pylonContract.attach(pylonAddress);
    //     let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);
    //     let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token1.address);
    //     let ptInstance0 = poolTokenContract.attach(poolAddress0);
    //     let ptInstance1 = poolTokenContract.attach(poolAddress1);
    //
    //     // Let's check that everything was correctly minted....
    //     expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('999999999999999000'))
    //     expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('3307597488430898031'))
    //     expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('50000000000000000'))
    //     expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('1923946637768997365'))
    // });
    // it('should add & stake async-100 liquidity ETH', async function () {
    //     await token0.approve(router.address, ethers.constants.MaxUint256)
    //     await token1.approve(router.address, ethers.constants.MaxUint256)
    //     await router.initETH(
    //         token0.address,
    //         expandTo18Decimals(1),
    //         true,
    //         account.address,
    //         ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})
    //     //Let's get the instances of the new created Pylon and pair....
    //     let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
    //     let newPair = pairContract.attach(pairAddress);
    //
    //     let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
    //     let pylon = pylonContract.attach(pylonAddress);
    //     let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);
    //     let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token1.address);
    //     let ptInstance0 = poolTokenContract.attach(poolAddress0);
    //     let ptInstance1 = poolTokenContract.attach(poolAddress1);
    //
    //     let farmAddress = await psionicFactoryInstance.callStatic.deployPool(poolAddress0, [token0.address], 0, 100, 0, 0, account.address)
    //     await psionicFactoryInstance.deployPool(poolAddress0, [token0.address], 0, 100, 0, 0, account.address)
    //     let farm = psionicFarmInit.attach(farmAddress[0]);
    //
    //     await ptInstance0.approve(farm.address, ethers.constants.MaxUint256)
    //     await router.addAsyncLiquidity100ETH(
    //         token0.address,
    //         true,
    //         account.address,
    //         farm.address,
    //         ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});
    //
    //
    //     // Let''s check that everything was correctly minted....
    //     let user = await farm.userInfo(account.address);
    //     expect(user[0]).to.eq(ethers.BigNumber.from('1307597488430899031'))
    //
    //     expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
    // });

    it('should add async liquidity', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)

        await router.addAsyncLiquidity(
            token0.address,
            token1.address,
            ethers.BigNumber.from('44999999999999929'),
            ethers.BigNumber.from('22999999999999929'),
            '0',
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256);
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2045995267862686148'))
    });

    it('should add & stake async liquidity', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)
        await poolTokenInstance0.approve(floatFarm.address, ethers.constants.MaxUint256)

        await router.addAsyncLiquidity(
            token0.address,
            token1.address,
            ethers.BigNumber.from('44999999999999929'),
            ethers.BigNumber.from('22999999999999929'),
            '0',
            false,
            account.address,
            floatFarm.address,
            ethers.constants.MaxUint256);

        let user = await floatFarm.userInfo(account.address);
        expect(user[0]).to.eq(ethers.BigNumber.from('22996557556183129'))
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
    });

    it('should add async liquidity ETH', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.initETH(
            token0.address,
            expandTo18Decimals(1),
            true,
            account.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})

        await router.addAsyncLiquidityETH(
            token0.address,
            ethers.BigNumber.from('1022999999999998928'),
            '0',
            true,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});

        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, WETH.address);
        let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        // Let''s check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2999300518546997480'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('200000000000000000'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('2757426228443578592'))

    });

    it('should add & stake async liquidity ETH', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.initETH(
            token0.address,
            expandTo18Decimals(1),
            true,
            account.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})


        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, WETH.address);
        let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        let farmAddress = await psionicFactoryInstance.callStatic.deployPool(poolAddress0, [token0.address], 0, 1000, 0, 0, account.address)
        await psionicFactoryInstance.deployPool(poolAddress0, [token0.address], 0, 1000, 0, 0, account.address)
        let farm = psionicFarmInit.attach(farmAddress[0]);

        await ptInstance0.approve(farm.address, ethers.constants.MaxUint256)

        await router.addAsyncLiquidityETH(
            token0.address,
            ethers.BigNumber.from('1022999999999998928'),
            '0',
            true,
            true,
            account.address,
            farm.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});



        // Let''s check that everything was correctly minted....
        let user = await farm.userInfo(account.address);
        expect(user[0]).to.eq(ethers.BigNumber.from('1999300518546998480'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('699481453000520'))

    });



    it('should remove liquidity1', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await poolTokenInstance1.approve(router.address, ethers.constants.MaxUint256)
        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)
        await router.addAsyncLiquidity(
            token0.address,
            token1.address,
            ethers.BigNumber.from('44999999999999929'),
            ethers.BigNumber.from('22999999999999929'),
            '0',
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256);
        let balance = await poolTokenInstance1.balanceOf(account.address)

        await router.removeLiquiditySync(
            token0.address,
            token1.address,
            balance,
            ethers.BigNumber.from('100000000000000'),
            true,
            account2.address,
            ethers.constants.MaxUint256);

        expect(await token1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from('1628243664024449975'))
    });

    it('should remove sync liquidity ETH 1', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.initETH(
            token0.address,
            expandTo18Decimals(1),
            true,
            account.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})

        await router.addAsyncLiquidityETH(
            token0.address,
            ethers.BigNumber.from('44999999999999929'),
            '0',
            true,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});

        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, WETH.address);
        let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);

        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);
        await ptInstance1.approve(router.address, ethers.constants.MaxUint256)
        await ptInstance0.approve(router.address, ethers.constants.MaxUint256)

        let balance = await ptInstance0.balanceOf(account.address)
        // expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2000000000000000000'))

        expect(await waffle.provider.getBalance(account2.address)).to.eq(ethers.BigNumber.from('10000000000000000000000'))
        await router.removeLiquiditySyncETH(
            token0.address,
            balance,
            ethers.BigNumber.from('910297245995400141'),
            true,
            false,
            account2.address,
            ethers.constants.MaxUint256);

        // Let''s check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1089989988369077165'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('0'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('200000000000000000'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('629321114295325766'))

        expect(await waffle.provider.getBalance(account2.address)).to.eq(ethers.BigNumber.from('10001545499153533405031'))
    });

    it('should remove liquidity2', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await poolTokenInstance1.approve(router.address, ethers.constants.MaxUint256)
        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)
        await router.addAsyncLiquidity(
            token0.address,
            token1.address,
            ethers.BigNumber.from('44999999999999929'),
            ethers.BigNumber.from('22999999999999929'),
            '0',
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256);
        let balance = await poolTokenInstance1.balanceOf(account.address)

        await router.removeLiquidityAsync(
            token0.address,
            token1.address,
            balance.div(2),
            ethers.BigNumber.from('1000000000000000'),
            ethers.BigNumber.from('1000000000000000'),
            true,
            account2.address,
            ethers.constants.MaxUint256);

        expect(await token1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from('511447667083974968'))
        expect(await token0.balanceOf(account2.address)).to.eq(ethers.BigNumber.from('255724557787134213'))
    });
    it('should remove async liquidity ETH 2', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.initETH(
            token0.address,
            expandTo18Decimals(1),
            true,
            account.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})

        await router.addAsyncLiquidityETH(
            token0.address,
            ethers.BigNumber.from('44999999999999929'),
            '0',
            true,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});

        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await ptFactoryInstance.getPoolToken(pylonAddress, WETH.address);
        let poolAddress1 = await ptFactoryInstance.getPoolToken(pylonAddress, token0.address);

        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        await ptInstance1.approve(router.address, ethers.constants.MaxUint256)
        await ptInstance0.approve(router.address, ethers.constants.MaxUint256)

        let balance = await ptInstance0.balanceOf(account.address)
        // expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2000000000000000000'))

        expect(await waffle.provider.getBalance(account2.address)).to.eq(ethers.BigNumber.from('10001620683078240272523'))
        await router.removeLiquidityAsyncETH(
            token0.address,
            balance.div(2),
            ethers.BigNumber.from('900'),
            ethers.BigNumber.from('100'),
            true,
            false,
            account2.address,
            ethers.constants.MaxUint256);

        // Let''s check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1089989988369077165'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('999999999999999500'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('200000000000000000'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('841452145901606270'))

        expect(await waffle.provider.getBalance(account2.address)).to.eq(ethers.BigNumber.from('10002045399381544352677'))
    });
})

describe('fee-on-transfer tokens', () => {
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
        router = fixtures.routerInstance;
        WETH = fixtures.WETHInstance;
    });

})
