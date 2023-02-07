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

    let migratorAddress = "0xfE2C2DAfcc29320Ece37aF11ac9D86624Cf6C3d0"
    let factory = "0x40D3b4105Eb640Db284CB46Fc8308F3f9a9aE591"
    let pylonFactory = "0x092ddF2C267BF45c3CCaB3BF4197A498e61B9b5A"
    let energyFactory = "0x1138EAcBefbe4E9f38fe86D6f120Ce4C4d6b1e08"
    let ptFactory = "0x889b791e207FA05208F7c95E9058490D0F5645d6"

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
