const axios = require("axios");
const hre = require("hardhat");
const {MIGRATOR_ADDRESS, FACTORY, LIB_ADDRESS, PYLON_FACTORY, ENERGY_FACTORY, PT_FACTORY} = require("./constants");
const {getChainId, ethers} = require("hardhat");
const {BigNumber} = require("bignumber.js");
const fs = require("fs")
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
let MIGRATION_ADDRESS = "0x1BffbD4A935C8a9d74aF330d6b50864e9A4c7bD2"
async function byeZircon() {
    const chainId = hre.network.config.chainId

    console.log("<><><><><> Loading from prod <><><><><><><>")
    // Getting all the information from the monitoring API
    let monitoring = (await axios.get('https://edgeapi.zircon.finance/static/monitoring/' + chainId ))
    const [owner] = await ethers.getSigners();
    console.log("Owner address: ", owner.address)
    // Change migrator to owner address
    let pylons = [];
    let pairs = monitoring.data.pairs
    let migrator = await hre.ethers.getContractFactory("Migrator");

    let migratorContract = await migrator.attach(MIGRATOR_ADDRESS[chainId]);
    await( await migratorContract.initialize(ENERGY_FACTORY[chainId], PT_FACTORY[chainId], PYLON_FACTORY[chainId], FACTORY[chainId])).wait()
    await( await migratorContract.setPylonMigrator(owner.address)).wait()
    await( await migratorContract.setEnergyMigrator(owner.address)).wait()

    // Factory
    let factory = await hre.ethers.getContractFactory("ZirconFactory");
    let factoryContract = await factory.attach(FACTORY[chainId]);

    // Pylon Factory
    let pylonFactory = await hre.ethers.getContractFactory("ZirconPylonFactory", {
        libraries: {
            ZirconLibrary: LIB_ADDRESS[chainId],
        }
    });
    let pylonFactoryContract = await pylonFactory.attach(PYLON_FACTORY[chainId]);

    // Energy Factory
    let energyFactory = await hre.ethers.getContractFactory("ZirconEnergyFactory");
    let energyFactoryContract = await energyFactory.attach(ENERGY_FACTORY[chainId]);
    console.log("Energy Factory: ", await energyFactoryContract.migrator())
    // Loop over all the pylons
    // console.log("Creating pairs...")

    for (let pair of pairs) {
        // Call Migrate liquidity to custom address on Pylon and energy
        // Ensure that liquidity is migrated to the address
        // Pylon Factory => migrateLiquidity(address _oldPylon, address _newPylon)
        // Energy Factory => migrateLiquidity(address _oldPylon, address _newPylon)
        // Energy Rev Factory => migrateEnergyRevenue(address _oldPylon, address _newPylon)

        for(let pylon of pair.pylons) {
            if (
                pylon.balanceToken0.hex.toString() === "0x00" &&
                pylon.balanceToken1.hex.toString() === "0x00" &&
                pylon.pairBalance.hex.toString() === "0x00"
            ) continue
            // Same here we have to pass all the old information for the pylon and energy

            await pylonFactoryContract.migrateLiquidity(pylon.address, MIGRATION_ADDRESS)
            let energy = pylon.energy
            await energyFactoryContract.migrateEnergy(energy.address, MIGRATION_ADDRESS)
        }
    }
    return pylons
}

