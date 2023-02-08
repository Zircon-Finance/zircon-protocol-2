const hre = require('hardhat');
const axios = require('axios');
const tokens = require('./json/tokens.json');
const {loadFromProd, createTokens} = require("./shared/loadFromProd");
const {
    LIB_ADDRESS,
    MIGRATOR_ADDRESS,
    FEE_TO_SETTER_ADDRESS,
    GENESIS_PYLON_FACTORY,
    FACTORY,
    PT_FACTORY,
    ENERGY_FACTORY,
    PYLON_FACTORY
} = require("./constants");

async function createTokensList() {
    const chainId = hre.network.config.chainId
    const monitoring = await axios.get('https://edgeapi.zircon.finance/static/monitoring');
    let tokenObject = {}
    let tokens = await createTokens(monitoring, chainId)
    console.log("tokens", tokens)

    tokenObject["name"] = "Zircon Token List"
    tokenObject["timestamp"] = "2022-09-09T04:37:59.457102807Z"
    tokenObject["version"] = {
        "major": 1,
        "minor": 0,
        "patch": 0
    }
    tokenObject["logoURI"] = "https://d3v8yom54t2cda.cloudfront.net/zrg_list%402x.png"
    tokenObject["tokens"] = tokens
    let json = JSON.stringify(tokenObject);
    console.log("json", json)
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
    const chainId = hre.network.config.chainId

    let migrator = await hre.ethers.getContractFactory("Migrator");
    console.log("Migrator address", MIGRATOR_ADDRESS[chainId], "owner", owner.address)
    let migratorContract = await migrator.attach(MIGRATOR_ADDRESS[chainId]);
    await(await migratorContract.initialize(
        ENERGY_FACTORY[chainId], PT_FACTORY[chainId], PYLON_FACTORY[chainId], FACTORY[chainId]
    )).wait()
    let libraryContract = await hre.ethers.getContractFactory("ZirconLibrary");
    console.log("chain id")
    let library = libraryContract.attach(LIB_ADDRESS[chainId])

    await loadFromProd(MIGRATOR_ADDRESS[chainId], FACTORY[chainId], PYLON_FACTORY[chainId], ENERGY_FACTORY[chainId], PT_FACTORY[chainId], owner.address, tokens.tokens, library)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
