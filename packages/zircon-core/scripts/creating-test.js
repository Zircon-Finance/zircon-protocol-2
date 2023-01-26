const hre = require('hardhat');
const axios = require('axios');
const tokens = require('./json/tokens.json');
const {loadFromProd, createTokens} = require("./shared/loadFromProd");
const {LIB_ADDRESS} = require("./constants");

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
    let migratorAddress = "0x3413B287b0B75D9111Ebcc220d624E84AA5c00e8"
    let factory = "0x98340c9a7AA3A32A5780c726f7A61fd3828d1775"
    let pylonFactory = "0xDe75D76c7471FF2f5363433222412F6cDAC0eF1c"
    let energyFactory = "0x1F580724b4b2a95c00b144fB2eBeCd41a15eBA74"
    let ptFactory = "0xBC67EB3617d3Bc07ACfB282DE32495baA49531df"

    let migrator = await hre.ethers.getContractFactory("Migrator");
    console.log("Migrator address", migratorAddress, "owner", owner.address)
    let migratorContract = await migrator.attach(migratorAddress);
    await(await migratorContract.initialize(
        energyFactory, ptFactory, pylonFactory, factory
    )).wait()
    let libraryContract = await hre.ethers.getContractFactory("ZirconLibrary");
    console.log("chain id")
    let library = libraryContract.attach(LIB_ADDRESS[chainId])
    //loadFromProd(migratorAddress, factoryAddress, pFactoryAddress, eFactoryAddress, ptFactoryAddress, owner, tokens, library) {

    await loadFromProd(migratorAddress, factory, pylonFactory, energyFactory, ptFactory, owner.address, tokens.tokens, library)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
