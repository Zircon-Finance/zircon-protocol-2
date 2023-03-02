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

// Create new migrator
// Create new library
// Bytecodes
// Migrate old migrator to new migrator
// Migrate and chill


// pylon: 4eb6ad1b9d6ef9d0c630b758ec25ecc1be3ee4f1c02123869bcec57f5a6f5c1b
// energy: 13cc476ec89c14a52a00407c4c698ce09eace6be56b0f01b8ba4ffcdb51664c7
// pair: f89662c519be6475198359d4e7cc67ad7d520afaf45f753cf397275eb7cec7c3
// pt: c3cc0a1ec38aa8f2d20522d72dbb7d4060300be98c81fb6ff111ec7e85b09464

// Last
// pylon: bdcd981759969595cbaa18dbe5182f383ceab96981adab30631555fdec2ba5ad
// energy: 2a67ef3ddc6d83b676fad022beb6757f9d22268b35f2b6e8cb8213fe3e0f4994
// pair: 51d3eb3793b328f6c18e3b757ee09ed006b54bbb222da219f9d854892ffa90de
// pt: f5ae1960da8094971226e6c6676ec554696151fa6ea7b2bba59501fd39f5425f

// ADDRESSES
const migratePylons = async () => {
    const chainId = hre.network.config.chainId
    console.log("Migrating on ChainId: ", chainId)

    // MIGRATOR
    let migratorContract = await ethers.getContractFactory("Migrator")
    let migrator = migratorContract.attach(MIGRATOR_ADDRESS[chainId])


    // Updating Factory with new addresses
    await(await migrator.initialize(ENERGY_FACTORY[chainId], PT_FACTORY[chainId], PYLON_FACTORY[chainId], FACTORY[chainId])).wait()

    // OLD ENERGY
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let energyInstance = factoryEnergy.attach(ENERGY_FACTORY[chainId]);
    // NEW ENERGY 0x625ad88bb31E7119E963F2C718C9419c23Cd6F10
    // NEW PYLON FACTORY 0x3fBb6ed3b8384fDdC18501BB62Ff3AdF50490E89
    // NEW ENERGY
    //factoryEnergy.attach(NEW_ENERGY_FACTORY[chainId]);
    let energyInstance2 = factoryEnergy.attach("0x3b7D45092A6776b5b2FB6358E41a6e0c7cF5305e")
        // await factoryEnergy.deploy(FEE_TO_SETTER_ADDRESS[chainId], MIGRATOR_ADDRESS[chainId]);
    console.log("NEW ENERGY", energyInstance2.address)
    //
    // await energyInstance2.deployed();

    // OLD PYLON FACTORY
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

    // NEW PYLON FACTORY
    let newFactoryPylonInstance = pylonFactory.attach("0x09f8E0aeA93Bcb511276A166e6e57E02e5cc1E0a")

    //     await pylonFactory.deploy(
    //         FACTORY[chainId],
    //         energyInstance2.address,
    //         PT_FACTORY[chainId],
    //         FEE_TO_SETTER_ADDRESS[chainId],
    //         MIGRATOR_ADDRESS[chainId])
    //
    // await newFactoryPylonInstance.deployed();

    // console.log("NEW PYLON FACTORY", newFactoryPylonInstance.address)

    const migrate = async (token0, token1, pylonAddress, pair, genesisPylonAddress) => {
        // let energyRev = await pair.energyRevenueAddress()
        // let energyFactAddress = energyInstance2.address
        // console.log("Migrating...", pylonAddress, newFactoryPylonInstance.address, pair.address, token0, token1, energyFactAddress, energyRev)
        // return {pylonAddress, newPylonFactory: newFactoryPylonInstance.address, pairAddress: pair.address, token0, token1, energyFactAddress, energyRev}
        let oldEnergyRev = await pair.energyRevenueAddress()
        console.log("oldEnergyRev",oldEnergyRev)
        let checkAdd = await newFactoryPylonInstance.getPylon(token0, token1)
        console.log("checkAdd",checkAdd)

        if (checkAdd === "0x0000000000000000000000000000000000000000") {
            await migrator.migrate(newFactoryPylonInstance.address, energyInstance2.address, token0, token1, {gasLimit: 10000000})
            let newPylonAddress;
            // Loop let's wait here a bit to see that pylon is created before moving to the next one
            while (true) {
                newPylonAddress = await newFactoryPylonInstance.getPylon(token0, token1)
                if (newPylonAddress !== "0x0000000000000000000000000000000000000000") {
                    break
                } else {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            console.log("Migrated::::New Pylon address", newPylonAddress)

            let ptAddress = await ptFactory.getPoolToken(newPylonAddress, token0)
            let pt = poolTokenContract.attach(ptAddress)
            console.log("PylonFactoryAddress", await pt.pylonFactory())
        }else{
            console.log("Already migrated")
        }
    }

    // 0x2d28AA28fA1E5e6bF121CF688309Bf3faAAe3C70 0x98878B06940aE243284CA214f92Bb71a2b032B8A 0x01Ccf73dda86A56F2DE4566F3aa070b055F79906 0x61F0F6De5B6BA993e6585646743D022938326ec9
    // let pairs = [ "0x2d28AA28fA1E5e6bF121CF688309Bf3faAAe3C70", "0x900f1Ec5819FA087d368877cD03B265Bf1802667"]//, "0x2d28AA28fA1E5e6bF121CF688309Bf3faAAe3C70"]

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

        // let genesisPylonAddress = await genesisPylonInstance.getPylon(token0, token1)
        // let genesisPylonAddress2 = await genesisPylonInstance.getPylon(token1, token0)

        if (pylonAddress !== "0x0000000000000000000000000000000000000000") {
            console.log(pylonAddress)
            pairsToMigrate.push(await migrate(token0, token1, pylonAddress, pair))
        }
        if (pylonAddress2 !== "0x0000000000000000000000000000000000000000") {
            console.log(pylonAddress2)
            pairsToMigrate.push(await migrate(token1, token0, pylonAddress2, pair))
        }
    }

// var fs = require('fs');
// fs.writeFile('myjsonfile.json', JSON.stringify(pairsToMigrate), 'utf8', ()=>{});

// Updating Factory with new addresses
// await migrator.updateFactories(energyInstance2.address, PT_FACTORY, newFactoryPylonInstance.address, FACTORY)
}



migratePylons()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
