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


    function calculateParabolaCoefficients(uint p2x, uint p2y, uint p3x, uint p3y, bool check) view public returns (bool aNegative, uint a, bool bNegative, uint b) {


        console.log("parab p2x, p2y", p2x, p2y);
        console.log("p3x, p3y", p3x, p3y);

        //Makes it a line if the points are are within 0.1% of each other;
        if((p3x * 1e18)/p2x <= 1001e15) {
            return (false, 0, false, p3y.mul(1e18)/p3x);
        }


        //Allows us to use the function for checking without reverting everything
        //For now this particular case we keep to a revert. In principle it should just snap out of line formula.
        if(p3x < p2x) {
//            console.log("cane", check);
            if(check) {
                return (false, 42e25, false, 42e25);
            } else {
                revert("ZP: ExFlt0");
            }
        }

//        console.log("dio");


        //We pass a and b as 1e18s.
        //We use a bool flag to see if a is negative. B negative can happen sometimes, in that case the parabola becomes a line to p2
        //a can take values from approx. 1e19 to 0, so using encoding is ill-advised.

        uint aNumerator;

        uint aPartial1 = p3y.mul(p2x);
        uint aPartial2 = p3x.mul(p2y);
        uint aDenominator = p3x.mul(p3x - p2x)/1e18; //Always positive
//        console.log("aDen, p2x", aDenominator, p2x);
        if(aPartial1 >= aPartial2) {
            //a is positive
            aNumerator = (aPartial1 - aPartial2)/p2x;
            a = aNumerator * 1e18/aDenominator;
            {
                uint _p2x = p2x;
                console.log("aNum, a", aNumerator, a);


            }

            //If b is positive
            if(p2y * 1e18/p2x >= (p2x * a)/1e18) {
                b = p2y * 1e18/p2x - (p2x * a)/1e18; //1e18 * 1e18/1e18 - 1e18*1e18/1e18 = 1e18
                bNegative = false;
            } else {
                //If b is negative we must construct a further piecewise definition upstream
                //Parabola becomes a line from 0 to p2, and then returns to its normal self.
                b = (p2x * a)/1e18 - p2y * 1e18/p2x; //1e18 * 1e18/1e18 - 1e18*1e18/1e18 = 1e18
                bNegative = true;
            }

            aNegative = false;

        } else {
            //a is negative
            aNumerator = (aPartial2 - aPartial1)/p2x;

//            console.log("aPart2, aPart1, p2x", aPartial2, aPartial1, p2x);

            a = (aNumerator * 1e18)/aDenominator;

            b = (p2y * 1e18/p2x).add((p2x * a)/1e18); //1e18 * 1e18/1e18 - 1e18*1e18/1e18 = 1e18

            aNegative = true;
            bNegative = false;

        }
    }

    function calculateP2(uint k, uint vab, uint vfb) view public returns (uint p2x, uint p2y) {
        p2y = ((k * 2)/vfb) - vab;
        p2x = (p2y * 1e18)/vfb;
//        console.log("cal p2y, p2x", p2y, p2x);
    }

    function evaluateP2(uint x, uint adjustedVab, uint adjustedVfb, uint reserve0, uint reserve1, uint desiredFtv) view external returns (uint p2x, uint p2y) {

        uint p3x = (adjustedVab ** 2)/ reserve1;
        p3x = (p3x * 1e18) / reserve0;

        if(x < p3x) {
            p2y = desiredFtv;
            p2x = x;
//            console.log("d p2x, p2y", p2x, p2y);
        } else {
            (p2x, p2y) = calculateP2(reserve0 * reserve1, adjustedVab, adjustedVfb);
//            console.log("d p2x, p2y", p2x, p2y);
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

    function getFTVForX(uint _x, uint p2x, uint p2y, uint reserve0, uint reserve1, uint adjustedVab) view external returns (uint ftv, bool lineFormula, bool reduceOnly) {

        uint p3x = (adjustedVab ** 2)/ reserve1;
        p3x = (p3x * 1e18) / reserve0;

        console.log("p3x, p2x, x", p3x, p2x, _x);

        if (_x >= p3x) {
            //x and reserves may not match, which is why we use this more general formula
            ftv = 2 * Math.sqrt((reserve0 * reserve1)/1e18 * _x) - adjustedVab;
            reduceOnly = false;
            lineFormula = false;
        } else {

            lineFormula = true;
            (bool aNeg, uint a, bool bNeg, uint b) = calculateParabolaCoefficients(
                p2x, p2y, p3x, adjustedVab, false
            ); //p3y is just adjustedVab

//            console.log("gf aNeg, a, b", aNeg, a, b);

            uint x = _x;

            if(bNeg && x <= p2x) {
                ftv = p2y.mul(x)/p2x; //straight line to p2
                return (ftv, true, false);
            }

            //Different conditions
            //a negative means parabola is pointing downwards (concave)
            //B can never be negative in this case
            //if a is positive, we differentiate for b being negative
            //b being negative means parabola can go below 0 for a while, which is no good.

            ftv = aNeg
            ? ((b * x).sub(((a * x)/1e18) * x))/1e18
            : bNeg
                ? ((((a * x)/1e18) * x).sub(b * x))/1e18
                : ((((a * x)/1e18) * x).add(b * x))/1e18;

            //If derivative is positive at p3x
            if(!aNeg || b > (2 * a * p3x)/1e18) {
                reduceOnly = false;
            } else {
                //This means there is an excess of floats and the derivative becomes negative at some point before the juncture
                //At this point float liquidity can only be removed until this condition doesn't persist anymore.
                reduceOnly = true;
            }

        }
    }

    function checkDerivative(uint p2x, uint p2y, uint reserve0, uint reserve1, uint adjustedVab) view external returns (bool isNeg) {

        uint p3x = (adjustedVab ** 2)/ reserve1;
        p3x = (p3x * 1e18) / reserve0;

        (bool aNeg, uint a, bool bNeg, uint b) = calculateParabolaCoefficients(p2x, p2y, p3x, adjustedVab, true);

        if(a == 42e25) {
            return true;
        }

        if(!aNeg || bNeg || b > (2 * a * p3x)/1e18) {
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
