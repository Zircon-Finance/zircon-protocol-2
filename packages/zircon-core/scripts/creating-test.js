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

    let migratorAddress = "0x893beDE386611Bcf96fc52eF03A8B39240aB8a63"
    let factory = "0x4201F3F4F965354f40418CA750529736fbbC6Da1"
    let pylonFactory = "0x9c9E1f99Cb55663DEF01bc7907191082DFcC4BDC"
    let energyFactory = "0x056605b92dAAE144283784D6Ff218D29a7AD2b40"

    let migrator = await hre.ethers.getContractFactory("Migrator");
    console.log("Migrator address", migratorAddress, "owner", owner.address)

    let migratorContract = await migrator.attach(migratorAddress);
    // await migratorContract.initialize(
    //     "0x056605b92dAAE144283784D6Ff218D29a7AD2b40", "0x0BEb401d87964D53cDB2cf9956a9FcF0Cc52d927", "0x9c9E1f99Cb55663DEF01bc7907191082DFcC4BDC", "0x4201F3F4F965354f40418CA750529736fbbC6Da1"
    // )

    // return;
    await loadFromProd(migratorAddress, factory, pylonFactory, energyFactory, owner.address, tokens.tokens)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
