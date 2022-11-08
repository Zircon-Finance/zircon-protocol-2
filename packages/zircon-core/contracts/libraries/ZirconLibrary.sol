pragma solidity =0.5.16;

import "./SafeMath.sol";
import "./Math.sol";
import "../interfaces/IZirconPair.sol";

library ZirconLibrary {
    using SafeMath for uint256;

    // This function takes two variables and look at the maximum possible with the ration given by the reserves
    // @pR0, @pR1 the pair reserves
    // @b0, @b1 the balances to calculate
    function _getMaximum(uint _reserve0, uint _reserve1, uint _b0, uint _b1) pure public returns (uint maxX, uint maxY)  {

        //Expresses b1 in units of reserve0
        uint px = _reserve0.mul(_b1)/_reserve1;

        if (px > _b0) {
            maxX = _b0;
            maxY = _b0.mul(_reserve1)/_reserve0; //b0 in units of reserve1
        } else {
            maxX = px; //max is b1 but in reserve0 units
            maxY = _b1;
        }
    }

    // @notice This function converts amount, specifying which tranch uses with @isAnchor, to pool token share
    // @_amount is the quantity to convert
    // @_totalSupply is the supply of the pt's tranch
    // @reserve0, @_gamma, @vab are the variables needed to the calculation of the amount
    function calculatePTU(bool _isAnchor, uint _amount, uint _totalSupply, uint _reserve, uint _reservePylon, uint _gamma, uint _vab) pure public returns (uint liquidity){
        if (_isAnchor) {
            liquidity = _amount.mul(_totalSupply)/_vab;
        }else {
            liquidity = ((_amount.mul(_totalSupply))/(_reservePylon.add(_reserve.mul(_gamma).mul(2)/1e18)));
        }
    }


    //This should reduce kFactor when adding float. Ignores if formula increases it or it's reached 1
    function anchorFactorFloatAdd(uint amount, uint oldKFactor, uint _reserveTranslated0, uint _reserveTranslated1, uint _gamma) view public returns (uint anchorKFactor) {

        uint ftv = _reserveTranslated1.mul(2 * _gamma)/1e18;
        //kprime/amount + ftv, 1e18 final result
        uint _anchorK = (_reserveTranslated0 + (amount * _reserveTranslated0/(2*_reserveTranslated1)))   .mul(_reserveTranslated1 + (amount/2))
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

    //This should increase kFactor when removing float. Ignores if formula decreases it
    //We use ptu to derive change in K, reserve1 and gamma for FTV
    function anchorFactorFloatBurn(uint amount, uint oldKFactor, uint ptu, uint ptb, uint _reserveTranslated1, uint _gamma) view public returns (uint anchorKFactor) {
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



    function absoluteDiff(uint value1, uint value2) pure public returns (uint abs) {
        if (value1 >= value2) {
            abs = value1.sub(value2);
        } else {
            abs = value2.sub(value1);
        }
    }



}
