async function pauseContract() {
    // Deploy Pylon Router
    let fts = await ethers.getContractFactory('FeeToSetter');
    // function initialize(address factory_, address energyFactory_, address pylonFactory_) public onlyOwner {
    let ft = fts.attach("0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce")

    await (await ft.initialize("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", "0x2b0B3E7B54C3C551A09b01536a52F1DcD1c20405", "0xD424f1312D870d16D2526Ef4e87dDbcd6ca28d2f")).wait()

    await ft.setPaused(true);
}

pauseContract()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
