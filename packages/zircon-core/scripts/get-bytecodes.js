const { ethers } = require('hardhat');

// Get Bytecodes
async function getBytecodes() {

    let pairContract = await ethers.getContractFactory("ZirconPair");
    let pylonContract = await ethers.getContractFactory("ZirconPylon");
    let energyContract = await ethers.getContractFactory("ZirconEnergy");
    let ptContract = await ethers.getContractFactory("ZirconPoolToken");

    console.log("keccak256 bytecode poolToken", ethers.utils.keccak256(ptContract.bytecode))
    console.log("keccak256 bytecode pairContract", ethers.utils.keccak256(pairContract.bytecode))
    console.log("keccak256 bytecode pylon", ethers.utils.keccak256(pylonContract.bytecode))
    console.log("keccak256 bytecode energy", ethers.utils.keccak256(energyContract.bytecode))
}

getBytecodes()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
