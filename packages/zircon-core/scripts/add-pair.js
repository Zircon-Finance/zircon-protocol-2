const { ethers } = require('hardhat');
async function eaTest() {
    let energyFactory = await ethers.getContractFactory('ZirconEnergyFactory')
    let ea = await energyFactory.attach("0xe2522E34d2eDAbEd507A8b975ae8d7bf4CBe40ff")
    let eaA = await ea.getEnergy( "0xe75F9ae61926FF1d27d16403C938b4cd15c756d5", "0xed13B028697febd70f34cf9a9E280a8f1E98FD29")

    console.log("balances: ", eaA.toString())
}

async function test() {
    let erc20 = await ethers.getContractFactory('ERC20')
    let erc20Token = await erc20.attach("0x08B40414525687731C23F430CEBb424b332b3d35")
    let balance = await erc20Token.balanceOf("0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    let erc20Token2 = await erc20.attach("0x08B40414525687731C23F430CEBb424b332b3d35")
    let balance2 = await erc20Token2.balanceOf("0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161")

    console.log("balances: ", balance.toString(), balance2.toString())
}
function getAmountOut(amountIn, reserveIn, reserveOut) {
    let amounInWithFees = amountIn.mul(ethers.BigNumber.from("997"))
    let numerator = amounInWithFees.mul(reserveOut);
    let denominator = reserveIn.mul(ethers.BigNumber.from("1000")).add(amounInWithFees);
    return numerator.div(denominator);
}
async function createPairPylon(t, t0, factoryInstance, factoryPylonInstance) {
    let tok = await ethers.getContractFactory('Token');
    let tk0 = await tok.attach(t);
    let tk1 = await tok.attach(t0);
    let lpAddress = await factoryInstance.getPair(tk0.address, tk1.address)
    if (lpAddress == "0x0000000000000000000000000000000000000000") {
        await factoryInstance.createPair(tk0.address, tk1.address, factoryPylonInstance.address);
        lpAddress = await factoryInstance.getPair(tk0.address, tk1.address)
    }
    console.log("Pair Address: ", lpAddress)
    let pairContract = await ethers.getContractFactory("ZirconPair");
    let pair = await pairContract.attach(lpAddress);

    const token0Address = await pair.token0();
    let token0 = tk0.address === token0Address ? tk0 : tk1
    let token1 = tk1.address === token0Address ? tk0 : tk1


    let pylonAddress = await factoryPylonInstance.getPylon(token0.address, token1.address)
    if (pylonAddress == "0x0000000000000000000000000000000000000000") {
        await factoryPylonInstance.addPylon(lpAddress, token0.address, token1.address);
        pylonAddress = await factoryPylonInstance.getPylon(token0.address, token1.address)
    }

    let pylonAddress2 = await factoryPylonInstance.getPylon(token1.address, token0.address)
    if (pylonAddress2 == "0x0000000000000000000000000000000000000000") {
        await factoryPylonInstance.addPylon(lpAddress, token1.address, token0.address);
        pylonAddress2 = await factoryPylonInstance.getPylon(token1.address, token0.address)
    }

    let pylonContract = await ethers.getContractFactory("ZirconPylon");
    let pylon = await pylonContract.attach(pylonAddress);
    let pylon1 = await pylonContract.attach(pylonAddress2);

    // await initialize(token0, token1, pair, pylon)
    await initialize(token1, token0, pair, pylon1)
}

async function initialize(tk0, tk1, pair, pylonInstance) {
    console.log("Initializing Pylon: ", pylonInstance.address)
    let account = "0x10AD3b25F0CD7Ed4EA01A95d2f1bf9E4bE987161"
    let balance = await tk0.balanceOf(account)
    console.log("balance: ", balance.toString())
    await tk0.transfer(pair.address, "2000000000000000")
    await tk1.transfer(pair.address, "10000000000000000")
    await pair.mint(account)
    console.log("minted")
    // Let's transfer some tokens to the Pylon
    await tk0.transfer(pylonInstance.address, "20000000000000")
    await tk1.transfer(pylonInstance.address, "1000000000000000")
    //Let's initialize the Pylon, this should call two sync
    await pylonInstance.initPylon(account)
    console.log("initialized")
    await tk0.transfer(pylonInstance.address, "2000")
    let outcome = getAmountOut(input, "200000000000000", "1000000000000000")
    await pair.swap(0, outcome, account, '0x', overrides)
    console.log("swapped")
    await tk1.transfer(pylonInstance.address, "2000")
    await pylonInstance.mintPoolTokens(account, false)
    console.log("minted")

}

// Add Pair Function
async function addPair() {
    // Getting factory instance
    let factory = await ethers.getContractFactory('ZirconFactory');
    let factoryInstance = await factory.attach("0x6D934416741C25aA2C87Fe9D35757a41820a046d");

    // Getting Pylon Factory Instance
    let factoryPylon = await ethers.getContractFactory('ZirconPylonFactory');
    let factoryPylonInstance = await factoryPylon.attach("0x8D40Ac43Ef276493DF8b2E71C18442DC3CE2E121");

    // Deploy Tokens
    await createPairPylon("0xD909178CC99d318e4D46e7E66a972955859670E1", "0xd9224c102A73e5941aBfCd645e08623dC4d182bc", factoryInstance, factoryPylonInstance)
    await createPairPylon("0xD909178CC99d318e4D46e7E66a972955859670E1", "0x9Aac6FB41773af877a2Be73c99897F3DdFACf576", factoryInstance, factoryPylonInstance)
}

addPair()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
