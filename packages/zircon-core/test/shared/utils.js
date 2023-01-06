const {ethers} = require("hardhat");
const {BigNumber} = require("ethers");

const DECIMALS = ethers.BigNumber.from(10).pow(18)

exports.expandTo18Decimals = function expandTo18Decimals(n) {

    // console.log("Debug: n ", n);

    let num = n * 10**9

    // console.log("Debug: num ", num);
    // console.log("Debug: exp result: ", (ethers.BigNumber.from(10).pow(9)).mul(num))

    return (ethers.BigNumber.from(10).pow(9)).mul(num)}

exports.getAmountOut = function getAmountOut(amountIn, reserveIn, reserveOut) {
    let amounInWithFees = amountIn.mul(ethers.BigNumber.from("997"))
    let numerator = amounInWithFees.mul(reserveOut);
    let denominator = reserveIn.mul(ethers.BigNumber.from("1000")).add(amounInWithFees);
    return numerator.div(denominator);
}

exports.format = function format(num) {
    return ethers.utils.formatEther(num);
}

exports.sqrt = function sqrt(x) {

    let z = x.add(1).div(2);
    let y = x;
    while (z.sub(y).isNegative()) {
        y = z;
        z = x.div(z).add(z).div(2);
    }
    return y;
}

exports.findDeviation = function findDeviation(value1, value2) {

    let ratio = value1.mul(DECIMALS).div(value2);
    let deviation;
    if(ratio > DECIMALS) {
        deviation = ratio.sub(DECIMALS);
    } else {
        deviation = DECIMALS.sub(ratio);
    }

    return deviation

}

exports.calculateOmega = function calculateOmega(gamma, reserve1, vab, syncReserve1) {
    return (ethers.BigNumber.from('1000000000000000000').sub(gamma)).mul(reserve1.mul(2)).div(vab.sub(syncReserve1));
}

//function sqrt(value) {
//     x = ethers.BigNumber.from(value);
//     let z = x.add(ONE).div(TWO);
//     let y = x;
//     while (z.sub(y).isNegative()) {
//         y = z;
//         z = x.div(z).add(z).div(TWO);
//     }
//     return y;
// }




//function sqrt(uint y) internal pure returns (uint z) {
//         if (y > 3) {
//             z = y;
//             uint x = y / 2 + 1;
//             while (x < z) {
//                 z = x;
//                 x = (y / x + x) / 2;
//             }
//         } else if (y != 0) {
//             z = 1;
//         }
//     }