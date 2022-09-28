const {BigNumber} =  require("ethers");

async function changeFees() {
    // Deploy Pylon Router
    let pylonFactory = await ethers.getContractFactory('ZirconPylonFactory');
    let pylon = pylonFactory.attach("0xe9DB6Edc6b4330e7C06f5A7F79822C1361d38548")
    console.log("pylon", (await pylon.maximumPercentageSync()).toString())
    // let pylonFactory = await ethers.getContractFactory('FeeToSetter');
    // // let ft = pylonFactory.attach("0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce")
    // let ft = pylonFactory.attach("0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce")
    // // console.log(BigNumber.from("40000000000000000").toHexString())
    // //0x8e1bc9bf040000
    // // await ft.initialize("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", "0x49e15A5ea67FD7ebe70EB539a51abf1919282De8", "0xe9DB6Edc6b4330e7C06f5A7F79822C1361d38548")
    // await ft.setFees(30, BigNumber.from("40000000000000000") , 100, 240, 3, 2);
}

changeFees()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
