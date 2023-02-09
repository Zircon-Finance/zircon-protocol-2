const {BigNumber} =  require("ethers");

async function changeFees() {
    // Deploy Pylon Router
    // let pylonFactory = await ethers.getContractFactory('ZirconPylonFactory');

    // let pylon = pylonFactory.attach("0x3dA19d8f9f1208f844edE1b6Ac6caF2c14a318bD")
    // console.log("pylon", (await pylon.maximumPercentageSync()).toString())
    let pylonFactory = await ethers.getContractFactory('FeeToSetter');
    let ft = pylonFactory.attach("0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce")

    // let ft = pylonFactory.attach("0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce")
    // console.log(BigNumber.from("40000000000000000").toHexString())
    // 0x8e1bc9bf040000
    // await ft.initialize("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", "0x9b38fD03fAf64Dcc5F1da1101326a072092420A8", "0x3dA19d8f9f1208f844edE1b6Ac6caF2c14a318bD")
    // await ft.setFees(30, BigNumber.from("40000000000000000") , 100, 240, 3, 2);

    await ft.setLiquidityFee(15);

}

changeFees()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
