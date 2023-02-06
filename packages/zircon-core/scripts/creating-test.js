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



const ADDRESSES = {
    WETH: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    factory: '0x599400CC21CE3F9589F2f011D39Ab67231A6200F',
    router: '0xE30F6358DfDE7092De6cBa44E0864AD8e83034E9',
    multicall: '0x92dCd1867B0764857E1722F5C0541C5581240de1',
    pylonRouter: '0x6A4B28d8A4EdF33E4CE780798CB512014a6529Fa',
    pylonFactory: '0x76f5619266Cf6FC586efA815645e570B184d01b8',
    energyFactory: '0x67ab25eD352dFfD04E3EFA9F9bf1e6922B81667e',
    farmFactory: '0xe955fA317B6120A222f30f354B730200b7Da2f71',
    ptFactory: '0x42ABD56BdE30bd65fB75755A232B99bD1d6FC256',
    migrator: '0xa5f34C878ec9E81470C66370367F94997DD18684',
    feeToSetter: '0x9A3643cC2fc2599087F7a2482ac1a3898a7C1149',
}

async function main() {
    const [owner] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", owner.address);
    const chainId = hre.network.config.chainId

    let migrator = await hre.ethers.getContractFactory("Migrator");
    console.log("Migrator address", ADDRESSES["migrator"], "owner", owner.address)
    let migratorContract = await migrator.attach(ADDRESSES["migrator"]);
    // await(await migratorContract.initialize(
    //     energyFactory, ptFactory, pylonFactory, factory
    // )).wait()
    let libraryContract = await hre.ethers.getContractFactory("ZirconLibrary");
    console.log("chain id")
    let library = libraryContract.attach(LIB_ADDRESS[chainId])

    await loadFromProd(ADDRESSES["migrator"], ADDRESSES["factory"], ADDRESSES["pylonFactory"], ADDRESSES["energyFactory"], ADDRESSES["ptFactory"], owner.address, tokens.tokens, library)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
