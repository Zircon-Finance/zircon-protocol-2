const { ethers } = require('hardhat');
const updateBytecode = require('./update-bytecode');
// GET BYTECODES
async function getBytecodes() {
    // let pairContract = await ethers.getContractFactory("ZirconPair");
    // let libraryContract = await ethers.getContractFactory("ZirconLibrary");
    //
    // let pylonContract = await ethers.getContractFactory("ZirconPylon", {
    //     libraries: {
    //         ZirconLibrary: "0x0000000000000000000000000000000000000000",
    //     }
    // });
    // let energyContract = await ethers.getContractFactory("ZirconEnergy");
    // let ptContract = await ethers.getContractFactory("ZirconPoolToken");
    //
    // var result = data.replace(/(function pylonFor\(address tokenA, address tokenB, address pair, address pylonFactory\) pure internal returns \(address pylon\){pylon=address\(uint\(keccak256\(abi.encodePacked\(hex'ff',pylonFactory,keccak256\(abi.encodePacked\(tokenA, tokenB,pair\)\),hex')(.*)('\)\)\)\);})/g, '$186a07d7f5bb5f35df142398e44c5e2766023286f604f815fc34d6024dca1797$3');
    // var result = data.replace(/(function energyFor\(address token, address pair\) view internal returns \(address energy\) {energy = address\(uint\(keccak256\(abi.encodePacked\(hex'ff',address\(this\),keccak256\(abi.encodePacked\(pair, token\)\),hex')(.*)('\)\)\)\);})/g, '$186a07d7f5bb5f35df142398e44c5e27616023286f604f815fc34d6024dca177$3');
    await updateBytecode("0x0000000000000000000000000000000000000000");

    // console.log("keccak256 bytecode poolToken", ethers.utils.keccak256(ptContract.bytecode))
    // console.log("keccak256 bytecode pairContract", ethers.utils.keccak256(pairContract.bytecode))
    // console.log("keccak256 bytecode pylon", ethers.utils.keccak256(pylonContract.bytecode))
    // console.log("keccak256 bytecode energy", ethers.utils.keccak256(energyContract.bytecode))
}

getBytecodes()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
