const hre = require('hardhat');
const axios = require('axios');

exports.createTokens = async function createTokens(monitoring) {
    let tokens = monitoring.data.tokens
    for (let token of tokens) {
        const tokenContract = await hre.ethers.getContractFactory("Token");
        const newToken = await tokenContract.deploy(token.symbol + " Token", token.symbol, token.decimals);
        token["oldAddress"] = token.address
        token["address"] = newToken.address
    }
    console.log("Tokens created...")
    return tokens
}

exports.loadFromProd = async function loadFromProd(migratorAddress, factoryAddress, pFactoryAddress, eFactoryAddress, ptFactoryAddress, owner, tokens) {
    console.log("Loading from prod")
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring');

    // Getting all the information from the monitoring API
    let pairs = monitoring.data.pairs

    let migrator = await hre.ethers.getContractFactory("Migrator");
    console.log("Migrator address", migratorAddress, "owner", owner)

    let migratorContract = await migrator.attach(migratorAddress);
    await migratorContract.setMigrator(owner)

    console.log("Migrator is setted to ", owner)

    let factory = await hre.ethers.getContractFactory("ZirconFactory");
    let factoryContract = await factory.attach(factoryAddress);

    let pylonFactory = await hre.ethers.getContractFactory("ZirconPylonFactory");
    let pylonFactoryContract = await pylonFactory.attach(pFactoryAddress);

    let energyFactory = await hre.ethers.getContractFactory("ZirconEnergyFactory");
    let energyFactoryContract = await energyFactory.attach(eFactoryAddress);

    let ptFactory = await hre.ethers.getContractFactory("ZirconPTFactory");
    let ptFactoryContract = await ptFactory.attach(ptFactoryAddress);

    let token = await hre.ethers.getContractFactory("Token");
    let pairFact = await hre.ethers.getContractFactory("ZirconPair");

    console.log("Creating pairs...")
    for (let pair of pairs) {

        let token0 = tokens.filter((token) => {return token.oldAddress === pair.token0.address.toString() })[0]
        let token1 = tokens.filter((token) => {return token.oldAddress === pair.token1.address.toString() })[0]
        // Creating Pair Contract
        let tk0Contract = await token.attach(token0.address);
        let tk1Contract = await token.attach(token1.address);
        // We must pass all the information to the pair contract
        // so probably we are gonna need some changes in the Zircon Pair or smth
        await factoryContract.createPair(token0.address, token1.address, pylonFactoryContract.address)
        console.log("Creating pair for ", token0.symbol, token1.symbol)

        while (true) {
            pairAddress = await factoryContract.getPair(token0.address, token1.address)
            if (pairAddress !== "0x0000000000000000000000000000000000000000") {
                break
            }
        }
        // Transferring some balance to the pair
        let balance0 = pair.balanceToken0
        let balance1 = pair.balanceToken1

        await tk0Contract.mint(pairAddress, balance0)
        await tk1Contract.mint(pairAddress, balance1)

        console.log("Pair created for ", token0.symbol, token1.symbol)
        let pairContract = await pairFact.attach(pairAddress);

        let ts = new hre.ethers.BigNumber.from(pair.totalSupply)
        let ptTS = new hre.ethers.BigNumber.from(pair.ptbOnPylonSystem)

        await pairContract.mintTest(hre.ethers.constants.AddressZero, ts.sub(ptTS))

        await pairContract.reservesTest()

        let energyRevAddress = await energyFactoryContract.getEnergyRevenue(token0.address, token1.address)
        // Passing here all the old information for the vab anchoK ecc
        // Transferring some balance to the energy

        await tk0Contract.mint(energyRevAddress, pair.energyRev.balanceToken0)
        await tk1Contract.mint(energyRevAddress, pair.energyRev.balanceToken1)
        await pairContract.mintTest(energyRevAddress, pair.energyRev.pairBalance)
        console.log("Energy Revenue created for ", token0.symbol, token1.symbol)


        console.log("Creating Pylons...")

        for(let pylon of pair.pylons) {

            let tk0 = tokens.filter((token) => {return token.oldAddress === pylon.token0.address.toString()})[0]
            let tk1 = tokens.filter((token) => {return token.oldAddress === pylon.token1.address.toString()})[0]

            // Same here we have to pass all the old information for the pylon and energy
            await pylonFactoryContract.addPylon(pairAddress, tk0.address, tk1.address)


            let pylonAddress;
            console.log("Creating Pylon for ", tk0.address, tk1.address)
            while (true) {
                pylonAddress = await pylonFactoryContract.getPylon(tk0.address, tk1.address)
                if (pylonAddress !== "0x0000000000000000000000000000000000000000") {
                    break
                }
            }

            // Minting the Pool Tokens Total Supply
            let ptfTS = pylon.ptFloat.totalSupply
            let ptsTS = pylon.ptAnchor.totalSupply

            let ptfAddress = await ptFactoryContract.getPoolToken(pylonAddress, tk0.address)
            let ptsAddress = await ptFactoryContract.getPoolToken(pylonAddress, tk1.address)

            let ptfContract = await pairFact.attach(ptfAddress)
            let ptsContract = await pairFact.attach(ptsAddress)

            await ptfContract.mintTest(pylonAddress, ptfTS)
            await ptsContract.mintTest(pylonAddress, ptsTS)

            // Same here we have to pass all the old information for the pylon and energy
            let energyAddress = await energyFactoryContract.getEnergy(tk0.address, tk1.address)
            // Passing here all the old information for the vab anchoK ecc
            // Transferring some balance to the energy
            // let balance0 = energy.balanceToken0

            // await tk0Contract.mint(energyAddress, balance0)
            await tk1Contract.mint(energyAddress, pylon.energy.balanceToken1)
            await pairContract.mintTest(energyAddress, pylon.energy.pairBalance)
            console.log("Energy created for ", tk0.symbol, tk1.symbol)


            // Transferring some balance to the pylon
            await tk0Contract.mint(pylonAddress, pylon.balanceToken0)
            await tk1Contract.mint(pylonAddress, pylon.balanceToken1)
            await pairContract.mintTest(pylonAddress, pylon.pairBalance)
            console.log("Tokens minted for: ", tk0.symbol, tk1.symbol, " pylon")

            // Passing here all the old information for the vab anchoK ecc
            await pylonFactoryContract.startPylon(pylonAddress, pylon.gamma, pylon.vab, pylon.anchorKFactor, pylon.formulaSwitch)

            console.log("Pylon created for ", token0.symbol, token1.symbol)
        }
    }
}