const { ethers } = require('hardhat');
const {LIB_ADDRESS} = require("./constants");
const updateBytecode = require('./update-bytecode');
const hre = require('hardhat');

// GET BYTECODES
async function getBytecodes() {
    const chainId = hre.network.config.chainId
    await updateBytecode(LIB_ADDRESS[chainId], false);
}


getBytecodes()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
