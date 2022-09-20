require('dotenv').config()
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-dependency-compiler");
require('hardhat-abi-exporter');
require('hardhat-deploy');
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
  //     '../zircon-core/contracts/energy/ZirconEnergyFactory.sol',
  //     '../zircon-core/contracts/ZirconFactory.sol',
  //     '../zircon-core/contracts/ZirconPylonFactory.sol',
  //     '../zircon-core/contracts/ZirconPylon.sol',
  //     '../zircon-core/contracts/ZirconPair.sol',
  //     '../zircon-core//contracts/ZirconPoolToken.sol'
  //   ],
  // },
  etherscan: {
    apiKey: {
      moonriver: moonriverAPI
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
    dev: {
      url: 'http://127.0.0.1:7545',
      accounts: [privateKeyDev],
      network_id: '5777',
      chainId: 1281,
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
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },{
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  }
  ,
};