async function calculateFunds() {
    const chainId = hre.network.config.chainId
    console.log("<><><><><> Loading from prod <><><><><><><>")
    // Getting all the information from the monitoring API
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring/56');
    const [owner] = await ethers.getSigners();

    // Change migrator to owner address
    let pylons = [];
    let pairs = monitoring.data.pairs
    let migrator = await hre.ethers.getContractFactory("Migrator");

    // let migratorContract = await migrator.attach(MIGRATOR_ADDRESS[chainId]);
    // await migratorContract.setMigrator(owner)

    // Factory
    let factory = await hre.ethers.getContractFactory("ZirconFactory");
    let factoryContract = await factory.attach(FACTORY[chainId]);

    // Pylon Factory
    let pylonFactory = await hre.ethers.getContractFactory("ZirconPylonFactory", {
        libraries: {
            ZirconLibrary: LIB_ADDRESS[chainId],
        }
    });
    let pylonFactoryContract = await pylonFactory.attach(PYLON_FACTORY[chainId]);

    // Energy Factory
    let energyFactory = await hre.ethers.getContractFactory("ZirconEnergyFactory");
    let energyFactoryContract = await energyFactory.attach(ENERGY_FACTORY[chainId]);

    let token = await hre.ethers.getContractFactory("Token");
    let pairFact = await hre.ethers.getContractFactory("ZirconPair");

    // Loop over all the pylons
    console.log("Creating pairs...")
    let index = 0
    for (let pair of pairs) {
        // Call Migrate liquidity to custom address on Pylon and energy
        // Ensure that liquidity is migrated to the address
        // Pylon Factory => migrateLiquidity(address _oldPylon, address _newPylon)
        // Energy Factory => migrateLiquidity(address _oldPylon, address _newPylon)
        // Energy Rev Factory => migrateEnergyRevenue(address _oldPylon, address _newPylon)

        for(let pylon of pair.pylons) {
            console.log("address", pylon.address)
            console.log("TOK1/TOK2", pylon.token0.symbol, "/", pylon.token1.symbol)
            console.log("balanceToken0", (new BigNumber(pylon.balanceToken0.hex)).div("1e" + pylon.token0.decimals).toString())
            console.log("balanceToken1", (new BigNumber(pylon.balanceToken1.hex)).div("1e" + pylon.token1.decimals).toString())

            if (
                pylon.balanceToken0.hex.toString() === "0x00" &&
                pylon.balanceToken1.hex.toString() === "0x00" &&
                pylon.pairBalance.hex.toString() === "0x00"
            ) continue
            console.log("totalUSD", pylon.totalUSD)

            // // Same here we have to pass all the old information for the pylon and energy
            let energy = pylon.energy
            console.log("energy", energy.totalUSD)
        }
    }
    return pylons
}


