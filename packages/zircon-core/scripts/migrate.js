const FEE_TO_SETTER_ADDRESS = "0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce";
const MIGRATOR_ADDRESS = "0x9AEF9098af9d1E2d78FCd9B928C946a7f23307d3";
const ENERGY_FACTORY = "0x168C95536C77Be5400EED2AEEE21ef64D9c8CA2E";
const PYLON_FACTORY = "0x1153550210Bbef5b74890b242F37Ae24E1F41440";
const FACTORY = "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd";
const PT_FACTORY = "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54";


const checkPylon = async () => {
    let factoryEnergy = await ethers.getContractFactory('ZirconPTFactory');
    let factoryInstance = factoryEnergy.attach(PT_FACTORY);
    let pt = await factoryInstance.getPoolToken("0x5587F7eEE3bc874d4c236315D9E6fdbd1F981A00", "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5")
    console.log("pt", pt)
}

const migration = async (pylonAddress, newPylonFactory, pairAddress, token0, token1, energyFactAddress, energyRev, migrator, energyInstance) => {

    let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory');
    let newPylonInstance = factoryPylon.attach(newPylonFactory);
    let newPylonAddress = await newPylonInstance.getPylon(token0, token1)
    console.log("newPylonAddress", newPylonAddress)
    return

    await migrator.startNewPylon(pylonAddress, newPylonFactory, pairAddress, token0, token1)
    console.log("startNewPylon")

    // Migrating energy revenue
    await migrator.migrateEnergyRevenue(pairAddress, energyRev, token0, token1, newPylonFactory, energyFactAddress)
    console.log("migrateEnergyRevenue")

    // Getting new energy
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let energyInstance2 = factoryEnergy.attach(energyFactAddress);
    let energyAddress = await energyInstance.getEnergy(token0, token1)
    console.log("energyAddress")

    let pairContract = await ethers.getContractFactory("ZirconPair")
    let pair = pairContract.attach(pairAddress)

    // // Updating energy
    // let newPylonAddress = await newPylonInstance.getPylon(token0, token1)
    // console.log("newPylonAddress", newPylonAddress)

    // let newPylonAddress = await newPylonInstance.getPylon(token0, token1)
    await migrator.updateEnergyOnPylon(energyAddress, await pair.energyRevenueAddress(), newPylonAddress, pairAddress, token0, token1, newPylonFactory)
    console.log("finish migrations")
}

const migratePylon2 = async () => {
    // MIGRATOR
    let migratorContract = await ethers.getContractFactory("Migrator")
    let migrator = migratorContract.attach("0x49675A06F3D243583ecDD55C7FAf26F9b4aD9200")
    let migrator2 = migratorContract.attach("0x0F604e7205d7D27b86de410c74330c77afFa4226")
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let energyInstance = factoryEnergy.attach(ENERGY_FACTORY);
    let ayuda = await energyInstance.migrator()
    console.log("ayuda", ayuda)

    // 0x49675A06F3D243583ecDD55C7FAf26F9b4aD9200 ENERGY_FACTORY ->
    // 0x0F604e7205d7D27b86de410c74330c77afFa4226 "0x162a6d7EB51E000ebcc8Af76e4255C2dABfFE760"
    // 0x0F604e7205d7D27b86de410c74330c77afFa4226 FACTORY
    // 0x0F604e7205d7D27b86de410c74330c77afFa4226 "0x6eC3bE502A4465321E643e1b5A6184FCD393a319"
    // 0x0F604e7205d7D27b86de410c74330c77afFa4226 PT_FACTORY
    // 0x0F604e7205d7D27b86de410c74330c77afFa4226 "0xEc5f493D3ca6F156d0cF5DbdABfBE16411D669FF"

    // "0x6eC3bE502A4465321E643e1b5A6184FCD393a319"
    // "0xEc5f493D3ca6F156d0cF5DbdABfBE16411D669FF"
    await migrator.initialize(ENERGY_FACTORY, PT_FACTORY, PYLON_FACTORY, FACTORY)
    // // MIGRATOR
    await migrator.setMigrator(migrator2.address)
    // Updating Factory with new addresses
    // await migrator2.initialize(ENERGY_FACTORY, PT_FACTORY, PYLON_FACTORY, FACTORY)

}


const addingPylon = async () => {
    // MIGRATOR
    let pylonFactory = await ethers.getContractFactory("ZirconPylonFactory")

    // Updating Factory with new addresses
    // await migrator2.initialize(ENERGY_FACTORY, PT_FACTORY, PYLON_FACTORY, FACTORY)

}

