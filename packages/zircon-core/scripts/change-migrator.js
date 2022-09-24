const FEE_TO_SETTER_ADDRESS = "0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce";
const MIGRATOR_ADDRESS = "0x9AEF9098af9d1E2d78FCd9B928C946a7f23307d3";
const ENERGY_FACTORY = "0x168C95536C77Be5400EED2AEEE21ef64D9c8CA2E";
const PYLON_FACTORY = "0x1153550210Bbef5b74890b242F37Ae24E1F41440";
const FACTORY = "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd";
const PT_FACTORY = "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54";

async function migrateMigrator() {
    // Deploy Pylon Router
    let migratorFactory = await ethers.getContractFactory('Migrator');
    let newMigrator = migratorFactory.attach("0xd59b742283F8018f6414c8DF4eE2627999b764F3")
    await newMigrator.initialize(ENERGY_FACTORY, PT_FACTORY, PYLON_FACTORY, FACTORY)

    await newMigrator.changeEnergyFactoryAddress(ENERGY_FACTORY)

}

migrateMigrator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
