const generatedReal = require('../test/generatedReal')

const BigNumber = require('bignumber.js')

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const amountAidrop = 2558400000000000000000000;
    const merkleRoot = generatedReal.merkleRoot;
    const amount = new BigNumber(amountAidrop).toFixed();

    /// Deploy Energy
    let token = await deploy('TestTokenA', {
        from: deployer,
        args: [amount],
        log: true
    });

    let energyInstance = await deploy('ZirconDrop', {
        from: deployer,
        args: [token.address, merkleRoot,1656510596, 1756510596],
        log: true
    });


    let pairContract = await ethers.getContractFactory("TestTokenA");
    let pair = await pairContract.attach(token.address);

    await pair.transfer(energyInstance.address, amount);

};
module.exports.tags = ['CoreFactories'];
