require('dotenv').config()
require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-dependency-compiler");
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

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
  dependencyCompiler: {
    paths: [
      '@zircon/core/contracts/ZirconFactory.sol',
      '@zircon/core/contracts/ZirconPylonFactory.sol',
      '@zircon/core/contracts/ZirconPylon.sol',
      '@zircon/core/contracts/ZirconPair.sol',
      '@zircon/core/contracts/ZirconPoolToken.sol'
    ],
  },
  networks: {
    hardhat: {},
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
      },
    ],
  }
  ,
};
