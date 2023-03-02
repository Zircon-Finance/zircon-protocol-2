require('dotenv').config()
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-dependency-compiler");
require('solidity-docgen');
require('hardhat-deploy');
require('hardhat-abi-exporter');
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();
//
//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

const privateKey = process.env.PRIVKEY;
const privateKeyDev = process.env.PRIVKEY_DEV;
const moonriverAPI = process.env.API_KEY;
const bscAPI = process.env.API_KEY_BSC;

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
  etherscan: {
    apiKey: {
      moonriver: moonriverAPI,
      bsc: bscAPI
    },
    customChains: [
      {
        network: "moonriver",
        chainId: 1285,
        urls: {
          apiURL: "https://api-moonriver.moonscan.io/api",
          browserURL: "https://moonriver.moonscan.io/"
        }
      }
    ]
  },
  networks: {
    hardhat: {},
    moonbase: {
      url: 'https://rpc.testnet.moonbeam.network',
      accounts: [privateKeyDev],
      chainId: 1287,
    },
    bsc: {
      url: 'https://binance.nodereal.io',
      accounts: [privateKey],
      chainId: 56,
    },
    dev: {
      url: 'http://127.0.0.1:7545',
      accounts: [privateKeyDev],
      network_id: '5777',
      chainId: 1281,
    },
    bscTest: {
      url: 'https://dimensional-capable-mountain.bsc-testnet.discover.quiknode.pro/a18cd4a763aa2651731546483a4b0a521262ae47/',
      accounts: [privateKeyDev],
      chainId: 97,
    },
    arbGoerly: {
      url: 'https://arb-goerli.g.alchemy.com/v2/vuu8lHxfsEcCnk1BENpnZHDmvuDlXtNl',
      accounts: [privateKeyDev],
      chainId: 421613,
    },
    bsc: {
      url: 'https://binance.nodereal.io',
      accounts: [privateKey],
      chainId: 56,
    },
    moonriver: {
      url: 'https://moonriver.public.blastapi.io',
      accounts: [privateKey],
      chainId: 1285,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  }
  ,
};
