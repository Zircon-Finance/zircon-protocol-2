const fs = require('fs')
const path = require('path')

const energyFactoryPath = path.join(__dirname, '../contracts/energy/ZirconEnergyFactory.sol');
const peripheralPath = path.join(__dirname, '../../zircon-periphery/contracts/libraries/ZirconPeripheralLibrary.sol');
const uniLibraryPath = path.join(__dirname, '../../zircon-periphery/contracts/libraries/UniswapV2Library.sol');

// TODO: Update for peripheral too

// const filePath = path.join(__dirname, '../contracts/energy/ZirconEnergyFactory.sol');
function log(text, silence = false) {
    if (!silence) {
        console.log("\x1b[36m%s\x1b[0m", text, moreText);
    }
}
async function updateBytecode(libraryAddress, silence = false) {
    try {
        let data = await fs.promises.readFile(energyFactoryPath, 'utf8');
        let pairContract = await ethers.getContractFactory("ZirconPair");
        let libraryContract = await ethers.getContractFactory("ZirconLibrary");

        let pylonContract = await ethers.getContractFactory("ZirconPylon", {
            libraries: {
                ZirconLibrary: libraryAddress,
            }
        });
        let energyContract = await ethers.getContractFactory("ZirconEnergy");
        let ptContract = await ethers.getContractFactory("ZirconPoolToken");

        let pylonBytecode = ethers.utils.keccak256(pylonContract.bytecode).replace("0x", "");
        let energyBytecode = ethers.utils.keccak256(energyContract.bytecode).replace("0x", "");
        let pairBytecode = ethers.utils.keccak256(pairContract.bytecode).replace("0x", "");
        let ptBytecode = ethers.utils.keccak256(ptContract.bytecode).replace("0x", "");
        if (silence) {
            console.log("\x1b[35m%s\x1b[0m", "UPDATING ...");
        }else{
            console.log("\x1b[35m%s\x1b[0m", "STARTING UPDATE...");
        }
        log(pylonBytecode, silence);
        log(energyBytecode, silence);
        log(pairBytecode, silence);
        log(ptBytecode, silence);

        let resultPylon = data.replace(/(function pylonFor\(address tokenA, address tokenB, address pair, address pylonFactory\) pure internal returns \(address pylon\){pylon=address\(uint\(keccak256\(abi.encodePacked\(hex'ff',pylonFactory,keccak256\(abi.encodePacked\(tokenA, tokenB,pair\)\),hex')(.*)('\)\)\)\);})/g, '$1' + pylonBytecode + '$3');
        let resultEnergy = resultPylon.replace(/(function energyFor\(address token, address pair\) view internal returns \(address energy\) {energy = address\(uint\(keccak256\(abi.encodePacked\(hex'ff',address\(this\),keccak256\(abi.encodePacked\(pair, token\)\),hex')(.*)('\)\)\)\);})/g, '$1' + energyBytecode + '$3');
        await fs.promises.writeFile(energyFactoryPath, resultEnergy, 'utf8')
        if (!silence) console.log("\x1b[32m%s\x1b[0m", "SUCCESSFULLY UPDATED", "ZirconEnergyFactory.sol");

        let peripheryData = await fs.promises.readFile(peripheralPath, 'utf8');
        let pyResult = peripheryData.replace(/(function pylonFor\(address pylonFactory, address tokenA, address tokenB, address pair\) pure internal returns \(address pylon\){pylon=address\(uint\(keccak256\(abi.encodePacked\(hex'ff',pylonFactory,keccak256\(abi.encodePacked\(tokenA, tokenB,pair\)\),hex')(.*)('\)\)\)\);})/g, '$1' + pylonBytecode + '$3');
        await fs.promises.writeFile(peripheralPath, pyResult, 'utf8')
        if (!silence) console.log("\x1b[32m%s\x1b[0m", "SUCCESSFULLY UPDATED", "ZirconPeripheralLibrary.sol");

        let uniData = await fs.promises.readFile(uniLibraryPath, 'utf8');
        let resultPair = uniData.replace(/(function pairFor\(address factory, address tokenA, address tokenB\) internal pure returns \(address pair\) {\(address token0, address token1\) = sortTokens\(tokenA, tokenB\); pair = address\(uint\(keccak256\(abi.encodePacked\(hex'ff', factory, keccak256\(abi.encodePacked\(token0, token1\)\), hex')(.*)('\)\)\)\);})/g, '$1' + pairBytecode + '$3')
        await fs.promises.writeFile(uniLibraryPath, resultPair, 'utf8')
        if (!silence) console.log("\x1b[32m%s\x1b[0m", "SUCCESSFULLY UPDATED", "UniswapV2Library.sol");

    }catch (e) {
        console.error("Error updating bytecode", e)
    }
}

module.exports = updateBytecode;


