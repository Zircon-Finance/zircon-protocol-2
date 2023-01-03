const {ethers} = require("hardhat");

exports.expandTo18Decimals = function expandTo18Decimals(n) {

    let num = n * 10**9

    return (ethers.BigNumber.from(10).pow(9)).mul(num)}

exports.getAmountOut = function getAmountOut(amountIn, reserveIn, reserveOut) {
    let amounInWithFees = amountIn.mul(ethers.BigNumber.from("997"))
    let numerator = amounInWithFees.mul(reserveOut);
    let denominator = reserveIn.mul(ethers.BigNumber.from("1000")).add(amounInWithFees);
    return numerator.div(denominator);
}

exports.sqrt = function sqrt(y) {

    let z = ethers.BigNumber.from(0);
    if (y > ethers.BigNumber.from(3)) {
            z = y;
            let x = y.div(2).add(1);
            while (x < z) {
                z = x;
                x = (y.div(x).add(x)).div(2);
            }
        } else if (y !== ethers.BigNumber.from(0)) {
            z = 1;
        }

    return z

}


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