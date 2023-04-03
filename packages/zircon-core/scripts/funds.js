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

async function calculatePersonFunds() {
    const chainId = hre.network.config.chainId
    console.log("<><><><><> Loading from prod <><><><><><><>")
    // Getting all the information from the monitoring API
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring/56');


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

function onlyUnique(value, index, array) {
    return array.indexOf(value) === index;
}
async function someoneFunds(args) {

    let addresses = [
        "0xac2048c35Ed08ADBb9c231686Dfdf84F08Af06CE",
        "0x66633Cc6B84CD127A0bb84864c1a4eA0172469A6",
        "0x48e471103DD4945D146a0E28F4C62f56466B2B6f",
        "0x116EB0e327f276c9f73B189f78727A3D0D6A3BAA",
        "0x64A7Cc1A3235fCFfe0Cc00F576fA61BeA5DDC43c",
        "0x64A7Cc1A3235fCFfe0Cc00F576fA61BeA5DDC43c",
        "0x1C46086c2E15b52742dCBFd9Eb54CA81c5a368e0",
        "0x9679292157ab611121F85e43089aD8a1e98403d4",
        "0x2Db5e12516bbBdb485351710bFF5bEb613136d26",
        "0x2Db5e12516bbBdb485351710bFF5bEb613136d26",
        "0x0d7365C77ceBae929f1A06dDD721aE9081e751D0",
        "0x98f92b5E762bD951B589EB932a0020C44bA99BCB",
        "0x82dfD365d7a8C7FF3652878AC25528a6D3B9c346",
        "0xdD97B4220eFBE2263d7f7435d044b40537D80618",
        "0x319b916A699865618121B99E66E34b1Cc597EC32",
        "0x1Ff2914a2f9FAEDb1361Bd405354D6887F9292f3",
        "0x1Ff2914a2f9FAEDb1361Bd405354D6887F9292f3",
        "0x80e0310b95Cb13e886C712e6A7E5059bc9619F38",
        "0xA789D788923787172Cc6B2C53704Fb6017C9E157",
        "0xD84A185d5FF025b917Ced55a5a1fe88230572BE6",
        "0x7d747ae6dc13f4cf60ee00fa0839f7d456db984b",
        "0x83a110727D39159A65c835D0C6c162ebC01acaeA",
        "0x83a110727D39159A65c835D0C6c162ebC01acaeA",
        "0xe749f5e3d8FB128291910265BB852a6084FB7436",
        "0xe749f5e3d8FB128291910265BB852a6084FB7436",
        "0x9CD349FB2cbd22ccfF2DA7962b6e853e0eF566E0",
        "0x9CD349FB2cbd22ccfF2DA7962b6e853e0eF566E0",
        "0x9Aa8cC57ef8793975f60e23611af8804070a4f22",
        "0x9Aa8cC57ef8793975f60e23611af8804070a4f22",
        "0x9Aa8cC57ef8793975f60e23611af8804070a4f22",
        "0x9Aa8cC57ef8793975f60e23611af8804070a4f22",
        "0x02ac7b7229c309bcbd4bae60cdf347251c9cad6b",
        "0x6d9807d18374f33213de86917937544a7095e39e",
        "0x22963f931baa98d5ce2a43ab7681a638a693f560",
        "0x3eaA0ecb2A2838EEe02FB280C98E740cc13F4C3A",
        "0x9578380ECb0bb6E546C89fb595090645f8AbFfa2",
        "0x9578380ECb0bb6E546C89fb595090645f8AbFfa2",
        "0x9578380ECb0bb6E546C89fb595090645f8AbFfa2",
        '0x9578380ECb0bb6E546C89fb595090645f8AbFfa2',
        "0x0e94DD9b9583F4726103b263915E12fe29D2EF81",
        "0x4e7b1f5d52889144eb73ed4aFF7B2DBaA511C6F3",
        "0xC861Cf149019229A33F3357F2ee7049812f10f88",
        "0xF01d9114b780154b08B1515d7Fa2808FDb691495",
        "0xf4f48A62AdC322a30159cff987F35D3A6b352F3e",
        "0x4FfD0A59a26cB2Aa76D403215e4cC2845C053994",
        "0xc30Bd79d8a637D301d676480902BDdbfe08582f3",
        "0xC9F7113042615cE4796f8CBbfA6f42170D908e05",
        "0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73",
        "0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73",
        '0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73',
        "0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73",
        "0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73",
        "0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73",
        "0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73",
        "0xcb0eF5aFD5a3f8703cDcfBe55Bf1407b84f0bC73",
        "0xc6dAa92ae494acbe2bfaAb57F60Db8535BF2400F",
        "0x1e3E45456D7F86aC31a28823179A41526939Fb75",
        "0x1e3E45456D7F86aC31a28823179A41526939Fb75",
        "0x2AD2264a0755936137Ac256fd9D742fEEe7AB5ff",
        "0x2AD2264a0755936137Ac256fd9D742fEEe7AB5ff",
        "0x2AD2264a0755936137Ac256fd9D742fEEe7AB5ff",
        "0x19892211994Bcf4BD669B6Ea1E458245EfCE78B0",
        "0xE34A5982307E120785b0766e63d075AeE9272D45",
        "0x4e7b1f5d52889144eb73ed4aFF7B2DBaA511C6F3",
        "0xc94dc73a2677E012FB6260c680CE5344E3AEAaB8",
        "0xA664Fc8075185500c4a321f399b49dF47454ffa4",
        "0x1cae141EC4f5beCD042D8Df35e397b00C26e0E8A",
        "0x08be042ECEBf51988bcFb206B7EE75eBDBDd8Ee0",
        "0xD9b74ABC520A41029E5b2304Ce229871673662bB",
        "0xB0E5453eD14b2E17e41D35e114F5C530bD604361",
        "0xC6a20F97BFE06287bc104BD0d0D3343a6dA4A4fF",
        "0x7Bba80E55FeD1812974Ea0dB50E58D3f82348c1b",
        "0x2B043fb6e0a646CA33e070C96782f5434026465e",
        "0x37d768C8FC5A0F54754A6bDB8b8469e6fF8CaD07",
        "0xB79e0DCF43D1AB974eEEC8FCE9A9ED50EbeC2705",
        "0xB79e0DCF43D1AB974eEEC8FCE9A9ED50EbeC2705",
        "0x6a6344ACc9779052247977C12e444EaF7120D364",
        "0x4ae2fd7128533fe9b8a358e986f8d7e53fe13c14",
        "0x99873B7A96f3cF28966ed90E14B8F2e3bFD73296",
        "0x5163D2109Ac93B447828789b8dF537bc9Fa3BF19",
        "0xe65130C719584A68D48e2968E79e19d5dAf1e983",
        "0x9Aa8cC57ef8793975f60e23611af8804070a4f22",
        "0x8e14f987963431F4D48df40DC13A0F84E50dA983",
        "0xfB17d5CD85854B6Bee89e714591DE521F3169dE5",
        ].filter(onlyUnique);
    // let addresses = [
    //     "0xac2048c35Ed08ADBb9c231686Dfdf84F08Af06CE",
    //     ].filter(onlyUnique);

    let blockTag = 3845447
    const chainId = hre.network.config.chainId
    // Getting all the information from the monitoring API
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring/' + chainId);
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
    let pylonF = await hre.ethers.getContractFactory("ZirconPylon", {
        libraries: {
            ZirconLibrary: LIB_ADDRESS[chainId],
        }
    })

    // Loop over all the pylons
    let total = 0
    let totalLiab = 0
    let csv = []
    let headers = [{id: "address", title: "Address"}]
    let index = 0;
    for (let address of addresses) {
        index++;
        let pCSV = {"address": address}
        let pairIndex = 0

        for (let pair of pairs) {
            pairIndex++
            if(pairIndex >=14) break;
            // Call Migrate liquidity to custom address on Pylon and energy
            // Ensure that liquidity is migrated to the address
            // Pylon Factory => migrateLiquidity(address _oldPylon, address _newPylon)
            // Energy Factory => migrateLiquidity(address _oldPylon, address _newPylon)
            // Energy Rev Factory => migrateEnergyRevenue(address _oldPylon, address _newPylon)
            let pairContract = await pairFact.attach(pair.address)
            let token0 = await token.attach(pair.token0.address)
            let token1 = await token.attach(pair.token1.address)
            let balance0BH = await token0.functions.balanceOf(pair.address, {blockTag})
            let balance1BH = await token1.functions.balanceOf(pair.address, {blockTag})
            let bal0 = (new BigNumber(balance0BH)).div("1e" + pair.token0.decimals)
            let bal1 = (new BigNumber(balance1BH)).div("1e" + pair.token1.decimals)
            let balDiv = (new BigNumber(balance1BH)).div("1e" + pair.token1.decimals)

            console.log("TOK1/TOK2", pair.token0.symbol, "/", pair.token1.symbol)

            let multiplier = 2
            if (pair.token0.address.toLowerCase() === "0x808A3F2639a5CD54D64eD768192369BCd729100e".toLowerCase() ||
                pair.token1.address.toLowerCase() === "0x808A3F2639a5CD54D64eD768192369BCd729100e".toLowerCase()) {
                multiplier = 1
            }
            let totalUSD = balDiv.multipliedBy(pair.tk1Price.price.toString()).multipliedBy(multiplier).toNumber()
            total += totalUSD
            for (let pylon of pair.pylons) {
                let key = pylon.token0.symbol + pylon.token1.symbol
                let total;
                let info = {}
                let pylonToken0 = await token.attach(pylon.token0.address)
                let ptf = await token.attach(pylon.ptFloat.address)
                let pts = await token.attach(pylon.ptAnchor.address)

                let balPTF = await ptf.balanceOf(address)
                let balPTS = await pts.balanceOf(address)
                if (index === 1) {
                    headers.push(
                        {id: "balPTF" + key, title: "PT Float " + key},
                        {id: "balPTS" + key, title: "PT Stable " + key},
                        {id: "totalLib" + key, title: "Total Liability " + key},
                    )
                }

                // if (balPTF.toString() === "0" && balPTS.toString() === "0") continue

                console.log("balPTF", balPTF.toString())
                console.log("balPTS", balPTS.toString())


                let isFloarRes0 = token0.address === pylonToken0.address

                let pylonToken1 = await token.attach(pylon.token1.address)
                let floatPairBalance = await pylonToken0.functions.balanceOf(pair.address, {blockTag})

                let pContract = await pylonF.attach(pylon.address)
                let vab = await pContract.functions.virtualAnchorBalance({blockTag})
                let gamma = await pContract.functions.gammaMulDecimals({blockTag})
                let ptb = await pairContract.functions.balanceOf(pylon.address, {blockTag})
                let ptt = await pairContract.functions.totalSupply({blockTag})
                let pTranslated = (new BigNumber(ptb)).dividedBy(ptt).multipliedBy((new BigNumber(floatPairBalance)))
                let vfb = (pTranslated.multipliedBy(gamma).dividedBy(1e18).plus(new BigNumber(pylon.balanceToken0.hex)))
                    .dividedBy("1e" + pylon.token0.decimals)
                let stablePrice = isFloarRes0 ? pair.tk1Price.price : pair.tk0Price.price
                let floatPrice = !isFloarRes0 ? pair.tk1Price.price : pair.tk0Price.price
                let pylonTotal = ((new BigNumber(vab.toString())).dividedBy("1e" + pylon.token1.decimals)).multipliedBy(stablePrice).toNumber()
                pylonTotal += vfb.multipliedBy(floatPrice).toNumber()

                let ptfts = await ptf.functions.totalSupply({blockTag})
                let ptsts = await pts.functions.totalSupply({blockTag})

                let ptfPrice = vfb.multipliedBy("1e" + pylon.token0.decimals).dividedBy(ptfts).multipliedBy(floatPrice)
                let ptsPrice = new BigNumber(vab.toString()).dividedBy("1e" + pylon.token1.decimals)
                    .multipliedBy("1e" + pylon.token1.decimals).dividedBy(ptsts).multipliedBy(stablePrice)
                let t = totalLiab
                totalLiab += (ptfPrice.multipliedBy(balPTF.toString()).dividedBy("1e" + pylon.token0.decimals).toNumber() +
                    ptsPrice.multipliedBy(balPTS.toString()).dividedBy("1e" + pylon.token1.decimals).toNumber())
                console.log("hey", pylon.token1.decimals)
                console.log("hey", ptsPrice.toString())
                pCSV = {...pCSV,
                    ["totalLib" + key]: (totalLiab - t).toString(),
                    ["balPTF" + key]: balPTF.toString(),
                    ["balPTS" + key]: balPTS.toString()
                }
                console.log("totalLiab", totalLiab - t)
            }
        }
        csv.push(pCSV)

    }
    console.log("headers", headers)
    console.log("csv", csv)
    const csvWriter = createCsvWriter({
        path:  './' + chainId.toString() + 'liabilities.csv',
        header: headers
    });
    console.log("hola")
    await csvWriter.writeRecords(csv)       // returns a promise


    console.log("totalLiab", totalLiab)
    return pylons
}
someoneFunds()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
