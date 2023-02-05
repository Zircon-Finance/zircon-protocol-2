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

    let migratorAddress = "0x1268997b6AEB2b4e8401e4F6e2A7B622A1E5b665"
    let factory = "0x60EB2D9fb42450438187D119af32f30C914d6006"
    let pylonFactory = "0xa6D2b86AAB2C51B55a9174e80c88E5417D2EdB6E"
    let energyFactory = "0xE18971aCa01B0928cAF04a9668E469FD5308c1e8"
    let ptFactory = "0x66eB144fAc83F5c13735649f5E665Bd6112DDCd9"

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
