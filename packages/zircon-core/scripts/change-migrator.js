const hre = require('hardhat');
const {
    LIB_ADDRESS,
    MIGRATOR_ADDRESS,
    FEE_TO_SETTER_ADDRESS,
    PYLON_FACTORY,
    FACTORY,
    PT_FACTORY,
    ENERGY_FACTORY
} = require("./constants");

async function migrateMigrator() {
    const chainId = hre.network.config.chainId

    //0xec89E7389Cfa95A801f8ddC18dA92C1165280971
    // Deploy Pylon Router
    // let ptFactory = await ethers.getContractFactory('ZirconPTFactory');
    // let pfi = ptFactory.attach("0x3EbB4d256C123D9bBccabcfB4cBd0c89A569F867")
    // let pt = await pfi.getPoolToken("0xC5B263bbB3F75649Ef5e91d35447a7a46c9db96B", "0xed13B028697febd70f34cf9a9E280a8f1E98FD29")
    //
    // let poolToken = await ethers.getContractFactory('ZirconPoolToken');
    // let pti = poolToken.attach(pt)
    // console.log(await pti.pylonFactory())
    let eFactory = await ethers.getContractFactory('ZirconFactory');
    let fFactory = await ethers.getContractFactory('ZirconFactory');
    let efi = eFactory.attach(ENERGY_FACTORY[chainId])
    let ffi = fFactory.attach(FACTORY[chainId])
    let pfi = fFactory.attach(PYLON_FACTORY[chainId])
    let ptfi = fFactory.attach(PT_FACTORY[chainId])
    //
    await (await efi.setMigrator(MIGRATOR_ADDRESS[chainId])).wait()
    await (await ffi.setMigrator(MIGRATOR_ADDRESS[chainId])).wait()
    await (await pfi.setMigrator(MIGRATOR_ADDRESS[chainId])).wait()
    await (await ptfi.setMigrator(MIGRATOR_ADDRESS[chainId])).wait()
    console.log("migra", await ptfi.migrator(), await ffi.migrator())
    //
    return
    let migratorFactory = await ethers.getContractFactory('Migrator');
    let oldMigrator = await migratorFactory.attach("0x1268997b6AEB2b4e8401e4F6e2A7B622A1E5b665")
    let newMigrator = await migratorFactory.attach("0xEc0D854E2fCF52F2DB04b5E1eB3C445B8Cfbe7BD")

    // console.log("newMigrator", await newMigrator.energyFactory(), await newMigrator.ptFactory(), await newMigrator.pylonFactory(), await newMigrator.pairFactory())
    // await(await oldMigrator.initialize(ENERGY_FACTORY[chainId], PT_FACTORY[chainId], PYLON_FACTORY[chainId], FACTORY[chainId])).wait()
    console.log("old migrator initialized")
    await(await newMigrator.initialize(ENERGY_FACTORY[chainId], PT_FACTORY[chainId], PYLON_FACTORY[chainId], FACTORY[chainId])).wait()
    await(await oldMigrator.setMigrator(newMigrator.address)).wait()
    console.log("setting new migrator")
    console.log("initializing new migrator")

    // await newMigrator.changeEnergyFactoryAddress(ENERGY_FACTORY)

    console.log("oldmig, new mig ", oldMigrator.address, newMigrator.address)

    // await newMigrator.setPylonMigrator(oldMigrator.address)
    // await oldMigrator.setMigrator(newMigrator.address)
    console.log("completed...")
}

migrateMigrator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
