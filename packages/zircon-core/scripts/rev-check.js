
const {BigNumber} =  require("ethers");

const poolInfo = [ //floatToken, anchorToken, Name
    ['0x4545E94974AdACb82FC56BCf136B07943e152055',	'0x98878b06940ae243284ca214f92bb71a2b032b8a', "ZRG/MOVR", 18],
    ['0x4545E94974AdACb82FC56BCf136B07943e152055',	'0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C', "ZRG/ETH", 18],
    ['0x4545E94974AdACb82FC56BCf136B07943e152055',	'0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D', "ZRG/USDC", 6],
    ['0x4545E94974AdACb82FC56BCf136B07943e152055',	'0xFfFFfFff1FcaCBd218EDc0EbA20Fc2308C778080', "ZRG/KSM", 12],
    ['0x98878B06940aE243284CA214f92Bb71a2b032B8A',	'0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D', "MOVR/USDC", 6],
    ['0x98878B06940aE243284CA214f92Bb71a2b032B8A',	'0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C', "MOVR/ETH", 18],
    ['0x98878B06940aE243284CA214f92Bb71a2b032B8A',	'0xFfFFfFff1FcaCBd218EDc0EbA20Fc2308C778080', "MOVR/KSM", 12],
    ['0xFfFFfFff1FcaCBd218EDc0EbA20Fc2308C778080',	'0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D', "KSM/USDC", 6],
    ['0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C',	'0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D', "ETH/USDC", 6],
    ['0x6Ccf12B480A99C54b23647c995f4525D544A7E72',	'0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D', "LDO/USDC", 6],
    ['0x6Ccf12B480A99C54b23647c995f4525D544A7E72',	'0x98878B06940aE243284CA214f92Bb71a2b032B8A', "LDO/MOVR", 18],
    ['0xbb8d88bcd9749636bc4d2be22aac4bb3b01a58f1',	'0x98878B06940aE243284CA214f92Bb71a2b032B8A', "MFAM/MOVR", 18],
    ['0xffffffff893264794d9d57e1e0e21e0042af5a0a',	'0x98878B06940aE243284CA214f92Bb71a2b032B8A', "RMRK/MOVR", 18],
    ['0xFFFfFfFfF6E528AD57184579beeE00c5d5e646F0',	'0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D', "kBTC/USDC", 6],
];

const withdraw = false;
const withdrawalAddress = "0xb6932ae987775Fc317737D35e9df3Cb7CCC9CFEC"


