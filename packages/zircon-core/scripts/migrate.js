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
    console.log("Migrating on ChainId: ", chainId)

    // MIGRATOR
    let migratorContract = await ethers.getContractFactory("Migrator")
    let migrator = migratorContract.attach(MIGRATOR_ADDRESS[chainId])


    // Updating Factory with new addresses
    await migrator.initialize(ENERGY_FACTORY[chainId], PT_FACTORY[chainId], PYLON_FACTORY[chainId], FACTORY[chainId])

    // OLD ENERGY
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let energyInstance = factoryEnergy.attach(ENERGY_FACTORY[chainId]);
    // NEW ENERGY 0x625ad88bb31E7119E963F2C718C9419c23Cd6F10
    // NEW PYLON FACTORY 0x3fBb6ed3b8384fDdC18501BB62Ff3AdF50490E89
    // NEW ENERGY
    //factoryEnergy.attach(NEW_ENERGY_FACTORY[chainId]);
    let energyInstance2 = await factoryEnergy.deploy(FEE_TO_SETTER_ADDRESS[chainId], MIGRATOR_ADDRESS[chainId]);
    console.log("NEW ENERGY", energyInstance2.address)
    //
    await energyInstance2.deployed();

    // OLD PYLON FACTORY
    let pylonFactory = await ethers.getContractFactory('ZirconPylonFactory', {
        libraries: {
            ZirconLibrary: LIB_ADDRESS[chainId],
        }
    });
    let pylonInstance = pylonFactory.attach(PYLON_FACTORY[chainId])


    // Genesis PYLON FACTORY
    let genesisPylonInstance = pylonFactory.attach(GENESIS_PYLON_FACTORY[chainId])

    // FACTORY
    let zFacatoryContract = await ethers.getContractFactory("ZirconFactory")
    let zFactory = zFacatoryContract.attach(FACTORY[chainId])

    // Getting all the pairs
    let allPairsLength = await zFactory.allPairsLength()

    // NEW PYLON FACTORY
    //

    let newFactoryPylonInstance = //factoryPylon.attach(NEW_PYLON_FACTORY[chainId])
        await pylonFactory.deploy(
            FACTORY[chainId],
            energyInstance2.address,
            PT_FACTORY[chainId],
            FEE_TO_SETTER_ADDRESS[chainId],
            MIGRATOR_ADDRESS[chainId])

    await newFactoryPylonInstance.deployed();

    console.log("NEW PYLON FACTORY", newFactoryPylonInstance.address)

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
            await migrator.migrate(newFactoryPylonInstance.address, energyInstance2.address, token0, token1)

            //, genesisPylonAddress === "0x0000000000000000000000000000000000000000" ? PYLON_FACTORY[chainId] : GENESIS_PYLON_FACTORY[chainId]);

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
        }else{
            console.log("Already migrated")
        }
    }
    // 0x2d28AA28fA1E5e6bF121CF688309Bf3faAAe3C70 0x98878B06940aE243284CA214f92Bb71a2b032B8A 0x01Ccf73dda86A56F2DE4566F3aa070b055F79906 0x61F0F6De5B6BA993e6585646743D022938326ec9
    // let pairs = [ "0x2d28AA28fA1E5e6bF121CF688309Bf3faAAe3C70", "0x900f1Ec5819FA087d368877cD03B265Bf1802667"]//, "0x2d28AA28fA1E5e6bF121CF688309Bf3faAAe3C70"]
    let pairsToMigrate = []
    console.log("starting migration...")
    for (let i = 0; i < allPairsLength ; i++) {
        console.log("Pair ", i)

        let pairAddress = await zFactory.allPairs(i)
        let pairContract = await ethers.getContractFactory("ZirconPair")
        let pair = pairContract.attach(pairAddress)

        let token0 = await pair.token0()
        let token1 = await pair.token1()
        let pylonAddress = await pylonInstance.getPylon(token0, token1)
        let pylonAddress2 = await pylonInstance.getPylon(token1, token0)

        let genesisPylonAddress = await genesisPylonInstance.getPylon(token0, token1)
        let genesisPylonAddress2 = await genesisPylonInstance.getPylon(token1, token0)

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
