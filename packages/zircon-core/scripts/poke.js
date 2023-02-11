const hre = require('hardhat');
const {
    LIB_ADDRESS,
    MIGRATOR_ADDRESS,
    FEE_TO_SETTER_ADDRESS,
    GENESIS_PYLON_FACTORY,
    FACTORY,
    PT_FACTORY,
    ENERGY_FACTORY,
    PYLON_FACTORY
} = require("./constants");

// ADDRESSES
const migratePylons = async () => {
    const chainId = hre.network.config.chainId
    console.log("Poking on ChainId: ", chainId)

    // OLD ENERGY
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let energyInstance = factoryEnergy.attach(ENERGY_FACTORY[chainId]);

    // PYLON FACTORY
    let pylonContract = await ethers.getContractFactory('ZirconPylon', {
        libraries: {
            ZirconLibrary: LIB_ADDRESS[chainId],
        }
    });

    let pylonFactory = await ethers.getContractFactory('ZirconPylonFactory', {
        libraries: {
            ZirconLibrary: LIB_ADDRESS[chainId],
        }
    });

    let pylonInstance = pylonFactory.attach(PYLON_FACTORY[chainId])

    // FACTORY
    let zFacatoryContract = await ethers.getContractFactory("ZirconFactory")
    let zFactory = zFacatoryContract.attach(FACTORY[chainId])

    let poolTokenContract = await ethers.getContractFactory("ZirconPoolToken")


    let ptFacatoryContract = await ethers.getContractFactory("ZirconPTFactory")
    let ptFactory = ptFacatoryContract.attach(PT_FACTORY[chainId])

    // Getting all the pairs
    let allPairsLength = await zFactory.allPairsLength()

    const poke = async (token0, token1, pylonAddress, pair, isFloatRes0) => {
        let pylon = pylonContract.attach(pylonAddress)
        let blockTimestamp = 0 // TODO get block from ethers shit
        let lastOracleTimestamp = await pylon.lastOracleTimestamp()
        let oracleUpdateSecs = await pylon.oracleUpdateSecs()
        let lastPrice = await pylon.lastPrice()
        let lastPrice = await pylon.lastPrice()
        let reserves = await pair.getReserves()
        let decimals0 = await token0.decimals()
        let decimals1 = await token1.decimals()
        let price = isFloatRes0 ? reserves[1].mul(decimals0)/reserves[0] : reserves[0].mul(decimals1)/reserves[1]

        if (blockTimestamp - lastOracleTimestamp > oracleUpdateSecs && abs((lastPrice/price)-1) > 0.01) {
            // sendTokens
            // mint a little bit
        }
    }
    let pairsToMigrate = []
    console.log("starting migration...")
    for (let i = 0; i < 2 ; i++) {
        console.log("Pair ", i)

        let pairAddress = await zFactory.allPairs(i)
        let pairContract = await ethers.getContractFactory("ZirconPair")
        let pair = pairContract.attach(pairAddress)

        let token0 = await pair.token0()
        let token1 = await pair.token1()
        let pylonAddress = await pylonInstance.getPylon(token0, token1)
        let pylonAddress2 = await pylonInstance.getPylon(token1, token0)

        if (pylonAddress !== "0x0000000000000000000000000000000000000000") {
            console.log(pylonAddress)
            await poke(token0, token1, pylonAddress, pair, false)
        }
        if (pylonAddress2 !== "0x0000000000000000000000000000000000000000") {
            console.log(pylonAddress2)
            await poke(token1, token0, pylonAddress2, pair, true)
        }
    }
}



migratePylons()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
