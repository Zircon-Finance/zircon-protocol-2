pragma solidity =0.5.16;
pragma experimental ABIEncoderV2;
import "./SafeMath.sol";
import "./Math.sol";
import "../interfaces/IZirconPair.sol";
import "hardhat/console.sol";
library ZirconLibrary {
    using SafeMath for uint256;
    using SafeMath for uint112;
    struct Decimals {
        uint float;
        uint anchor;
    }

    struct ParabolaCoefficients {
        uint a;
        uint b;
        bool aNegative;
        bool bNegative;
    }

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


    function calculateParabolaCoefficients(Decimals storage decimals, uint p2x, uint p2y, uint p3x, uint p3y, bool check) view public returns (ParabolaCoefficients memory coefficients) {
        console.log("parab p2x, p2y", p2x, p2y);
        console.log("p3x, p3y", p3x, p3y);
        // Makes it a line if the points are are within 0.1% of each other;
        if((p3x * decimals.anchor)/p2x <= (1001*(decimals.anchor/1e3))) {
            return ParabolaCoefficients(0, p3y.mul(decimals.anchor)/p3x, false, false);
        }

        // Allows us to use the function for checking without reverting everything
        // For now this particular case we keep to a revert. In principle it should just snap out of line formula.
        if(p3x < p2x) {
            if(check) {
                return ParabolaCoefficients(42e25, 42e25, false, false);
            } else {
                revert("ZP: ExFlt0");
            }
        }


        // We pass a and b as 1e18s.
        // We use a bool flag to see if a is negative. B negative can happen sometimes, in that case the parabola becomes a line to p2
        // a can take values from approx. 1e19 to 0, so using encoding is ill-advised.

        uint aNumerator;

        uint aPartial1 = p3y.mul(p2x);
        uint aPartial2 = p3x.mul(p2y);
        uint aDenominator = p3x.mul(p3x - p2x)/decimals.anchor; //Always positive
        console.log("aDen", aDenominator);
        if(aPartial1 >= aPartial2) {
            // a is positive
            aNumerator = (aPartial1 - aPartial2)/p2x;
            coefficients.a = aNumerator * decimals.anchor/aDenominator;
            console.log("a Num:: coeff.a::", aNumerator, coefficients.a);

            {
                uint _p2x = p2x;
            }

            // If b is positive
            if(p2y * decimals.anchor/p2x >= (p2x * coefficients.a)/decimals.anchor) {
                coefficients.b = p2y * decimals.anchor/p2x - (p2x * coefficients.a)/decimals.anchor; //1e18 * 1e18/1e18 - 1e18*1e18/1e18 = 1e18
                console.log("b coeff::", coefficients.b);
                coefficients.bNegative = false;
            } else {
                // If b is negative we must construct a further piecewise definition upstream
                // Parabola becomes a line from 0 to p2, and then returns to its normal self.
                coefficients.b = (p2x * coefficients.a)/decimals.anchor - p2y * decimals.anchor/p2x; //1e18 * 1e18/1e18 - 1e18*1e18/1e18 = 1e18
                coefficients.bNegative = true;
            }

            coefficients.aNegative = false;

        } else {
            //a is negative
            aNumerator = (aPartial2 - aPartial1)/p2x;

            //            console.log("aPart2, aPart1, p2x", aPartial2, aPartial1, p2x);

            coefficients.a = (aNumerator * decimals.anchor)/aDenominator;

            coefficients.b = (p2y * decimals.anchor/p2x).add((p2x * coefficients.a)/decimals.anchor); //1e18 * 1e18/1e18 - 1e18*1e18/1e18 = 1e18

            console.log("aneg, b", coefficients.a, coefficients.b);

            coefficients.aNegative = true;
            coefficients.bNegative = false;

        }
    }

    function calculateP2(Decimals storage decimals, uint k, uint vab, uint vfb) view public returns (uint p2x, uint p2y) {
        p2y = ((k * 2)/vfb) - vab; // anchor decimals
        p2x = (p2y * decimals.float)/vfb;
    }

    function evaluateP2(Decimals storage decimals, uint x, uint adjustedVab, uint adjustedVfb, uint reserve0, uint reserve1, uint desiredFtv) view external returns (uint p2x, uint p2y) {

        uint p3x = (adjustedVab ** 2)/ reserve1;
        p3x = (p3x * decimals.float) / reserve0;

        if(x < p3x) {
            p2y = desiredFtv;
            p2x = x;
        } else {
            (p2x, p2y) = calculateP2(decimals, reserve0 * reserve1, adjustedVab, adjustedVfb);
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

    function calculateFtv(Decimals storage decimals, ParabolaCoefficients memory coefficients, uint x) view public returns (uint ftv) {
        ftv = coefficients.aNegative
        ? ((coefficients.b * x).sub(((coefficients.a * x)/decimals.anchor) * x))/decimals.anchor
        : coefficients.bNegative
        ? ((((coefficients.a * x)/decimals.anchor) * x).sub(coefficients.b * x))/decimals.anchor
        : ((((coefficients.a * x)/decimals.anchor) * x).add(coefficients.b * x))/decimals.anchor;


    }
    function getFTVForX(Decimals storage decimals, uint _x, uint p2x, uint p2y, uint reserve0, uint reserve1, uint adjustedVab) view external returns (uint ftv, bool lineFormula, bool reduceOnly) {
        uint p3x = (adjustedVab ** 2) / reserve1;
        p3x = (p3x * decimals.float) / reserve0;
        console.log("p3x & x", p3x, _x);

        if (_x >= p3x) {
            //x and reserves may not match, which is why we use this more general formula
            ftv = (2 * Math.sqrt(((reserve0 * reserve1)/decimals.float) * _x)).sub(adjustedVab);
            reduceOnly = false;
            lineFormula = false;
        } else {

            lineFormula = true;
            ParabolaCoefficients memory coefficients = calculateParabolaCoefficients(
                decimals, p2x, p2y, p3x, adjustedVab, false
            ); //p3y is just adjustedVab
            console.log("a, b", coefficients.a, coefficients.b);
            console.log("aNeg, bNeg", coefficients.aNegative, coefficients.bNegative);

            uint x = _x;

            if(coefficients.bNegative && x <= p2x) {
                ftv = p2y.mul(x)/p2x; //straight line to p2
                return (ftv, true, false);
            }

            //Different conditions
            //a negative means parabola is pointing downwards (concave)
            //B can never be negative in this case
            //if a is positive, we differentiate for b being negative
            //b being negative means parabola can go below 0 for a while, which is no good.

            ftv = calculateFtv(decimals, coefficients, x);

            //If derivative is positive at p3x
            //B can only be negative when a is positive

            if(!coefficients.aNegative || coefficients.b > (2 * coefficients.a * p3x)/decimals.anchor) {
                reduceOnly = false;
            } else {
                //This means there is an excess of floats and the derivative becomes negative at some point before the juncture
                //At this point float liquidity can only be removed until this condition doesn't persist anymore.
                reduceOnly = true;
                console.log("red");
            }

        }
    }

    function checkDerivative(Decimals storage decimals, uint p2x, uint p2y, uint reserve0, uint reserve1, uint adjustedVab) view external returns (bool isNeg) {

        uint p3x = (adjustedVab ** 2)/ reserve1;
        p3x = (p3x * decimals.float) / reserve0;

        ParabolaCoefficients memory coefficients = calculateParabolaCoefficients(decimals, p2x, p2y, p3x, adjustedVab, true);

        if(coefficients.a == 42e25) {
            return true;
        }

        if(!coefficients.aNegative || coefficients.bNegative || coefficients.b > (2 * coefficients.a * p3x)/decimals.anchor) {
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
