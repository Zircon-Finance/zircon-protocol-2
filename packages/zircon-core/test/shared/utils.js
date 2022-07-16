const {ethers} = require("hardhat");

exports.expandTo18Decimals = function expandTo18Decimals(n) {return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(18))}

exports.getAmountOut = function getAmountOut(amountIn, reserveIn, reserveOut) {
    let amounInWithFees = amountIn.mul(ethers.BigNumber.from("997"))
    let numerator = amounInWithFees.mul(reserveOut);
    let denominator = reserveIn.mul(ethers.BigNumber.from("1000")).add(amounInWithFees);
    return numerator.div(denominator);
}

