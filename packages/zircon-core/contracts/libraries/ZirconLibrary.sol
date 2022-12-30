pragma solidity =0.5.16;

import "./SafeMath.sol";
import "./Math.sol";
import "../interfaces/IZirconPair.sol";
import "hardhat/console.sol";
library ZirconLibrary {
    using SafeMath for uint256;
    using SafeMath for uint112;


    // @notice This function converts amount, specifying which tranch uses with @isAnchor, to pool token share
    // @_amount is the quantity to convert
    // @_totalSupply is the supply of the pt's tranch
    // @reserve0, @_gamma, @vab are the variables needed to the calculation of the amount
    // @deprecated TBD
    //    function calculatePTU(bool _isAnchor, uint _amount, uint _totalSupply, uint _reserve, uint _reservePylon, uint _gamma, uint _vab) pure public returns (uint liquidity){
    //        if (_isAnchor) {
    //            liquidity = _amount.mul(_totalSupply)/_vab;
    //        }else {
    //            liquidity = ((_amount.mul(_totalSupply))/(_reservePylon.add(_reserve.mul(_gamma).mul(2)/1e18)));
    //        }
    //    }


    function calculateParabolaCoefficients(uint p2x, uint p2y, uint p3x, uint p3y, bool check) view public returns (bool aNegative, uint a, uint b) {


        //Allows us to use the function for checking without reverting everything
        if(p3x < p2x) {
            if(check) {
                return (false, 42e25, 42e25);
            } else {
                revert("ZP: ExFlt0");
            }
        }

        //Makes it a line if the points are are within 0.1% of each other;
        if((p3x * 1e18)/p2x <= 1001e15) {
            return (false, 0, p3y.mul(1e18)/p3x);
        }

        //We pass a and b as 1e18s.
        //We use a bool flag to see if a is negative. B negative should basically never happen so we can revert if it happens
        //a can take values from approx. 1e19 to 0, so using encoding is ill-advised.

        uint aNumerator;

        console.log("p3x, p3y", p3x, p3y);

        uint aPartial1 = p3y.mul(p2x);
        uint aPartial2 = p3x.mul(p2y);
        uint aDenominator = p3x.mul(p3x - p2x)/1e18; //Always positive
        if(aPartial1 >= aPartial2) {
            //a is positive
            aNumerator = (aPartial1 - aPartial2)/p2x;
            a = aNumerator * 1e18/aDenominator;
            require(p2y * 1e18/p2x >= (p2x * a)/1e18, "ZP: BNeg");

            b = p2y * 1e18/p2x - (p2x * a)/1e18; //1e18 * 1e18/1e18 - 1e18*1e18/1e18 = 1e18

            aNegative = false;

        } else {
            //a is negative
            aNumerator = (aPartial2 - aPartial1)/p2x;

            console.log("aPart2, aPart1, p2x", aPartial2, aPartial1, p2x);

            a = (aNumerator * 1e18)/aDenominator;

            b = (p2y * 1e18/p2x).add((p2x * a)/1e18); //1e18 * 1e18/1e18 - 1e18*1e18/1e18 = 1e18

            aNegative = true;

        }
    }

    function calculateP2(uint k, uint vab, uint vfb) view public returns (uint p2x, uint p2y) {
        p2y = ((k * 2)/vfb) - vab;
        p2x = (p2y * 1e18)/vfb;
        console.log("p2y, p2x", p2y, p2x);
    }

    function evaluateP2(uint x, uint adjustedVab, uint adjustedVfb, uint reserve0, uint reserve1, uint desiredFtv) view external returns (uint p2x, uint p2y) {

        uint p3x = (adjustedVab ** 2)/ reserve0;
        p3x = (p3x * 1e18) / reserve1;

        if(x < p3x) {
            p2y = desiredFtv;
            p2x = x;
        } else {
            (p2x, p2y) = calculateP2(reserve0 * reserve1, adjustedVab, adjustedVfb);
        }

    }

    //         if x < (adjusted_vab ** 2)/k:
    //            self.p2y = adjusted_ftv
    //            self.p2x = reserve1/reserve0
    //
    //        else:
    //            # resets p2 to its default value
    //            self.p2y = (2 * k/adjusted_vfb) - adjusted_vab
    //            self.p2x = self.p2y/adjusted_vfb

    function getFTVForX(uint x, uint p2x, uint p2y, uint reserve0, uint reserve1, uint adjustedVab) view external returns (uint ftv) {

        uint p3x = (adjustedVab ** 2)/ reserve0;
        p3x = (p3x * 1e18) / reserve1;

        if (x >= p3x) {
            ftv = 2 * Math.sqrt((reserve0 * reserve1)/1e18 * x) - adjustedVab;
        } else {

            (bool aNeg, uint a, uint b) = calculateParabolaCoefficients(
                p2x, p2y, p3x, adjustedVab, false
            ); //p3y is just adjustedVab

            //If derivative is positive at p3x
            if(!aNeg || b > (2 * a * p3x)/1e18) {
                ftv = aNeg
                ? (b * x).sub(((a * x)/1e18) * x)
                : (((a * x)/1e18) * x).add(b * x);

            } else {
                //Since this uses the current formula it really should never trigger this error.
                revert("ZP: ExFlt2");
            }

        }
    }

    function checkDerivative(uint p2x, uint p2y, uint reserve0, uint reserve1, uint adjustedVab) view external returns (bool isNeg) {

        uint p3x = (adjustedVab ** 2)/ reserve0;
        p3x = (p3x * 1e18) / reserve1;

        (bool aNeg, uint a, uint b) = calculateParabolaCoefficients(p2x, p2y, p3x, adjustedVab, true);

        if(a == 42e25) {
            return true;
        }

        if(!aNeg || b > (2 * a * p3x)/1e18) {
            return false;

        } else {
            return true;
        }

    }

//    def get_ftv_for_x(x, p2x, p2y, k, adjusted_vab):
    //    print("Debug: getFTV adj_vab: {}, getFTV k: {}".format(adjusted_vab, k))
    //    p3x = (adjusted_vab ** 2) / k
    //
    //    result = 0
    //    if x > p3x:
    //        result = 2 * math.sqrt(k * x) - adjusted_vab
    //    else:
    //
    //        a, b = calculate_parabola_coefficients(p2x, p2y, p3x, adjusted_vab)
    //
    //        # derivative check at p3x (crossing point)
    //        # sufficient to check if the parabola is too curved at any point
    //        if 2 * a * p3x + b > 0:
    //            result = a * (x ** 2) + b * x
    //        else:
    //            # In solidity this should just revert
    //            print("Error: Derivative is negative")
    //            return -1
    //    print("Debug: GetFTV: X: {}, result: {}, p3x: {}".format(x, result, p3x))
    //    return result




}
