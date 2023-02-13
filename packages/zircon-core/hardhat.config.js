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

// extendEnvironment(async (hre) => {
//   library = await librarySetup()
//
//   hre.hi = library;
//   console.log("hello from here");
// });

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
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
  },
  // dependencyCompiler: {
  //   paths: [
  //     '@zircon/periphery/contracts/Token.sol',
  //     '@zircon/periphery/contracts/WETH.sol',
  //   ],
  // },
  etherscan: {
    apiKey: {
      moonriver: moonriverAPI,
      bsc: bscAPI,
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
  abiExporter: {
    path: '../zircon-periphery/core_contracts/abi',
    runOnCompile: true,
    clear: true,
    flat: true,
    spacing: 2,
    pretty: true,
  },
  networks: {
    hardhat: {},
    moonbase: {
      url: 'https://moonbase-alpha.blastapi.io/88bb4b04-103a-47c5-ac37-0aecaf3aff46',
      accounts: [privateKeyDev],
      chainId: 1287,
      gasPrice: 10000000000 // whatever you want here

      // httpHeaders: { "apiKey": "e75dfacd-1ec2-4d9f-9c25-d778cefbd284" },
    },
    arbGoerly: {
      url: 'https://arb-goerli.g.alchemy.com/v2/vuu8lHxfsEcCnk1BENpnZHDmvuDlXtNl',
      accounts: [privateKeyDev],
      chainId: 421613,
      // gasPrice: 100000000 // whatever you want here

    },
    bsc: {
      url: 'https://binance.nodereal.io',
      accounts: [privateKey],
      chainId: 56,
    },
    bscTest: {
      url: 'https://dimensional-capable-mountain.bsc-testnet.discover.quiknode.pro/a18cd4a763aa2651731546483a4b0a521262ae47/',
      accounts: [privateKeyDev],
      chainId: 97,
    },
    dev: {
      url: 'http://127.0.0.1:7545',
      accounts: [privateKeyDev],
      network_id: '5777',
      chainId: 1281,
    },
    moonriver: {
      url: 'https://moonriver.public.blastapi.io/02c84726-5104-4c91-9697-0ac7efe2b0f6',
      accounts: [privateKey],
      chainId: 1285,
      blockGasLimit: 100000000429720 // whatever you want here
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
    ],
  }
};
