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

    let migratorAddress = "0x5E59b2e5e75f7Ee1a15024c324c1a65A49661611"
    let factory = "0x510D9BEcBd3C7E89d9d48dB51e99Ae5B72c27226"
    let pylonFactory = "0x0044f6653a1f2ddc873Ca6e964e324c888ba73cF"
    let energyFactory = "0xeB2F197df953bd306E7B2Ed1074423d80Da7199C"
    let ptFactory = "0x55A5D6571711524Cd4d0d4aBaC8952b8eF237B74"

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
