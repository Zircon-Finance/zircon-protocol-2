const hre = require('hardhat');
const axios = require('axios');
const tokens = require('./json/tokens.json');
async function createTokensList() {
    const chainId = hre.network.config.chainId
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring');
    let tokens = monitoring.data.tokens
    for (let token of tokens) {
        console.log(token)
        console.log("Creating token...")

        const tokenContract = await hre.ethers.getContractFactory("Token");
        const newToken = await tokenContract.deploy(token.symbol + " Token", token.symbol, token.decimals);

        token["chainId"] = 1287
        token["name"] = token.symbol + " Token"
        token["logoURI"] = "https://elk.finance/tokens/logos/moonriver/" + token.address + "/logo.png"
        token["oldAddress"] = token.address
        token["address"] = newToken.address

    }
    tokens["name"] = "Zircon Token List"
    tokens["timestamp"] = "2022-09-09T04:37:59.457102807Z"
    tokens["version"] = {
        "major": 1,
        "minor": 0,
        "patch": 0
    }
    tokens["logoURI"] = "https://d3v8yom54t2cda.cloudfront.net/zrg_list%402x.png"

    console.log("tokens", tokens)
    let json = JSON.stringify(tokens);


    let fs = require('fs');
    fs.writeFile("./scripts/json/tokens.json", json, () => {})

}
var loading = (function(log) {
    var h = ['|', '/', '-', '\\'];
    var i = 0;

    return setInterval(() => {
        i = (i > 3) ? 0 : i;
        console.clear();
        console.log(log + " " + h[i]);
        i++;
    }, 300);
});