async function check() {
    //Deploy Pylon Router
    let energyFactory = await ethers.getContractFactory('ZirconEnergyFactory');
    let ft1 = energyFactory.attach("0xFc413b0b8481eeBCf335Eb35B1A7a634fef64649");

    let pairFactory = await ethers.getContractFactory('ZirconFactory');
    let pairFactoryInstance = pairFactory.attach("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd");

    let feeToSetter = await ethers.getContractFactory('FeeToSetter');
    let ftInstance = feeToSetter.attach("0x4bA754989b77925F47e26C54aaa1b03Df23B32Ce")

    await ftInstance.initialize("0x6B6071Ccc534fcee7B699aAb87929fAF8806d5bd", "0xFc413b0b8481eeBCf335Eb35B1A7a634fef64649", "0x65815a6e55fA08fcdE76ad772Bd64A4F264a6924")

    //console.log("", poolInfo);

    for (const pool of poolInfo) {

        const [floatToken, anchorToken, name, decimals] = pool;
        // console.log("pool", pool);
        // console.log("floatToken, anchorToken, name", floatToken, anchorToken, name);

        let energyRev = await ft1.getEnergyRevenue(floatToken, anchorToken);
        let pairAddress = await pairFactoryInstance.getPair(floatToken, anchorToken);

        let pairInstance = (await ethers.getContractFactory('ZirconPair')).attach(pairAddress);
        // let energy = await ft1.getEnergy("0x4545E94974AdACb82FC56BCf136B07943e152055", "0x98878b06940ae243284ca214f92bb71a2b032b8a")
        console.log("\n\n==========", name);
        console.log("energyRev addr", energyRev);
        let energyRevInstance = (await ethers.getContractFactory('ZirconEnergyRevenue')).attach(energyRev);
        let energyForRev = await energyRevInstance.energyFactory();
        console.log("energyForRev", energyForRev);

        let ptt = await pairInstance.totalSupply();
        let energyBalance = await pairInstance.balanceOf(energyRev);

        let reserves = await pairInstance.getReserves();
        let isFloatToken0 = await pairInstance.token0() == floatToken;

        let anchorTokenInstance = (await ethers.getContractFactory('ZirconERC20')).attach(anchorToken);

        let anchorBalance = await anchorTokenInstance.balanceOf(energyRev);

        console.log("anchorBalance", ethers.utils.formatEther(anchorBalance))
        console.log("pairBalance", ethers.utils.formatEther(energyBalance))

        let valueInAnchor = isFloatToken0 ? reserves[1].mul(energyBalance).mul(2).div(ptt) : reserves[0].mul(energyBalance).mul(2).div(ptt);

        valueInAnchor = valueInAnchor.add(anchorBalance);
        console.log("erev", energyRev)

        if(withdraw) {
            //Remember to check addresses

            if(energyBalance.gt(BigNumber.from("0"))) {
                await ftInstance.getFees(pairAddress, energyBalance, withdrawalAddress, energyRev)
            } else {
                console.log("Zero Pair Balance")
            }

            if(anchorBalance.gt(BigNumber.from("0"))) {
                await ftInstance.getFees(anchorToken, anchorBalance, withdrawalAddress, energyRev)
            } else {
                console.log("Zero Anchor Balance")
            }
            // await energyRevInstance.getFees(pairAddress, energyBalance, withdrawalAddress)

            // await energyRevInstance.getFees(anchorToken, anchorBalance, withdrawalAddress)
            console.log("transferred pool tokens:", ethers.utils.formatEther(energyBalance));
            console.log("transferred anchor tokens:", ethers.utils.formatEther(anchorBalance));
        }

        let decimalsDiff = 18 - decimals;
        valueInAnchor = valueInAnchor.mul(10 ** decimalsDiff);
        console.log("valueInAnchor", ethers.utils.formatEther(valueInAnchor));
        console.log("===END ", name);


    }




    // address oldEnergyRev = IZirconEnergyFactory(energyFactory).getEnergyRevenue(_tokenA, _tokenB);
    // address oldEnergy = IZirconEnergyFactory(energyFactory).getEnergy(_tokenA, _tokenB);

    // let migrator = await ethers.getContractFactory('Migrator');
    // let migratorInstance = migrator.attach("0x6B722a4835055BE4DEcFb28646D5C2D9dFE43eFd")
    // console.log("ft1",await migratorInstance.energyFactory(), await migratorInstance.ptFactory(),  await migratorInstance.pylonFactory(), await migratorInstance.pairFactory())

    // let pylonAbi = await ethers.getContractFactory('ZirconPylon');
    // let ft = pylonAbi.attach("0xdd7b7849002cf2fd1eb5b659bda209132ddd19d0")
    //
    // let vab = await ft.virtualAnchorBalance()
    // let fs = await ft.formulaSwitch()
    // let akv = await ft.anchorKFactor()
    // let lastRootKTranslated = await ft.lastRootKTranslated()
    // let gammaMulDecimals = await ft.gammaMulDecimals()
    // let muMulDecimals = await ft.muMulDecimals()
    // let gammaEMA = await ft.gammaEMA()
    // let thisBlockEMA = await ft.thisBlockEMA()
    // let strikeBlock = await ft.strikeBlock()
    // let EMABlockNumber = await ft.EMABlockNumber()
    //
    // console.log("vab", vab.toString())
    // console.log("formulaSwitch", fs.toString())
    // console.log("anchorK", akv.toString())
    // console.log("gamma", gammaMulDecimals.toString())

}

check()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
