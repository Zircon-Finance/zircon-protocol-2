require('dotenv').config()
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-dependency-compiler");
require('solidity-docgen');
require('hardhat-deploy');
require('hardhat-abi-exporter');
const { ethers } = require('ethers');
const { generate, generateReal } = require('./src/generate');
const fs = require('fs');
const rawData  =  require('./src/rawData');

task("test:prepare_data", "Generate data that required by test", async (taskArguments, hre) => {
  /* As hardhat allows to access its runtime environment variables,
    we don't need to declare the self-generated accounts as a global variable */
  const accounts = await hre.ethers.getSigners()
  console.log(accounts.map(x => x.address.toLowerCase()))
  const template = generate(accounts.map(x => x.address.toLowerCase()))
  await fs.writeFile('./test/generated.js', template, () => {})
  console.log('✨ test/generated.js generated')

  if (process.env.REAL === 'true') {
    const templateReal = generateReal(rawData)
    await fs.writeFile('./test/generatedReal.js', templateReal ,()  => {})
    console.log('✨ test/generatedReal.js generated')
  }
})

/* subtasks help us get rid of another script and
  package json script like `hardhat prepare_data && hardhat test` */
task("test:finally", "Test after data prepared")
    /* pass param from cli: `hardhat test:finally --real true` */
    .addOptionalParam("real", "whether using real data", "false")
    .setAction(async (taskArguments, hre) => {
      await hre.run("test:prepare_data")
      /* but pass param to a built-in task is not convenient, recommend using node's process.env */
      await hre.run("test")
    })

const privateKey = process.env.PRIVKEY;
const privateKeyDev = process.env.PRIVKEY_DEV;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: 'hardhat',
  watcher: {
    compilation: {
      tasks: ["compile"],
    }
  },
  abiExporter: {
    path: '../zircon-periphery/core_contracts/abi',
    runOnCompile: true,
    clear: true,
    flat: true,
    spacing: 2,
    pretty: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
  },
  networks: {
    hardhat: {
      /* if using ganache + truffle, to handle self-generated accounts,
      you have to write more code to launch server with ganache-core api */
      accounts: [...new Array(300)].map(() => {
        const { privateKey } = ethers.Wallet.createRandom()
        return {
          balance: '1000000000000000000000', //'0x' + (10 ** 20).toString(16),
          privateKey
        }
      })
    },
    moonbase: {
      url: 'https://rpc.testnet.moonbeam.network',
      accounts: [privateKey],
      chainId: 1287,
    },
    dev: {
      url: 'http://127.0.0.1:7545',
      accounts: [privateKeyDev],
      network_id: '5777',
      chainId: 1281,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999,
          },
        },
      },
    ],
  }
  ,
};