async function fundsBeforeHack() {

    let blockTag = 26571427 //3845447
    const chainId = hre.network.config.chainId
    // Getting all the information from the monitoring API
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring/' + chainId);
    const [owner] = await ethers.getSigners();

    const csvWriter = createCsvWriter({
        path: './liabilities.csv',
        header: [
            {id: 'pylon', title: 'Pylon'},
            {id: 'totalUSDTaken', title: 'Total USD Taken'},
            {id: 'totalLiability', title: 'Total Liability'},
            {id: 'vab', title: 'VAB'},
            {id: 'vfb', title: 'VFB'},
            {id: 'ptfPriceUSD', title: 'PTF Price USD'},
            {id: 'ptsPriceUSD', title: 'PTS Price USD'},
            {id: 'ptfPrice', title: 'PTF Price'},
            {id: 'ptsPrice', title: 'PTS Price'},
            {id: 'gamma', title: 'Gamma'},
            {id: 'pairBalance0', title: 'Pair Balance 0'},
            {id: 'pairBalance1', title: 'Pair Balance 1'},
            {id: 'ptfts', title: 'PTF total Supply'},
            {id: 'ptsts', title: 'PTS total Supply'},
        ]
    });

    // Change migrator to owner address
    let pylons = [];
    let pairs = monitoring.data.pairs
    let migrator = await hre.ethers.getContractFactory("Migrator");

    // let migratorContract = await migrator.attach(MIGRATOR_ADDRESS[chainId]);
    // await migratorContract.setMigrator(owner)

    // Factory
    let factory = await hre.ethers.getContractFactory("ZirconFactory");
    let factoryContract = await factory.attach(FACTORY[chainId]);

    // Pylon Factory
    let pylonFactory = await hre.ethers.getContractFactory("ZirconPylonFactory", {
        libraries: {
            ZirconLibrary: LIB_ADDRESS[chainId],
        }
    });
    let pylonFactoryContract = await pylonFactory.attach(PYLON_FACTORY[chainId]);

    // Energy Factory
    let energyFactory = await hre.ethers.getContractFactory("ZirconEnergyFactory");
    let energyFactoryContract = await energyFactory.attach(ENERGY_FACTORY[chainId]);

    let token = await hre.ethers.getContractFactory("Token");
    let pairFact = await hre.ethers.getContractFactory("ZirconPair");
    let pylonF = await hre.ethers.getContractFactory("ZirconPylon", {
        libraries: {
            ZirconLibrary: LIB_ADDRESS[chainId],
        }
    })

    // Loop over all the pylons
    let index = 0
    let total = 0
    let totalLiab = 0
    let csv = []
    for (let pair of pairs) {
        // Call Migrate liquidity to custom address on Pylon and energy
        // Ensure that liquidity is migrated to the address
        // Pylon Factory => migrateLiquidity(address _oldPylon, address _newPylon)
        // Energy Factory => migrateLiquidity(address _oldPylon, address _newPylon)
        // Energy Rev Factory => migrateEnergyRevenue(address _oldPylon, address _newPylon)
        let pairContract = await pairFact.attach(pair.address)
        let token0 = await token.attach(pair.token0.address)
        let token1 = await token.attach(pair.token1.address)
        let balance0BH = await token0.functions.balanceOf(pair.address, {blockTag })
        let balance1BH = await token1.functions.balanceOf(pair.address, {blockTag })
        let bal0 = (new BigNumber(balance0BH)).div("1e" + pair.token0.decimals)
        let bal1 = (new BigNumber(balance1BH)).div("1e" + pair.token1.decimals)
        let balDiv = (new BigNumber(balance1BH)).div("1e" + pair.token1.decimals)

        console.log("TOK1/TOK2", pair.token0.symbol, "/", pair.token1.symbol)
        console.log("pair address", pair.address)

        console.log("pair balance0BH", (new BigNumber(balance0BH)).div("1e" + pair.token0.decimals).toString())
        console.log("pair balance1BH", (new BigNumber(balance1BH)).div("1e" + pair.token1.decimals).toString())
        let multiplier = 2
        if (pair.token0.address.toLowerCase() === "0x808A3F2639a5CD54D64eD768192369BCd729100e".toLowerCase() ||
            pair.token1.address.toLowerCase() === "0x808A3F2639a5CD54D64eD768192369BCd729100e".toLowerCase()) {
            multiplier = 1
        }
        let totalUSD = balDiv.multipliedBy(pair.tk1Price.price.toString()).multipliedBy(multiplier).toNumber()
        total += totalUSD
        console.log("pair totalUSD", balDiv.multipliedBy(pair.tk1Price.price.toString()).multipliedBy(multiplier).toString())

        for(let pylon of pair.pylons) {
            let total;
            let info = {}
            let pylonToken0 = await token.attach(pylon.token0.address)
            let ptf = await token.attach(pylon.ptFloat.address)
            let pts = await token.attach(pylon.ptAnchor.address)

            let isFloarRes0 = token0.address === pylonToken0.address

            let pylonToken1 = await token.attach(pylon.token1.address)
            let floatPairBalance = await pylonToken0.functions.balanceOf(pair.address, {blockTag})

            let pContract = await pylonF.attach(pylon.address)
            let vab = await pContract.functions.virtualAnchorBalance({blockTag})
            let gamma = await pContract.functions.gammaMulDecimals({blockTag})
            let ptb = await pairContract.functions.balanceOf(pylon.address, {blockTag})
            let ptt = await pairContract.functions.totalSupply({blockTag})
            let pTranslated = (new BigNumber(ptb)).dividedBy(ptt).multipliedBy((new BigNumber(floatPairBalance)))
            let vfb = (pTranslated.multipliedBy(gamma).dividedBy(1e18).plus(new BigNumber(pylon.balanceToken0.hex))).dividedBy("1e" + pylon.token0.decimals)
            let stablePrice = isFloarRes0 ? pair.tk1Price.price : pair.tk0Price.price
            let floatPrice = !isFloarRes0 ? pair.tk1Price.price : pair.tk0Price.price
            let pylonTotal = ((new BigNumber(vab.toString())).dividedBy("1e" + pylon.token1.decimals)).multipliedBy(stablePrice).toNumber()
            pylonTotal += vfb.multipliedBy(floatPrice).toNumber()

            let ptfts = await ptf.functions.totalSupply({blockTag})
            let ptsts = await pts.functions.totalSupply({blockTag})

            let ptfPrice = vfb.multipliedBy(1e18).dividedBy(ptfts).multipliedBy(floatPrice)
            let ptsPrice = new BigNumber(vab.toString()).dividedBy("1e" + pylon.token1.decimals)
                .multipliedBy(1e18).dividedBy(ptsts).multipliedBy(stablePrice)


            // let balance1BH = await pylonToken1.functions.balanceOf(pylon.address, {blockTag})

            console.log("TOK1/TOK2", pylon.token0.symbol, "/", pylon.token1.symbol)
            console.log("liab", pylonTotal.toString())
            console.log("ptf USD", ptfPrice.toString())
            console.log("pts USD", ptsPrice.toString())
            console.log("vfb", vfb.toString())
            console.log("vab", (new BigNumber(vab.toString())).dividedBy("1e" + pylon.token1.decimals).toString())
            // console.log("balanceToken0", (new BigNumber(pylon.balanceToken0.hex)).dividedBy("1e" + pylon.token0.decimals).toString())
            // console.log("balanceToken1", (new BigNumber(pylon.balanceToken1.hex)).dividedBy("1e" + pylon.token1.decimals).toString())
            // console.log("pylon balance0BH", (new BigNumber(balance0BH)).dividedBy("1e" + pylon.token0.decimals).toString())
            // console.log("pylon balance1BH", (new BigNumber(balance1BH)).dividedBy("1e" + pylon.token1.decimals).toString())
            // console.log("address", pylon.address)
            totalLiab += pylonTotal
            info = {
                pylon: pylon.token0.symbol + "/" + pylon.token1.symbol,
                totalUSDTaken: totalUSD.toString(),
                totalLiability: pylonTotal.toString(),
                vab: new BigNumber(vab.toString()).dividedBy("1e" + pylon.token1.decimals).toString(),
                vfb: vfb.toString(),
                ptfPriceUSD: ptfPrice.toString(),
                ptsPriceUSD: ptsPrice.toString(),
                ptfPrice: ptfPrice.dividedBy(floatPrice).toString(),
                ptsPrice: ptsPrice.dividedBy(stablePrice).toString(),
                gamma: gamma.toString(),
                pairBalance0: new BigNumber(bal0).toString(),
                pairBalance1: new BigNumber(bal1).toString(),
                ptfts: ptfts.toString(),
                ptsts: ptsts.toString(),
            }
            csv.push(info)
            if (
                pylon.balanceToken0.hex.toString() === "0x00" &&
                pylon.balanceToken1.hex.toString() === "0x00" &&
                pylon.pairBalance.hex.toString() === "0x00"
            ) continue
            console.log("totalUSD", pylon.totalUSD)

            // // Same here we have to pass all the old information for the pylon and energy
            let energy = pylon.energy
            console.log("energy", energy.totalUSD)
        }
    }
    console.log(csv, "csv")
    await csvWriter.writeRecords(csv)       // returns a promise

    console.log("total", total)
    console.log("totalLiab", totalLiab)
    return pylons
}
byeZircon()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
