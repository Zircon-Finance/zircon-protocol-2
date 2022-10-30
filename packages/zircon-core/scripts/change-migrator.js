const hre = require('hardhat');

const FEE_TO_SETTER_ADDRESS = {1285: "0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce", 1287: '0xbCea98Df85045F2Fcf5310fE4237ca95C9C24622'};
const MIGRATOR_ADDRESS = {1285: "0x03209097D62b3EB7e62b2dB13Bb2729A3431F437", 1287: '0xec89E7389Cfa95A801f8ddC18dA92C1165280971'};
const ENERGY_FACTORY = {1285: "0x49e15A5ea67FD7ebe70EB539a51abf1919282De8", 1287: '0x625ad88bb31E7119E963F2C718C9419c23Cd6F10'};
const NEW_ENERGY_FACTORY = {1285: "0x9b38fD03fAf64Dcc5F1da1101326a072092420A8", 1287: '0x9A747f8cF3A9aD39B7A5770B694160A56c86a592'};
const PYLON_FACTORY = {1285: "0xe9DB6Edc6b4330e7C06f5A7F79822C1361d38548", 1287: '0x3fBb6ed3b8384fDdC18501BB62Ff3AdF50490E89'};
const GENESIS_PYLON_FACTORY = {1285: "0x1153550210Bbef5b74890b242F37Ae24E1F41440", 1287: '0x19040fC4c40863F0af606e21E6d1CEef80958858'};
const NEW_PYLON_FACTORY = {1285: "0x3dA19d8f9f1208f844edE1b6Ac6caF2c14a318bD", 1287: '0xE41d18e55372A4e55bC0647186A322B84a5EE1C7'};
const FACTORY = {1285: "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", 1287: '0xeEec0dEaC43918612319C24774923f04F8A6f284'};
const PT_FACTORY = {1285: "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54", 1287: '0x3EbB4d256C123D9bBccabcfB4cBd0c89A569F867'};


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
    // let eFactory = await ethers.getContractFactory('ZirconEnergyFactory');
    // let fFactory = await ethers.getContractFactory('ZirconFactory');
    // let efi = eFactory.attach("0x625ad88bb31E7119E963F2C718C9419c23Cd6F10")
    // let ffi = fFactory.attach("0xeEec0dEaC43918612319C24774923f04F8A6f284")
    let migratorFactory = await ethers.getContractFactory('Migrator');
    let oldMigrator = await migratorFactory.attach("0x6B722a4835055BE4DEcFb28646D5C2D9dFE43eFd")
    let newMigrator = await migratorFactory.attach("0xec89E7389Cfa95A801f8ddC18dA92C1165280971")
    // console.log("migra", await ffi.migrator(), await ffi.migrator())
    // console.log("newMigrator", await newMigrator.energyFactory(), await newMigrator.ptFactory(), await newMigrator.pylonFactory(), await newMigrator.pairFactory())
    await newMigrator.initialize(ENERGY_FACTORY[chainId], PT_FACTORY[chainId], PYLON_FACTORY[chainId], FACTORY[chainId])
    // await newMigrator.changeEnergyFactoryAddress(ENERGY_FACTORY)

    console.log("oldmig, new mig ", oldMigrator.address, newMigrator.address)

    await newMigrator.setPylonMigrator(oldMigrator.address)
    // await oldMigrator.setMigrator(newMigrator.address)
    console.log("completed...")
}

migrateMigrator()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
