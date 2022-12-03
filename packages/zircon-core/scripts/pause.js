async function pauseContract() {
    // Deploy Pylon Router
    let pylonFactory = await ethers.getContractFactory('FeeToSetter');
    let ft = pylonFactory.attach("0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce")

    await ft.setPaused(true);
}

pauseContract()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
