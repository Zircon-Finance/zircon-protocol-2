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
    psionicFactoryInstance, psionicFarmInit;

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

        expect(await pair.balanceOf(pylonInstance.address)).to.eq(ethers.BigNumber.from('1343502884254439296'))
    });

    it('should initialize Pylon WETH', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        // await WETH.approve(router.address, ethers.constants.MaxUint256)
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
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        // Let''s check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('999999999999999000'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('50000000000000000'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('1343502884254439296'))
    });

    it('should revert when not initialized', async function () {
        await expect(router.addSyncLiquidity(
            token0.address,
            token1.address,
            expandTo18Decimals(2),
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
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256);
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2044999999999998929'))
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
            ethers.BigNumber.from('44999999999999929'),
            true,
            account.address,
            anchorFarm.address,
            ethers.constants.MaxUint256);
        let user = await anchorFarm.userInfo(account.address);
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
        expect(user[0]).to.eq(ethers.BigNumber.from('44999999999999929'))
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
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});
        //expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1022004889975550110'))
        //Let's get the instances of the new created Pylon and pair....



        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);


        // Let''s check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('999999999999999000'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('3998000999500251700'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('47475088072206285'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('1794854894223302307'))
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
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        let farmAddress = await psionicFactoryInstance.callStatic.deployPool(poolAddress0, token0.address, 100, 0, 1000, "100000000000000000000", "100000000000000000000", account.address)
        await psionicFactoryInstance.deployPool(poolAddress0, token0.address, 100, 0, 1000, "100000000000000000000", "100000000000000000000", account.address)
        let farm = psionicFarmInit.attach(farmAddress);

        await ptInstance0.approve(farm.address, ethers.constants.MaxUint256)
        await router.addSyncLiquidityETH(
            token0.address,
            true,
            account.address,
            farm.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});


        // Let''s check that everything was correctly minted....
        let user = await farm.userInfo(account.address);
        expect(user[0]).to.eq(ethers.BigNumber.from('1998000999500252700'))

        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
    });

    it('should add async-100 liquidity', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.init(
            token0.address,
            token1.address,
            expandTo18Decimals(1),
            expandTo18Decimals(2),
            account.address,
            ethers.constants.MaxUint256)
        await router.addAsyncLiquidity100(
            token0.address,
            token1.address,
            ethers.BigNumber.from('44999999999999929'),
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256);
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2044341737537214747'))
    });

    it('should add & stake async-100 liquidity', async function () {
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
        await router.addAsyncLiquidity100(
            token0.address,
            token1.address,
            ethers.BigNumber.from('44999999999999929'),
            true,
            account.address,
            anchorFarm.address,
            ethers.constants.MaxUint256);
        let user = await anchorFarm.userInfo(account.address);
        expect(user[0]).to.eq(ethers.BigNumber.from('44341737537215747'))

        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
    });

    it('should add async-100 liquidity ETH', async function () {
        await token0.approve(router.address, ethers.constants.MaxUint256)
        await token1.approve(router.address, ethers.constants.MaxUint256)
        await router.initETH(
            token0.address,
            expandTo18Decimals(1),
            true,
            account.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)})
        await router.addAsyncLiquidity100ETH(
            token0.address,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});
        //expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1022004889975550110'))
        //Let's get the instances of the new created Pylon and pair....
        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        // Let's check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('999999999999999000'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('3306267760060225551'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('50000000000000000'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('1805557111139065476'))
    });
    it('should add & stake async-100 liquidity ETH', async function () {
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
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        let farmAddress = await psionicFactoryInstance.callStatic.deployPool(poolAddress0, token0.address, 100, 0, 1000, "100000000000000000000", "100000000000000000000", account.address)
        await psionicFactoryInstance.deployPool(poolAddress0, token0.address, 100, 0, 1000, "100000000000000000000", "100000000000000000000", account.address)
        let farm = psionicFarmInit.attach(farmAddress);

        await ptInstance0.approve(farm.address, ethers.constants.MaxUint256)
        await router.addAsyncLiquidity100ETH(
            token0.address,
            true,
            account.address,
            farm.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});


        // Let''s check that everything was correctly minted....
        let user = await farm.userInfo(account.address);
        expect(user[0]).to.eq(ethers.BigNumber.from('1306267760060226551'))

        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
    });

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
            ethers.BigNumber.from('11499999999999964'),
            ethers.BigNumber.from('20999999999999929'),
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256);
        expect(await poolTokenInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2045999443998197102'))
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
            ethers.BigNumber.from('11499999999999964'),
            ethers.BigNumber.from('20999999999999929'),
            false,
            account.address,
            floatFarm.address,
            ethers.constants.MaxUint256);

        let user = await floatFarm.userInfo(account.address);
        expect(user[0]).to.eq(ethers.BigNumber.from('22976879373721410'))
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
            ethers.BigNumber.from('11499999999999964'),
            ethers.BigNumber.from('20999999999999929'),
            true,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});

        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        // Let''s check that everything was correctly minted....
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2997899550645188741'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1999999999999999000'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('50000000000000000'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('2756265966219476637'))

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
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();
        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        let farmAddress = await psionicFactoryInstance.callStatic.deployPool(poolAddress0, token0.address, 100, 0, 1000, "100000000000000000000", "100000000000000000000", account.address)
        await psionicFactoryInstance.deployPool(poolAddress0, token0.address, 100, 0, 1000, "100000000000000000000", "100000000000000000000", account.address)
        let farm = psionicFarmInit.attach(farmAddress);

        await ptInstance0.approve(farm.address, ethers.constants.MaxUint256)

        await router.addAsyncLiquidityETH(
            token0.address,
            ethers.BigNumber.from('1022999999999998928'),
            ethers.BigNumber.from('11499999999999964'),
            ethers.BigNumber.from('20999999999999929'),
            true,
            true,
            account.address,
            farm.address,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});



        // Let''s check that everything was correctly minted....
        let user = await farm.userInfo(account.address);
        expect(user[0]).to.eq(ethers.BigNumber.from('1997899550645189741'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2100449354809259'))

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
            ethers.BigNumber.from('11499999999999964'),
            ethers.BigNumber.from('20999999999999929'),
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

        expect(await token1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from('1528431123133310951'))
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
            ethers.BigNumber.from('11499999999999964'),
            ethers.BigNumber.from('20999999999999929'),
            true,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});

        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();

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
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1089995743387836587'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('0'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('50000000000000000'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('753288444557039699'))

        expect(await waffle.provider.getBalance(account2.address)).to.eq(ethers.BigNumber.from('10001518602291206272091'))
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
            ethers.BigNumber.from('11499999999999964'),
            ethers.BigNumber.from('20999999999999929'),
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

        expect(await token1.balanceOf(account2.address)).to.eq(ethers.BigNumber.from('498956659718195692'))
        expect(await token0.balanceOf(account2.address)).to.eq(ethers.BigNumber.from('249545948902018192'))
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
            ethers.BigNumber.from('11499999999999964'),
            ethers.BigNumber.from('20999999999999929'),
            true,
            true,
            account.address,
            ethers.constants.AddressZero,
            ethers.constants.MaxUint256, {value: expandTo18Decimals(2)});

        let pairAddress = await factoryInstance.getPair(WETH.address, token0.address);
        let newPair = pairContract.attach(pairAddress);

        let pylonAddress = await factoryPylonInstance.getPylon(WETH.address, token0.address);
        let pylon = pylonContract.attach(pylonAddress);
        let poolAddress0 = await pylon.floatPoolTokenAddress();
        let poolAddress1 = await pylon.anchorPoolTokenAddress();

        let ptInstance0 = poolTokenContract.attach(poolAddress0);
        let ptInstance1 = poolTokenContract.attach(poolAddress1);

        await ptInstance1.approve(router.address, ethers.constants.MaxUint256)
        await ptInstance0.approve(router.address, ethers.constants.MaxUint256)

        let balance = await ptInstance0.balanceOf(account.address)
        // expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('2000000000000000000'))

        expect(await waffle.provider.getBalance(account2.address)).to.eq(ethers.BigNumber.from('10001518602291206272091'))
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
        expect(await ptInstance1.balanceOf(account.address)).to.eq(ethers.BigNumber.from('1089995743387836587'))
        expect(await ptInstance0.balanceOf(account.address)).to.eq(ethers.BigNumber.from('999999999999999500'))
        expect(await token0.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('37591227404313367'))
        expect(await newPair.balanceOf(pylon.address)).to.eq(ethers.BigNumber.from('1080534896907447496'))

        expect(await waffle.provider.getBalance(account2.address)).to.eq(ethers.BigNumber.from('10002005096833078036380'))
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
