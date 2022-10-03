const hre = require('hardhat');

// ADDRESSES
const FEE_TO_SETTER_ADDRESS = {1285: "0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce", 1287: '0xbCea98Df85045F2Fcf5310fE4237ca95C9C24622'};
const MIGRATOR_ADDRESS = {1285: "0x03209097D62b3EB7e62b2dB13Bb2729A3431F437", 1287: '0xec89E7389Cfa95A801f8ddC18dA92C1165280971'};
const ENERGY_FACTORY = {1285: "0x49e15A5ea67FD7ebe70EB539a51abf1919282De8", 1287: '0x625ad88bb31E7119E963F2C718C9419c23Cd6F10'};
const NEW_ENERGY_FACTORY = {1285: "0x9b38fD03fAf64Dcc5F1da1101326a072092420A8", 1287: '0x9A747f8cF3A9aD39B7A5770B694160A56c86a592'};
const PYLON_FACTORY = {1285: "0xe9DB6Edc6b4330e7C06f5A7F79822C1361d38548", 1287: '0x3fBb6ed3b8384fDdC18501BB62Ff3AdF50490E89'};
const GENESIS_PYLON_FACTORY = {1285: "0x1153550210Bbef5b74890b242F37Ae24E1F41440", 1287: '0x19040fC4c40863F0af606e21E6d1CEef80958858'};
const NEW_PYLON_FACTORY = {1285: "0x3dA19d8f9f1208f844edE1b6Ac6caF2c14a318bD", 1287: '0xE41d18e55372A4e55bC0647186A322B84a5EE1C7'};
const FACTORY = {1285: "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", 1287: '0xeEec0dEaC43918612319C24774923f04F8A6f284'};
const PT_FACTORY = {1285: "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54", 1287: '0x3EbB4d256C123D9bBccabcfB4cBd0c89A569F867'};

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
    let energyInstance2 = factoryEnergy.attach(NEW_ENERGY_FACTORY[chainId]); //await factoryEnergy.deploy(FEE_TO_SETTER_ADDRESS[chainId], MIGRATOR_ADDRESS[chainId]);
    console.log("NEW ENERGY", energyInstance2.address)
    //
    // await energyInstance2.deployed();

    // OLD PYLON FACTORY
    let pylonFactory = await ethers.getContractFactory("ZirconPylonFactory")
    let pylonInstance = pylonFactory.attach(PYLON_FACTORY[chainId])


    // Genesis PYLON FACTORY
    let genesisPylonInstance = pylonFactory.attach(GENESIS_PYLON_FACTORY[chainId])

    // FACTORY
    let zFacatoryContract = await ethers.getContractFactory("ZirconFactory")
    let zFactory = zFacatoryContract.attach(FACTORY[chainId])

    // Getting all the pairs
    let allPairsLength = await zFactory.allPairsLength()

    // NEW PYLON FACTORY
    let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory');
    //
    let newFactoryPylonInstance = factoryPylon.attach(NEW_PYLON_FACTORY[chainId])
    //     await factoryPylon.deploy(
    //         FACTORY[chainId],
    //         energyInstance2.address,
    //         PT_FACTORY[chainId],
    //         FEE_TO_SETTER_ADDRESS[chainId],
    //         MIGRATOR_ADDRESS[chainId])
    // await newFactoryPylonInstance.deployed();

    console.log("NEW PYLON FACTORY", newFactoryPylonInstance.address)

    const migrate = async (token0, token1, pylonAddress, pair, genesisPylonAddress) => {
        // let energyRev = await pair.energyRevenueAddress()
        // let energyFactAddress = energyInstance2.address
        // console.log("Migrating...", pylonAddress, newFactoryPylonInstance.address, pair.address, token0, token1, energyFactAddress, energyRev)
        // return {pylonAddress, newPylonFactory: newFactoryPylonInstance.address, pairAddress: pair.address, token0, token1, energyFactAddress, energyRev}
        let oldEnergyRev = await pair.energyRevenueAddress()
        let checkAdd = await newFactoryPylonInstance.getPylon(token0, token1)
        if (checkAdd === "0x0000000000000000000000000000000000000000") {
            await migrator.migrate(newFactoryPylonInstance.address, energyInstance2.address, token0, token1, genesisPylonAddress === "0x0000000000000000000000000000000000000000" ? PYLON_FACTORY[chainId] : GENESIS_PYLON_FACTORY[chainId]);

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
    for (let i = 0; i < allPairsLength; i++) {
        let pairAddress = await zFactory.allPairs(i)
        let pairContract = await ethers.getContractFactory("ZirconPair")
        let pair = pairContract.attach(pairAddress)
        console.log("pair", pair.address)

        let token0 = await pair.token0()
        let token1 = await pair.token1()
        let pylonAddress = await pylonInstance.getPylon(token0, token1)
        let pylonAddress2 = await pylonInstance.getPylon(token1, token0)

        let genesisPylonAddress = await genesisPylonInstance.getPylon(token0, token1)
        let genesisPylonAddress2 = await genesisPylonInstance.getPylon(token1, token0)
        if (pylonAddress !== "0x0000000000000000000000000000000000000000") {
            console.log("Migrating pair", token0, token1, pylonAddress, genesisPylonAddress)
            pairsToMigrate.push(await migrate(token0, token1, pylonAddress, pair))
        }
        if (pylonAddress2 !== "0x0000000000000000000000000000000000000000") {
            console.log("Migrating pair 2", token0, token1, pylonAddress2, genesisPylonAddress2)
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
