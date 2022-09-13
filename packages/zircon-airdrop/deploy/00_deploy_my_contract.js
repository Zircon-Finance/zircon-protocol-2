const BigNumber = require('bignumber.js')

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    // console.log("1")
    let amountAidrop = 80000000000000000000000000;
    const merkleRoot = "0x9bcae9bbdb41b512e4678ffbd2ae05e8807cda3f2b1289170f90a37744f61222";
    const amount = new BigNumber(amountAidrop).toFixed();
    // console.log(deployer)
    /// Deploy Energy
    let zTokeen = await deploy('ZirconToken', {
        from: deployer,
        args: [deployer],
        log: true
    });
    console.log(deployer)

    let dropInstance = await deploy('ZirconDrop', {
        from: deployer,
        args: [zTokeen.address, merkleRoot, 1662810318, 1663415118],
        log: true
    });

    console.log(deployer)

    let pairContract = await ethers.getContractFactory("ZirconToken");
    let token = await pairContract.attach(zTokeen.address);

    await token.mint(dropInstance.address, amount);

};
module.exports.tags = ['Airdrop'];
