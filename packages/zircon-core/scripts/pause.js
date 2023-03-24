async function pauseContract() {
    // Deploy Pylon Router
    let fts = await ethers.getContractFactory('ZirconPylonFactory', {
        libraries: {
            ZirconLibrary: "0xcF191Dea384F2f2fcA2b73eaE951F9Ee4E7Ec389"
        }
    });
    // function initialize(address factory_, address energyFactory_, address pylonFactory_) public onlyOwner {
    let ft = fts.attach("0x09f8E0aeA93Bcb511276A166e6e57E02e5cc1E0a")

    // await (await ft.initialize("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", "0x2b0B3E7B54C3C551A09b01536a52F1DcD1c20405", "0xD424f1312D870d16D2526Ef4e87dDbcd6ca28d2f")).wait()

    let paused = await ft.paused()
    console.log("paused", paused)
}

pauseContract()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
