pragma solidity =0.5.16;

import "./SafeMath.sol";
import "../interfaces/IZirconPair.sol";
import "hardhat/console.sol";

library ZirconLibrary {
    using SafeMath for uint256;
    uint public constant MINIMUM_LIQUIDITY = 10**3;

    // Same Function as Uniswap Library, used here for incompatible solidity versions
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut, uint fee) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn.mul(10000-fee);
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(10000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // This function takes two variables and look at the maximum possible with the ration given by the reserves
    // @pR0, @pR1 the pair reserves
    // @b0, @b1 the balances to calculate
    function _getMaximum(uint _reserve0, uint _reserve1, uint _b0, uint _b1) pure internal returns (uint maxX, uint maxY)  {

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
//    function _getMaximum(uint _reserve0, uint _reserve1, uint _b0, uint _b1, uint ts) view internal returns (uint maxX, uint maxY)  {
//
//        //Expresses b1 in units of reserve0
//        uint px = ts.mul(_b0)/_reserve0;
//        uint py = ts.mul(_b1)/_reserve1;
//        console.log("px: ", px, py);
//        if (px > py) {
//            maxX = py.mul(_reserve0)/ts;
//            maxY = _b1; //b0 in units of reserve1
//        } else {
//            maxX = _b0; //max is b1 but in reserve0 units
//            maxY = px.mul(_reserve1)/ts;
//        }
//    }

    // @notice This function converts amount, specifying which tranch uses with @isAnchor, to pool token share
    // @_amount is the quantity to convert
    // @_totalSupply is the supply of the pt's tranch
    // @reserve0, @_gamma, @vab are the variables needed to the calculation of the amount
    function calculatePTU(bool _isAnchor, uint _amount, uint _totalSupply, uint _reserve, uint _reservePylon, uint _gamma, uint _vab) pure internal returns (uint liquidity){
        if (_isAnchor) {
            liquidity = _amount.mul(_totalSupply)/_vab;
        }else {
            uint numerator = _amount.mul(_totalSupply);
            uint resTranslated = _reserve.mul(_gamma).mul(2)/1e18;
            uint denominator = (_reservePylon.add(resTranslated));
            liquidity = (numerator/denominator);
        }
    }

    // @notice This function converts pool token share, specifying which tranches with @isAnchor, to token amount
    // @_ptuAmount is the quantity to convert
    // @_totalSupply is the supply of the pt of the tranches
    // @reserve0, @_gamma, @vab are the variables needed to the calculation of the amount
    function calculatePTUToAmount(bool _isAnchor, uint _ptuAmount, uint _totalSupply, uint _reserve0, uint _reservePylon0, uint _gamma, uint _vab) pure internal returns (uint amount) {
        if (_isAnchor) {
            amount = _vab.mul(_ptuAmount)/_totalSupply;
        } else {
            amount = (((_reserve0.mul(_gamma).mul(2)/1e18).add(_reservePylon0)).mul(_ptuAmount))/_totalSupply;
        }
    }

    function slashLiabilityOmega(uint tpvAnchorTranslated, uint anchorReserve, uint gammaMulDecimals, uint virtualAnchorBalance) pure internal returns (uint omegaMulDecimals) {
        //Omega is the "survival factor" i.e how much of the anchor balance survives slashing and can be withdrawn.
        //It's applied to the user's liquidity tokens to avoid changing other core functions.
        //This adjustment is only used for share calculations, the full amount of tokens is removed.
        omegaMulDecimals = ((1e18 - gammaMulDecimals).mul(tpvAnchorTranslated))/(virtualAnchorBalance.sub(anchorReserve));
    }

    function calculateAnchorFactor(bool isLineFormula, bool isAddition, uint amount, uint omega, uint oldKFactor, uint adjustedVab, uint _reserveTranslated0, uint _reserveTranslated1) pure internal returns (uint anchorKFactor) {

        //calculate the anchor liquidity change that would move formula switch to current price
        uint sqrtKFactor = Math.sqrt(oldKFactor**2 + oldKFactor);
        uint amountThresholdMultiplier = _reserveTranslated1.mul(1e36)/(adjustedVab.mul(oldKFactor + sqrtKFactor));

        //We need to change anchor factor if we're using line formula or if we're adding enough to switch to it
        if(isLineFormula || (amountThresholdMultiplier >= 1e18 && isAddition)) {

            if(!isLineFormula && (1e18 + (amount.mul(1e18)/adjustedVab)) < amountThresholdMultiplier) {
                //We return if the addition isn't sufficient to trigger formula switch
                return oldKFactor;
            }

            //first of all we need to figure out how much of the anchor liquidity change requires kFactor to follow
            //This is the entire amount if isLineFormula && adding, min((1-threshold)vab, amount) if isLineFormula && removing
            //if !isLineFormula it's amount - (threshold - 1)vab
            uint factorAnchorAmount = isLineFormula ?
                                            (isAddition?
                                                amount
                                            : Math.min((uint(1e18).sub(amountThresholdMultiplier)).mul(adjustedVab)/1e18, amount))
                                        : amount.sub((amountThresholdMultiplier.sub(1e18)).mul(adjustedVab)/1e18);


            //If it's the third case we need to increase initial k and vab by the amount that doesn't require changing kFactor
            //It's as if we're adding liquidity in two tranches

            uint initialK = isLineFormula ?
                                _reserveTranslated0.mul(_reserveTranslated1) :
                                (_reserveTranslated0 + (amountThresholdMultiplier.sub(1e18)).mul(adjustedVab)/2 * _reserveTranslated0/_reserveTranslated1).mul((_reserveTranslated1 + (amountThresholdMultiplier.sub(1e18)).mul(adjustedVab)/2))

            uint initialVab = isLineFormula ? adjustedVab : (amountThresholdMultiplier).mul(adjustedVab)/1e18;


            //omega can only be different than 1 in case we're removing liquidity and it's using the line formula
            uint liquidityChange = isLineFormula ? factorAnchorAmount.mul(omega)/2e18 : (factorAnchorAmount + amountThresholdMultiplier.sub(1e18)).mul(adjustedVab)/2e18;


            uint kPrime = isAddition ?
                            (_reserveTranslated0 + (liquidityChange.mul(_reserveTranslated0)/(_reserveTranslated1).mul(_reserveTranslated1 + liquidityChange)
                           : (_reserveTranslated0 - (liquidityChange.mul(_reserveTranslated0)/(_reserveTranslated1).mul(_reserveTranslated1 - liquidityChange);


            //AnchorkFactor is simply the ratio between change in k and change in vab (almost always different than 1)
            //This has the effect of keeping the line formula still, moving the switchover point.
            //Without this, anchor liquidity additions would change value of the float side
            //Lots of overflow potential, so we split calculations
            anchorKFactor = kPrime.mul(initialVab)/initialK;
            anchorKFactor = isAddition ?
                anchorKFactor.mul(oldKFactor)/(adjustedVab + factorAnchorAmount)
                : anchorKFactor.mul(oldKFactor)/(adjustedVab - factorAnchorAmount);


        } else {
            //all other cases don't matter, kFactor is unchanged
            anchorKFactor = oldKFactor;
        }

    }



    function calculateAnchorFactorBurn(bool isLineFormula, uint amount, uint ptu, uint ptb, uint oldKFactor, uint adjustedVab, uint _reserveTranslated0, uint _reserveTranslated1) pure internal returns (uint anchorKFactor) {

        //calculate the anchor liquidity change that would move formula switch to current price
        uint sqrtKFactor = Math.sqrt(oldKFactor**2 + oldKFactor);
        uint amountThresholdMultiplier = _reserveTranslated1.mul(1e36)/(adjustedVab.mul(oldKFactor + sqrtKFactor));

        //We need to change anchor factor if we're using line formula or if we're adding enough to switch to it
        if(isLineFormula)) {

            //if we're burning we only care about the threshold liquidity amount
            uint factorAnchorAmount = Math.min((uint(1e18).sub(amountThresholdMultiplier)).mul(adjustedVab)/1e18, amount);

            uint _ptu = ptu.mul(factorAnchorAmount)/amount; //adjust ptu by the factor contribution

            //omega can only be different than 1 in case we're removing liquidity and it's using the line formula
            //but it's already embedded in the ptu;

            //we know that ptu is proportional to sqrt(deltaK)
            //so our kprime is just k - (ptu/ptb * (sqrtK))**2
            //while kprime/k is simply 1 - ptu**2/ptb**2


            uint kRatio = 1e18 - uint(1e18).mul(_ptu**2)/ptb**2;

            //AnchorkFactor is simply the ratio between change in k and change in vab (almost always different than 1)
            //This has the effect of keeping the line formula still, moving the switchover point.
            //Without this, anchor liquidity additions would change value of the float side
            //Lots of overflow potential, so we split calculations
            anchorKFactor = kRatio.mul(initialVab)/(adjustedVab - factorAnchorAmount);

        } else {
            //all other cases don't matter, kFactor is unchanged
            anchorKFactor = oldKFactor;
        }

    }



    function absoluteDiff(uint value1, uint value2) pure internal returns (uint abs) {
        if (value1 >= value2) {
            abs = value1.sub(value2);
        } else {
            abs = value2.sub(value1);
        }
    }



}
