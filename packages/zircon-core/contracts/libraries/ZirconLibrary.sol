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


    //This should reduce kFactor when adding float. Ignores if formula increases it or it's reached 1
    function anchorFactorFloatAdd(uint amount, uint oldKFactor, uint _reserveTranslated0, uint _reserveTranslated1, uint _gamma, bool async100) pure internal returns (uint anchorKFactor) {

        uint ftv = async100 ? _reserveTranslated0.mul(2 * _gamma)/1e18 : _reserveTranslated1.mul(2 * _gamma)/1e18;
        //kprime/amount + ftv, 1e18 final result
        uint _anchorK =  (_reserveTranslated0 + (async100 ? amount : amount * _reserveTranslated0/(2*_reserveTranslated1)))
                                .mul(_reserveTranslated1 + (async100 ? 0 : amount/2))
                                     /(amount + ftv);

        //ftv/halfK
        _anchorK = _anchorK.mul(ftv)/(_reserveTranslated1);
        _anchorK = _anchorK.mul(oldKFactor)/(_reserveTranslated0);

        //We don't accept increases of anchorK when adding Float
        if(_anchorK > oldKFactor) {
            return oldKFactor;
        }

        //Can't let anchorK go below 1
        if(_anchorK < 1e18) {
            return 1e18;
        }

        anchorKFactor = _anchorK;
    }

    //0 kb, not used in practice?
    //only required for anchors now