// For this to work the migration address must be the same as the one used in the deployment
async function createTest() {
    const [owner] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", owner.address);

    const chainId = hre.network.config.chainId
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring');

    // Getting all the information from the monitoring API
    let pairs = monitoring.data.pairs
    //
    let migrator = await hre.ethers.getContractFactory("Migrator");
    let migratorContract = await migrator.attach("0xb2EDCF9c62002af98928F6a851488CB7F52aE43a");
    // await migratorContract.initialize("0x0b4487ED94311b0703F98c04EDb171b0666F35eE", "0x0ECE30571ce2d2B35741D6BF4e1F400f9278EdfF", "0x1cC4134c8F79E0Aa57Ff8FA838F9dB4c6B61AA68", '0xDC485cDBA2B9b891760588c5BC66f10b1d4736e8')
    //
    // return
   await migratorContract.setMigrator(owner.address)

    // return
    console.log("Migrator is setted to ", owner.address)

    let factory = await hre.ethers.getContractFactory("ZirconFactory");
    let factoryContract = await factory.attach("0xDC485cDBA2B9b891760588c5BC66f10b1d4736e8");

    let pylonFactory = await hre.ethers.getContractFactory("ZirconPylonFactory");
    let pylonFactoryContract = await pylonFactory.attach("0x1cC4134c8F79E0Aa57Ff8FA838F9dB4c6B61AA68");

    let energyFactory = await hre.ethers.getContractFactory("ZirconEnergyFactory");
    let energyFactoryContract = await energyFactory.attach("0x0b4487ED94311b0703F98c04EDb171b0666F35eE");

    let token = await hre.ethers.getContractFactory("Token");
    let pairFact = await hre.ethers.getContractFactory("ZirconPair");

    console.log("Creating pairs...")
    let index = 0
    for (let pair of pairs) {
        // if (index === 0 || index === 1 || index === 2 || index === 3 || index === 4 || index === 5)  {
        //     index++
        //     continue
        // }
        index++
        // console.log(tokens.tokens)
        // console.log(pair.token0.address)
        let token0 = tokens.tokens.filter((token) => {return token.oldAddress === pair.token0.address.toString() })[0]
        let token1 = tokens.tokens.filter((token) => {return token.oldAddress === pair.token1.address.toString() })[0]
        // Creating Pair Contract
        let tk0Contract = await token.attach(token0.address);
        let tk1Contract = await token.attach(token1.address);
        // We must pass all the information to the pair contract
        // so probably we are gonna need some changes in the Zircon Pair or smth
        console.log("Creating pair for ", token0.symbol, token1.symbol)

        // if (index === 4) {
        //     let energyRevAddress = await energyFactoryContract.getEnergyRevenue(token0.address, token1.address)
        //     // Passing here all the old information for the vab anchoK ecc
        //     // Transferring some balance to the energy
        //     console.log("energyRevAddress", energyRevAddress)
        //     await tk0Contract.mint(energyRevAddress, pair.energyRev.balanceToken0)
        //     console.log("1")
        //     await tk1Contract.mint(energyRevAddress, pair.energyRev.balanceToken1)
        //     console.log("2")
        //     await pairContract.mintTest(energyRevAddress, pair.energyRev.pairBalance)
        //     console.log("3")
        //     return
        // }

        await factoryContract.createPair(token0.address, token1.address, pylonFactoryContract.address)

        let pairAddress = await factoryContract.getPair(token0.address, token1.address)
        let l = loading("Creating Pair")
        while (true) {
            // console.log(waiting)
            pairAddress = await factoryContract.getPair(token0.address, token1.address)
            if (pairAddress !== "0x0000000000000000000000000000000000000000") {
                clearInterval(l)
                break
            }

            // waiting += "."
        }


        // Transferring some balance to the pair
        let balance0 = pair.balanceToken0
        let balance1 = pair.balanceToken1

        await tk0Contract.mint(pairAddress, balance0)
        await tk1Contract.mint(pairAddress, balance1)

        console.log("Pair created for ", token0.symbol, token1.symbol)
        let pairContract = await pairFact.attach(pairAddress);

        console.log("Creating Pylons...")

        for(let pylon of pair.pylons) {
            let tk0 = tokens.tokens.filter((token) => {return token.oldAddress === pylon.token0.address.toString() })[0]
            let tk1 = tokens.tokens.filter((token) => {return token.oldAddress === pylon.token1.address.toString() })[0]

            // Same here we have to pass all the old information for the pylon and energy
            await pylonFactoryContract.addPylon(pairAddress, tk0.address, tk1.address)
            let pylonAddress;
            l = loading("Creating Pylon ")
            while (true) {
                // console.log(waiting)
                pylonAddress = await pylonFactoryContract.getPylon(tk0.address, tk1.address)
                if (pylonAddress !== "0x0000000000000000000000000000000000000000") {
                    clearInterval(l)
                    break
                }
                // waiting += "."
            }

            // Passing here all the old information for the vab anchoK ecc
            await pylonFactoryContract.startPylon(pylonAddress, pylon.gamma, pylon.vab, pylon.anchorKFactor, pylon.formulaSwitch)

            // Transferring some balance to the pylon
            let balance0 = pylon.balanceToken0
            let balance1 = pylon.balanceToken1
            let pairBalance = pylon.pairBalance

            await tk0Contract.mint(pylonAddress, balance0)
            await tk1Contract.mint(pylonAddress, balance1)
            await pairContract.mintTest(pylonAddress, pairBalance)
            console.log("Pylon created for ", token0.symbol, token1.symbol)
        }

        for(let energy of pair.energies) {
            let tk0 = tokens.tokens.filter((token) => {return token.oldAddress === energy.token0.address.toString() })[0]
            let tk1 = tokens.tokens.filter((token) => {return token.oldAddress === energy.token1.address.toString() })[0]

            // Same here we have to pass all the old information for the pylon and energy
            let energyAddress = await energyFactoryContract.getEnergy(tk0.address, tk1.address)
            // Passing here all the old information for the vab anchoK ecc
            // Transferring some balance to the energy
            // let balance0 = energy.balanceToken0
            let balance1 = energy.balanceToken1
            let pairBalance = energy.pairBalance

            // await tk0Contract.mint(energyAddress, balance0)
            await tk1Contract.mint(energyAddress, balance1)
            await pairContract.mintTest(energyAddress, pairBalance)
            console.log("Energy created for ", tk0.symbol, tk1.symbol)
        }

        let energyRevAddress = await energyFactoryContract.getEnergyRevenue(token0.address, token1.address)
        // Passing here all the old information for the vab anchoK ecc
        // Transferring some balance to the energy

        await tk0Contract.mint(energyRevAddress, pair.energyRev.balanceToken0)
        await tk1Contract.mint(energyRevAddress, pair.energyRev.balanceToken1)
        await pairContract.mintTest(energyRevAddress, pair.energyRev.pairBalance)
        console.log("Energy Revenue created for ", token0.symbol, token1.symbol)
    }
}

createTest()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
