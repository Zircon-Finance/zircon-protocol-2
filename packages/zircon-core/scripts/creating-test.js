const hre = require('hardhat');
const axios = require('axios');
const tokens = require('./json/tokens.json');
const {loadFromProd, createTokens} = require("./shared/loadFromProd");

async function createTokensList() {
    const chainId = hre.network.config.chainId
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring');
    let tokens = createTokens(monitoring)

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

async function main() {
    const [owner] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", owner.address);

    let migratorAddress = "0x2078110b5871a505bFe52FB7B3f6263be746F08C"
    let factory = "0x559780e4a4d77ED70af3954bE79Ac49eD0C88524"
    let pylonFactory = "0x34d58903DeBD3849cacbA4d2AAb85961B772AEB9"
    let energyFactory = "0xa24e087EbE7152Aba370507751D64688c4498583"
    let ptFactory = "0x9882D4ABE6C6B379e5dE268fCfb41FF7a9658D05"

    let migrator = await hre.ethers.getContractFactory("Migrator");
    console.log("Migrator address", migratorAddress, "owner", owner.address)
    let migratorContract = await migrator.attach(migratorAddress);
    await(await migratorContract.initialize(
        energyFactory, ptFactory, pylonFactory, factory
    )).wait()

    await loadFromProd(migratorAddress, factory, pylonFactory, energyFactory, ptFactory, owner.address, tokens.tokens)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
