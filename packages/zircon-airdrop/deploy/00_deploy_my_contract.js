const BigNumber = require('bignumber.js')

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    // console.log("1")
    // let amountAidrop = 80000000000000000000000000;
    const merkleRoot = "0x18fbd9ea64305f7eca8222ab4607efc8bc806684d977e7bb43ca9ec4d001491c";
    // const amount = new BigNumber(amountAidrop).toFixed();
    // // console.log(deployer)
    // /// Deploy Energy
    // let zTokeen = await deploy('ZirconToken', {
    //     from: deployer,
    //     args: [deployer],
    //     log: true
    // });
    // console.log(deployer)

    let dropInstance = await deploy('ZirconDrop', {
        from: deployer,
        args: ["0x4545E94974AdACb82FC56BCf136B07943e152055", merkleRoot, 1663223294, 1672444800],
        log: true
    });

    // console.log(deployer)

    // let pairContract = await ethers.getContractFactory("ZirconToken");
    // let token = await pairContract.attach(zTokeen.address);
    // await token.mint(dropInstance.address, amount);
};
module.exports.tags = ['Airdrop'];
