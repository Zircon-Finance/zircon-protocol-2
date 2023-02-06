const hre = require('hardhat');

const FEE_TO_SETTER_ADDRESS = {1285: "0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce", 1287: '0xbCea98Df85045F2Fcf5310fE4237ca95C9C24622'};
const MIGRATOR_ADDRESS = {1285: "0x03209097D62b3EB7e62b2dB13Bb2729A3431F437", 1287: '0xEc0D854E2fCF52F2DB04b5E1eB3C445B8Cfbe7BD'};
const ENERGY_FACTORY = {1285: "0x49e15A5ea67FD7ebe70EB539a51abf1919282De8", 1287: '0xE18971aCa01B0928cAF04a9668E469FD5308c1e8'};
const NEW_ENERGY_FACTORY = {1285: "0x9b38fD03fAf64Dcc5F1da1101326a072092420A8", 1287: '0x9A747f8cF3A9aD39B7A5770B694160A56c86a592'};
const PYLON_FACTORY = {1285: "0xe9DB6Edc6b4330e7C06f5A7F79822C1361d38548", 1287: '0xa6D2b86AAB2C51B55a9174e80c88E5417D2EdB6E'};
const GENESIS_PYLON_FACTORY = {1285: "0x1153550210Bbef5b74890b242F37Ae24E1F41440", 1287: '0x19040fC4c40863F0af606e21E6d1CEef80958858'};
const NEW_PYLON_FACTORY = {1285: "0x3dA19d8f9f1208f844edE1b6Ac6caF2c14a318bD", 1287: '0xE41d18e55372A4e55bC0647186A322B84a5EE1C7'};
const FACTORY = {1285: "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", 1287: '0x60EB2D9fb42450438187D119af32f30C914d6006'};
const PT_FACTORY = {1285: "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54", 1287: '0x66eB144fAc83F5c13735649f5E665Bd6112DDCd9'};

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
    // await (await efi.setMigrator(MIGRATOR_ADDRESS[chainId])).wait()
    // await (await ffi.setMigrator(MIGRATOR_ADDRESS[chainId])).wait()
    // await (await pfi.setMigrator(MIGRATOR_ADDRESS[chainId])).wait()
    // await (await ptfi.setMigrator(MIGRATOR_ADDRESS[chainId])).wait()
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
