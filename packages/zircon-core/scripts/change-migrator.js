const FEE_TO_SETTER_ADDRESS = "0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce";
const MIGRATOR_ADDRESS = "0x6B722a4835055BE4DEcFb28646D5C2D9dFE43eFd";
const ENERGY_FACTORY = "0x49e15A5ea67FD7ebe70EB539a51abf1919282De8";
const PYLON_FACTORY = "0xe9DB6Edc6b4330e7C06f5A7F79822C1361d38548";
const FACTORY = "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd";
const PT_FACTORY = "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54";

async function migrateMigrator() {
    // Deploy Pylon Router
    let migratorFactory = await ethers.getContractFactory('Migrator');
    // let oldMigrator = migratorFactory.attach("0x6B722a4835055BE4DEcFb28646D5C2D9dFE43eFd")
    let newMigrator = migratorFactory.attach("0x7276DCC889c92234B0d2D2562DD9fD0E94d24248")
    await newMigrator.initialize(ENERGY_FACTORY, PT_FACTORY, PYLON_FACTORY, FACTORY)
    // await newMigrator.changeEnergyFactoryAddress(ENERGY_FACTORY)

    // await oldMigrator.setMigrator(newMigrator.address)


}

migrateMigrator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