const migratePylon = async () => {

    // MIGRATOR
    let migratorContract = await ethers.getContractFactory("Migrator")
    let migrator = migratorContract.attach(MIGRATOR_ADDRESS)


    // Updating Factory with new addresses
    await migrator.initialize(ENERGY_FACTORY, PT_FACTORY, PYLON_FACTORY, FACTORY)

    // OLD ENERGY
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let energyInstance = factoryEnergy.attach(ENERGY_FACTORY);
    // NEW ENERGY 0x625ad88bb31E7119E963F2C718C9419c23Cd6F10
    // NEW PYLON FACTORY 0x3fBb6ed3b8384fDdC18501BB62Ff3AdF50490E89
    // NEW ENERGY
    let energyInstance2 = factoryEnergy.attach("0xaD42184437c8558087b2B096aCbA3184F7279F7E")//await factoryEnergy.deploy(FEE_TO_SETTER_ADDRESS, MIGRATOR_ADDRESS);
    console.log("NEW ENERGY", energyInstance2.address)
    await energyInstance2.deployed();

    // OLD PYLON FACTORY
    let pylonFactory = await ethers.getContractFactory("ZirconPylonFactory")
    let pylonInstance = pylonFactory.attach(PYLON_FACTORY)

    // FACTORY
    let zFacatoryContract = await ethers.getContractFactory("ZirconFactory")
    let zFactory = zFacatoryContract.attach(FACTORY)

    // Getting all the pairs
    let allPairs = await zFactory.allPairsLength()

    // NEW PYLON FACTORY
    let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory');

    let newFactoryPylonInstance = factoryPylon.attach("0xbd8899A46622E381Be2Efb270FC984fa863d9d50")

    // await factoryPylon.deploy(
    // FACTORY,
    // energyInstance2.address,
    // PT_FACTORY,
    // FEE_TO_SETTER_ADDRESS,
    // MIGRATOR_ADDRESS);
    // await newFactoryPylonInstance.deployed();

    console.log("NEW PYLON FACTORY", newFactoryPylonInstance.address)

    const migrate = async (token0, token1, pylonAddress, pair) => {
        // let energyRev = await pair.energyRevenueAddress()
        // let energyFactAddress = energyInstance2.address
        // console.log("Migrating...", pylonAddress, newFactoryPylonInstance.address, pair.address, token0, token1, energyFactAddress, energyRev)
        // return {pylonAddress, newPylonFactory: newFactoryPylonInstance.address, pairAddress: pair.address, token0, token1, energyFactAddress, energyRev}
        let oldEnergyRev = await pair.energyRevenueAddress()
        let checkAdd = await newFactoryPylonInstance.getPylon(token0, token1)
        if (checkAdd === "0x0000000000000000000000000000000000000000") {
            await migrator.startNewPylon(pylonAddress, newFactoryPylonInstance.address, pair.address, token0, token1)

            let newPylonAddress;
            while (true) {
                newPylonAddress = await newFactoryPylonInstance.getPylon(token0, token1)
                if (newPylonAddress !== "0x0000000000000000000000000000000000000000") {
                    break
                } else {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            console.log("newPylonAddress", newPylonAddress)

            // Migrating energy revenue
            await migrator.migrateEnergyRevenue(pair.address, oldEnergyRev, token0, token1, newFactoryPylonInstance.address, energyInstance2.address)
            console.log("migrateEnergyRevenue")

            // Getting new energy
            let energyAddress = await energyInstance.getEnergy(token0, token1)
            console.log("energyAddress")

            // Updating energy
            await migrator.updateEnergyOnPylon(energyAddress, await pair.energyRevenueAddress(), newPylonAddress, pair.address, token0, token1, newFactoryPylonInstance.address)
            console.log("finish migrations")
        }
    }



    let pairsToMigrate = []
    // for (let i = 0; i < allPairs; i++) {
    let pairAddress = await zFactory.getPair("0x3516a7588C2E6FFA66C9507eF51853eb85d76e5B", "0x98878B06940aE243284CA214f92Bb71a2b032B8A") //await zFactory.allPairs(i)
    let pairContract = await ethers.getContractFactory("ZirconPair")
    let pair = pairContract.attach(pairAddress)

    let token0 = await pair.token0()
    let token1 = await pair.token1()
    let pylonAddress = await pylonInstance.getPylon(token0, token1)
    let pylonAddress2 = await pylonInstance.getPylon(token1, token0)
    if (pylonAddress !== "0x0000000000000000000000000000000000000000") {
        console.log("Migrating pair", token0, token1, pylonAddress)
        pairsToMigrate.push(await migrate(token0, token1, pylonAddress, pair))
    }
    if (pylonAddress2 !== "0x0000000000000000000000000000000000000000") {
        console.log("Migrating pair 2", token0, token1, pylonAddress2)
        pairsToMigrate.push(await migrate(token1, token0, pylonAddress2, pair))
    }
// }

// var fs = require('fs');
// fs.writeFile('myjsonfile.json', JSON.stringify(pairsToMigrate), 'utf8', ()=>{});

// Updating Factory with new addresses
// await migrator.updateFactories(energyInstance2.address, PT_FACTORY, newFactoryPylonInstance.address, FACTORY)
}



migratePylon()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
