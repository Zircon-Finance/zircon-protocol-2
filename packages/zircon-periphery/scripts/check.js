async function check() {
    // Deploy Pylon Router
    //0xD62D8D7e8b457020f222d45565a0b1E6C0194232
    let pylonRouter = await ethers.getContractFactory('ZirconPylonRouter', {
        libraries: {
            ZirconPeripheralLibrary: "0xD62D8D7e8b457020f222d45565a0b1E6C0194232"
        }
    });
    let ft = pylonRouter.attach("0x189DbefB2283E9B91b66841f566820dd320C6b13")
    let fact = await ft.pylonFactory()
    console.log("pylonFactory", fact)
}

check()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
