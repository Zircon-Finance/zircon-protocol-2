module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    /// Deploy Factory
    let factoryInstance = await deploy('ZirconFactory', {
        from: deployer,
        args: [deployer],
        log: true
    });

    /// Deploy Energy
    let energyInstance = await deploy('ZirconEnergyFactory', {
        from: deployer,
        args: null,
        log: true
    });

    /// Deploy Pylon
    await deploy('ZirconPylonFactory', {
        from: deployer,
        args: [factoryInstance.address, energyInstance.address],
        log: true
    });


    //
    // //Deploy Router passing Factory Address and WETH Address
    // const router = await ethers.getContractFactory('ZirconRouter');
    // const routerInstance = await router.deploy(
    //     factoryInstance.address,
    //     wethInstance.address
    // );
    // await routerInstance.deployed();
    //
    // console.log(`Router V02 deployed to :  ${routerInstance.address}`);
    //
    // //Deploy Multicall (needed for Interface)
    // const multicall = await ethers.getContractFactory('Multicall');
    // const multicallInstance = await multicall.deploy();
    // await multicallInstance.deployed();
    //
    // console.log(`Multicall deployed to : ${multicallInstance.address}`);
    //
    // //Deploy Tokens
    // const tok1 = await ethers.getContractFactory('Token');
    // const tok1Instance = await tok1.deploy('Token1', 'TOK1');
    //
    // console.log(`Token1 deployed to : ${tok1Instance.address}`);
    //
    // const tok2 = await ethers.getContractFactory('Token');
    // const tok2Instance = await tok2.deploy('Token2', 'TOK2');
    //
    // console.log(`Token2 deployed to : ${tok2Instance.address}`);
    //
/// Deploy Wrapped Ethereum
//     let wethInstance = await deploy('WETH', {
//         from: deployer,
//         log: true,
//     });
    // // Deploy Pylon Router
    // let peripheralLibrary = await (await ethers.getContractFactory('ZirconPeripheralLibrary')).deploy();
    // let pylonRouterContract = await ethers.getContractFactory('ZirconPylonRouter', {
    //     libraries: {
    //         ZirconPeripheralLibrary: peripheralLibrary.address,
    //     },
    // });
    // let pRouterInstance = await pylonRouterContract.deploy(factoryInstance.address, factoryPylonInstance.address, wethInstance.address)
    //
    // console.log(`Pylon Router deployed to : ${pRouterInstance.address}`);
};
module.exports.tags = ['CoreFactories'];
