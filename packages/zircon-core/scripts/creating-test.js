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

    let migratorAddress = "0x26DcC6B22c7e91B567AB898A193AB705BFFFC1FB"
    let factory = "0xc453B4E752BF050298BdA29920530d6Ef65270eC"
    let pylonFactory = "0x825cD0651fe59e831c53B9cEC572ce10d8537fe0"
    let energyFactory = "0x43141489F8b4EB2AeAdA992D1016777B16C7C4ca"
    let ptFactory = "0x69ACCe32C7D37D93a1D75385968525f82715797B"

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
