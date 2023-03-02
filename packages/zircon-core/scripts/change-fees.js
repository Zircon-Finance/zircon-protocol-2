const {BigNumber} =  require("ethers");

async function changeFees() {
    // Deploy Pylon Router
    // let pylonFactory = await ethers.getContractFactory('ZirconPylonFactory');

    // let pylon = pylonFactory.attach("0x3dA19d8f9f1208f844edE1b6Ac6caF2c14a318bD")
    // console.log("pylon", (await pylon.maximumPercentageSync()).toString())
    let feeToSetter = await ethers.getContractFactory('FeeToSetter');
    let ft = feeToSetter.attach("0x92D818e3D6E3D3878266C8E8A41Da527F14dbaDf");

    // let ft = pylonFactory.attach("0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce")
    // console.log(BigNumber.from("40000000000000000").toHexString())
    // 0x8e1bc9bf040000
    // function initialize(address factory_, address energyFactory_, address pylonFactory_) public onlyOwner {
    // (await ft.initialize("0x18b7f6A60d5BEE3c3a953A3f213eEa25F7eF43E9", "0x91579032d558b5dcf12afB3987e142D6922746D6", "0x05d5E46F9d17591f7eaCdfE43E3d6a8F789Df698")).wait
    // function setFees(uint _maximumPercentageSync, uint _deltaGammaTreshold, uint _deltaGammaMinFee, uint _muUpdatePeriod, uint _muChangeFactor, uint _EMASamples, uint _oracleUpdate) external onlyOwner {
    // await ft.setFees(50, BigNumber.from("30000000000000000") , 100, 240, 3, 3, 60);

    await ft.setDynamicRatio(3);
    await ft.setFeePercentageRev(60);
    await ft.setFeePercentageEnergy(60);
}

changeFees()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
