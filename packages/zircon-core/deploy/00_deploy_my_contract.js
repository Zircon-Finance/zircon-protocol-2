const FEE_TO_SETTER_ADDRESS = {1285: "0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce", 1287: '0xbCea98Df85045F2Fcf5310fE4237ca95C9C24622'};
const MIGRATOR_ADDRESS = {1285: "0x03209097D62b3EB7e62b2dB13Bb2729A3431F437", 1287: '0xec89E7389Cfa95A801f8ddC18dA92C1165280971'};
const ENERGY_FACTORY = {1285: "0x49e15A5ea67FD7ebe70EB539a51abf1919282De8", 1287: '0x625ad88bb31E7119E963F2C718C9419c23Cd6F10'};
const NEW_ENERGY_FACTORY = {1285: "0x9b38fD03fAf64Dcc5F1da1101326a072092420A8", 1287: '0x9A747f8cF3A9aD39B7A5770B694160A56c86a592'};
const PYLON_FACTORY = {1285: "0xe9DB6Edc6b4330e7C06f5A7F79822C1361d38548", 1287: '0x3fBb6ed3b8384fDdC18501BB62Ff3AdF50490E89'};
const GENESIS_PYLON_FACTORY = {1285: "0x1153550210Bbef5b74890b242F37Ae24E1F41440", 1287: '0xbCea98Df85045F2Fcf5310fE4237ca95C9C24622'};
const NEW_PYLON_FACTORY = {1285: "0x3dA19d8f9f1208f844edE1b6Ac6caF2c14a318bD", 1287: '0xE41d18e55372A4e55bC0647186A322B84a5EE1C7'};
const FACTORY = {1285: "0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", 1287: '0xeEec0dEaC43918612319C24774923f04F8A6f284'};
const PT_FACTORY = {1285: "0x2D4ddeB8b183413e9D88A98Fa3Dd844e34D41c54", 1287: '0x3EbB4d256C123D9bBccabcfB4cBd0c89A569F867'};

module.exports = async ({getNamedAccounts, deployments, getChainId}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    let chainId = await getChainId()

    console.log("REMEMBER TO CHANGE THE BYTECODES IN THE CONTRACT FILES!");
    console.log("\n\n 📡 Deploying...\n");

    /// Migrator
    // let migrator = await deploy('Migrator', {
    //     from: deployer,
    //     args: null,
    //     log: true
    // });

    /// Fee to setter
    // let feeToSetter = await deploy('FeeToSetter', {
    //     from: deployer,
    //     args: null,
    //     log: true
    // });
    //
    // // Deploy Energy
    let energyInstance = await deploy('ZirconEnergyFactory', {
        from: deployer,
        args: [FEE_TO_SETTER_ADDRESS[chainId], MIGRATOR_ADDRESS[chainId]],//MIGRATOR_ADDRESS[chainId]],
        log: true
    });
    // /// Deploy Energy
    // let ptFactoryInstance = await deploy('ZirconPTFactory', {
    //     from: deployer,
    //     args: [migrator.address, feeToSetter.address],
    //     log: true
    // });
    //
    // // Deploy Factory
    // let factoryInstance = await deploy('ZirconFactory', {
    //     from: deployer,
    //     args: [energyInstance.address, feeToSetter.address, migrator.address],
    //     log: true
    // });
    //
    // /// Deploy Pylon
    //
    let factoryPylonInstance = await deploy('ZirconPylonFactory', {
        from: deployer,
        args: [
            FACTORY[chainId],
            energyInstance.address,
            PT_FACTORY[chainId],
            FEE_TO_SETTER_ADDRESS[chainId],
            MIGRATOR_ADDRESS[chainId] //MIGRATOR_ADDRESS[chainId]
        ],
        log: true
    });

    // await feeToSetter.initialize(factoryInstance.address, energyInstance.address, factoryPylonInstance.address);
    // await migrator.initialize(energyInstance.address, ptFactoryInstance.address, factoryPylonInstance.address, factoryInstance.address);

    console.log("REMEMBER TO CHANGE THE BYTECODES IN THE CONTRACT FILES!");

};
module.exports.tags = ['CoreFactories'];