//    function calculateLiquidity(uint amountIn,  uint112 _reservePair0, uint112 _reservePair1, uint liquidityFee, bool isAnchor) pure external returns (uint amount) {
//        //Divides amountIn into two slippage-adjusted halves
////        (uint112 _reservePair0, uint112 _reservePair1) = getPairReservesNormalized();
//
//        //We use the same mechanism as in mintOneSide: calculate percentage of liquidity (sqrt(k'/k))
//        //Then return amount0 and amount1 such that they're equal to reserveX * liquidity percentage
//
//        uint sqrtK = Math.sqrt(uint(_reservePair0.mul(_reservePair1)));
//        uint amountInWithFee = amountIn.mul(10000-(liquidityFee/2 + 1))/10000;
//        //Add the amountIn to one of the reserves
//        uint sqrtKPrime = isAnchor ?
//        Math.sqrt(_reservePair0.mul(_reservePair1.add(amountInWithFee)))
//        : Math.sqrt((_reservePair0.add(amountInWithFee)).mul(_reservePair1));
//
//        uint liqPercentage = ((sqrtKPrime.sub(sqrtK)).mul(1e18))/sqrtK;
//
//        amount = isAnchor
//        ? _reservePair1.mul(2 * liqPercentage)/1e18
//        : _reservePair0.mul(2 * liqPercentage)/1e18;
//
//        //        //Calculates pylon pool tokens by taking the minimum of between each amount*2
//        //        (liquidity, amount) = getLiquidityFromPoolTokens(
//        //            _reservePair0.mul(liqPercentage)/1e18,
//        //            _reservePair1.mul(liqPercentage)/1e18,
//        //            true,
//        //            ptTotalSupply);
//    }

    //This should increase kFactor when removing float. Ignores if formula decreases it
    //We use ptu to derive change in K, reserve1 and gamma for FTV
    function anchorFactorFloatBurn(uint amount, uint oldKFactor, uint ptu, uint ptb, uint _reserveTranslated1, uint _gamma) pure public returns (uint anchorKFactor) {
        // we know that ptu is proportional to sqrt(deltaK)
        // so our Kprime is just k - (ptu/ptb * (sqrtK))**2
        // while Kprime/k is simply 1 - ptu**2/ptb**2

        uint kRatio = ((1e18 - uint(1e18).mul(ptu)/ptb)**2)/1e18;

        uint ftv = _reserveTranslated1.mul(2 * _gamma)/1e18;
        //kprime/amount + ftv, 1e18 final result
        uint _anchorK = kRatio.mul(ftv)/(ftv - amount);

        _anchorK = oldKFactor.mul(_anchorK)/1e18;

        //console.log("akFR", _anchorK);

        //We don't accept reductions of anchorK when removing Float
        //This can only happen with large changes in liquidity
        if(_anchorK < oldKFactor) {
            return oldKFactor;
        }
        //No reason this should ever be below 1
        require(_anchorK >= 1e18, "ZL: AK");

        anchorKFactor = _anchorK;
    }


    function calculateAnchorFactor(bool isLineFormula, uint amount, uint oldKFactor, uint adjustedVab, uint _reserveTranslated0, uint _reserveTranslated1) pure public returns (uint anchorKFactor) {

        //calculate the anchor liquidity change that would move formula switch to current price
        uint sqrtKFactor = Math.sqrt((oldKFactor**2/1e18 - oldKFactor)*1e18);
        uint vabFactor = sqrtKFactor < oldKFactor ? oldKFactor - sqrtKFactor : oldKFactor + sqrtKFactor;

        uint amountThresholdMultiplier = _reserveTranslated1.mul(1e18)/adjustedVab;
        amountThresholdMultiplier = amountThresholdMultiplier * 1e18 / vabFactor;

        //console.log("atm", amountThresholdMultiplier);

        //We need to change anchor factor if we're using line formula or if adding liquidity might trigger a switch
        if(isLineFormula || amountThresholdMultiplier >= 1e18) {

            if(!isLineFormula && (1e18 + (amount.mul(1e18)/adjustedVab)) < amountThresholdMultiplier) {
                //We return kFactor unchanged if the addition isn't sufficient to trigger formula switch
                return oldKFactor;
            }

            //stack too deep
            uint _amount = amount;
            //first of all we need to figure out how much   of the anchor liquidity change requires kFactor to follow
            //This is the entire amount if isLineFormula && adding and if !isLineFormula it's amount - (threshold - 1)vab
            //in other words it's only the liquidity added above the threshold
            //We're only going to reach this part of the code if the liquidity does exceed the threshold


            //If it's the second case we need to increase initial k and vab by the amount that doesn't require changing kFactor
            //It's as if we're adding liquidity in two tranches

            //We're splitting anchor amount to halves in anchor and float tokens that are thrown in reserves.
            //It's important that we pass down slippage adjusted values

            //splitting to avoid overflow chance
            uint initialHalfK = isLineFormula
            ? _reserveTranslated0
            : (_reserveTranslated0 + ((amountThresholdMultiplier - 1e18).mul(adjustedVab)/2 * _reserveTranslated0/_reserveTranslated1)/1e18);

            uint initialTailK = isLineFormula
            ? _reserveTranslated1
            : (_reserveTranslated1 + (amountThresholdMultiplier - 1e18).mul(adjustedVab)/2e18);

            uint initialVab = isLineFormula ? adjustedVab : (amountThresholdMultiplier).mul(adjustedVab)/1e18;


            //divide by halfK to start working through 1e18s
            uint kPrime = (_reserveTranslated0 + (_amount.mul(_reserveTranslated0)/(2*_reserveTranslated1))).mul(_reserveTranslated1 + _amount/2)
            / initialHalfK;



            //AnchorkFactor is simply the ratio between change in k and change in vab (almost always different than 1)
            //This has the effect of keeping the line formula still, moving the switchover point.
            //Without this, anchor liquidity additions would change value of the float side
            //Lots of overflow potential, so we split calculations
            anchorKFactor = kPrime.mul(initialVab)/initialTailK;
            anchorKFactor = anchorKFactor.mul(oldKFactor)/(adjustedVab + _amount);

            //in principle this should never happen when adding liquidity, but better safe than sorry
            if(anchorKFactor < 1e18) {
                anchorKFactor = 1e18;
            }

        } else {
            //all other cases don't matter, kFactor is unchanged
            anchorKFactor = oldKFactor;
        }

    }



    function calculateAnchorFactorBurn(bool isLineFormula, uint amount, uint ptu, uint ptb, uint oldKFactor, uint adjustedVab, uint _reserveTranslated1) pure public returns (uint anchorKFactor) {

        //When burning We need to change anchor factor if we're already in line formula
        //if we're not, removals of liquidity shift the point further down so there's no way for it to reach line formula
        if(isLineFormula || oldKFactor > 1e18) {

            uint factorAnchorAmount = amount;

            //This splits between the cases where you're removing liquidity while in line formula
            //Or if some was added while in lineFormula and now we need to bring back to balance
            if(isLineFormula) {
                //calculate the anchor liquidity change that would move formula switch to current price
                uint sqrtKFactor = Math.sqrt((oldKFactor**2/1e18 - oldKFactor)*1e18);

                uint vabFactor = sqrtKFactor < oldKFactor ? oldKFactor - sqrtKFactor : oldKFactor + sqrtKFactor;
                uint amountThresholdMultiplier = _reserveTranslated1.mul(1e18)/(adjustedVab);

                amountThresholdMultiplier = (amountThresholdMultiplier * 1e18)/vabFactor;

                //if we're burning we only care about the threshold liquidity amount
                factorAnchorAmount = Math.min((uint(1e18).sub(amountThresholdMultiplier)).mul(adjustedVab)/1e18, amount);

            }
            uint _ptu = ptu.mul(factorAnchorAmount)/amount; //adjust ptu by the factor contribution

            // omega can only be different than 1 in case we're removing liquidity and it's using the line formula
            // but it's already embedded in the ptu;

            // we know that ptu is proportional to sqrt(deltaK)
            // so our Kprime is just k - (ptu/ptb * (sqrtK))**2
            // while Kprime/k is simply 1 - ptu**2/ptb**2



            uint kRatio = ((1e18 - uint(1e18).mul(_ptu)/ptb)**2)/1e18;
            //console.log("kr, vbp,", kRatio, (adjustedVab).mul(1e18)/(adjustedVab - factorAnchorAmount));

            //AnchorkFactor is simply the ratio between change in k and change in vab (almost always different than 1)
            //This has the effect of keeping the line formula still, moving the switchover point.
            //Without this, anchor liquidity additions would change value of the float side
            //Lots of overflow potential, so we split calculations
            anchorKFactor = kRatio.mul(adjustedVab)/(adjustedVab.sub(factorAnchorAmount));
            anchorKFactor = anchorKFactor.mul(oldKFactor)/1e18;

            //Anchor factor can never be below 1
            if(anchorKFactor < 1e18) {
                anchorKFactor = 1e18;
            }
            //console.log("cac");
        } else {
            // all other cases don't matter, kFactor is unchanged
            anchorKFactor = oldKFactor;
        }

    }








}
