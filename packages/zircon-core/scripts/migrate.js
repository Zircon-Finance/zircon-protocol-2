const FEE_TO_SETTER_ADDRESS = "0xbCea98Df85045F2Fcf5310fE4237ca95C9C24622";
const MIGRATOR_ADDRESS = "0x49675A06F3D243583ecDD55C7FAf26F9b4aD9200";
const ENERGY_FACTORY = "0xe2522E34d2eDAbEd507A8b975ae8d7bf4CBe40ff";
const PYLON_FACTORY = "0x19040fC4c40863F0af606e21E6d1CEef80958858";
const FACTORY = "0xeEec0dEaC43918612319C24774923f04F8A6f284";
const PT_FACTORY = "0x3EbB4d256C123D9bBccabcfB4cBd0c89A569F867";

const PAIRS = [
    {
        token0: "0x37822de108AFFdd5cDCFDaAa2E32756Da284DB85",
        token1: "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5",
    },
]

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
    let migrator = migratorContract.attach(MIGRATOR_ADDRESS)

    // Updating Factory with new addresses
    await migrator.updateFactories(ENERGY_FACTORY, PT_FACTORY, PYLON_FACTORY, FACTORY)


    // OLD ENERGY
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let energyInstance = factoryEnergy.attach(ENERGY_FACTORY);

    var fs = require('fs');
    var obj = JSON.parse(fs.readFileSync('myjsonfile.json', 'utf8'));
    for (var i = obj.length-9; i >= 0; i--) {
        await migration(obj[i].pylonAddress, obj[i].newPylonFactory, obj[i].pairAddress, obj[i].token0, obj[i].token1, obj[i].energyFactAddress, obj[i].energyRev, migrator, energyInstance)
    }
}

const migratePylon = async () => {

    // MIGRATOR
    let migratorContract = await ethers.getContractFactory("Migrator")
    let migrator = migratorContract.attach(MIGRATOR_ADDRESS)


    // Updating Factory with new addresses
    await migrator.updateFactories(ENERGY_FACTORY, PT_FACTORY, PYLON_FACTORY, FACTORY)

    // OLD ENERGY
    let factoryEnergy = await ethers.getContractFactory('ZirconEnergyFactory');
    let energyInstance = factoryEnergy.attach(ENERGY_FACTORY);
    // NEW ENERGY 0x625ad88bb31E7119E963F2C718C9419c23Cd6F10
    // NEW PYLON FACTORY 0x3fBb6ed3b8384fDdC18501BB62Ff3AdF50490E89
    // NEW ENERGY
    let energyInstance2 = factoryEnergy.attach("0x625ad88bb31E7119E963F2C718C9419c23Cd6F10")//await factoryEnergy.deploy(FEE_TO_SETTER_ADDRESS, MIGRATOR_ADDRESS);
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

    let newFactoryPylonInstance = factoryPylon.attach("0x3fBb6ed3b8384fDdC18501BB62Ff3AdF50490E89")

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
        await migrator.startNewPylon(pylonAddress, newFactoryPylonInstance.address, pair.address, token0, token1)

        let newPylonAddress;
        while (true) {
            newPylonAddress = await newFactoryPylonInstance.getPylon(token0, token1)
            if (newPylonAddress !== "0x0000000000000000000000000000000000000000") {
                break
            }else{
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

    let pairsToMigrate = []
    for (let i = 18; i < allPairs; i++) {
        let pairAddress = await zFactory.allPairs(i)
        let pairContract = await ethers.getContractFactory("ZirconPair")
        let pair = pairContract.attach(pairAddress)

        let token0 = await pair.token0()
        let token1 = await pair.token1()
        let pylonAddress = await pylonInstance.getPylon(token0, token1)
        let pylonAddress2 = await pylonInstance.getPylon(token1, token0)
        if (pylonAddress !== "0x0000000000000000000000000000000000000000") {
            console.log("Migrating pair", i)
            pairsToMigrate.push(await migrate(token0, token1, pylonAddress, pair))
        }
        if (pylonAddress2 !== "0x0000000000000000000000000000000000000000") {
            console.log("Migrating pair 2", i)
            pairsToMigrate.push(await migrate(token1, token0, pylonAddress2, pair))
        }
    }

    var fs = require('fs');
    fs.writeFile('myjsonfile.json', JSON.stringify(pairsToMigrate), 'utf8', ()=>{});

    // Updating Factory with new addresses
    // await migrator.updateFactories(energyInstance2.address, PT_FACTORY, PYLON_FACTORY, FACTORY)
}

const main = async () => {
    // FACTORY
    let zFacatoryContract = await ethers.getContractFactory("ZirconFactory")
    let zFactory = zFacatoryContract.attach(FACTORY)

    // Getting all the pairs
    let allPairs = await zFactory.allPairsLength()

    // Checking if pylon exist
    let pylonFactory = await ethers.getContractFactory("ZirconPylonFactory")
    let pylonInstance = pylonFactory.attach(PYLON_FACTORY)

    for (let i = 0; i < allPairs; i++) {
        let pairAddress = await zFactory.allPairs(i)
        let pairContract = await ethers.getContractFactory("ZirconPair")
        let pair = pairContract.attach(pairAddress)
        let token0 = await pair.token0()
        let token1 = await pair.token1()

        let pylonAddress = await pylonInstance.getPylon(await pair.token0(), await pair.token1())
        let pylonAddress2 = await pylonInstance.getPylon(await pair.token1(), await pair.token0())
        if (pylonAddress !== "0x0000000000000000000000000000000000000000") {
            console.log("Migrating pair", i)
            //await migratePylon()
            // FACTORY
            let ptFactory = await ethers.getContractFactory("ZirconPTFactory")
            let ptInstance = ptFactory.attach(PT_FACTORY)

            let anchorAddress = await ptInstance.getPoolToken(pylonAddress, token1); // IZirconPylon(oldPylon).anchorPoolTokenAddress();
            let floatAddress = await ptInstance.getPoolToken(pylonAddress, token0); //IZirconPylon(oldPylon).floatPoolTokenAddress();
            console.log("anchorAddress", anchorAddress)
            console.log("floatAddress", floatAddress)

            // let pylon = IZirconPylonFactory(newPylonFactory).addPylonCustomPT(_pairAddress, _tokenA, _tokenB, floatAddress, anchorAddress);
            // let energy = IZirconEnergyFactory(energyFactory).getEnergy(_tokenA, _tokenB); //IZirconPylon(pylon).energyAddress();
            //
            // let gamma = IZirconPylon(oldPylon).gammaMulDecimals();
            // let vab = IZirconPylon(oldPylon).virtualAnchorBalance();
            // let akf = IZirconPylon(oldPylon).anchorKFactor();
            // let fs = IZirconPylon(oldPylon).formulaSwitch();

        }
        if (pylonAddress2 !== "0x0000000000000000000000000000000000000000") {
            console.log("Migrating pair 2", i)
            //await migratePylon()
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}

migratePylon()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
