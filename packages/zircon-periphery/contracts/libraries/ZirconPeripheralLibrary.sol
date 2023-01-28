// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.6;

import "./SafeMath.sol";
import "@zircon/core/contracts/interfaces/IZirconPylon.sol";

library ZirconPeripheralLibrary {
    using SafeMath for uint256;
    // calculates the CREATE2 address for a pair without making any external calls
    //TODO: Update init code hash with Zircon Pylon code hash


    // DO NOT CHANGE THIS FUNCTION WILL BE UPDATED BY 'yarn bytecode' inside zircon-core
    function pylonFor(address pylonFactory, address tokenA, address tokenB, address pair) pure internal returns (address pylon){pylon=address(uint(keccak256(abi.encodePacked(hex'ff',pylonFactory,keccak256(abi.encodePacked(tokenA, tokenB,pair)),hex'4d525325943fdc4f6bf898a93fd694a5238ea54ad9bdae09016f2ba12ab13838'))));}

//    function pylonFor(address factory, address tokenA, address tokenB, address pair) internal pure returns (address pylon) {
//        pylon = address(uint(keccak256(abi.encodePacked(
//                hex'ff',
//                factory,
//                keccak256(abi.encodePacked(tokenA, tokenB, pair)),
//                hex'afaf6286555f731e9581935e0bb62d3fec24c96b73c638aa7b5a8b9fbc595e39' // init code hash
//            ))));
//    }

    function isInitialized(address factory, address tokenA, address tokenB, address pair) view internal returns (bool initialized){
        initialized = IZirconPylon(pylonFor(factory, tokenA, tokenB, pair)).initialized() == 1;
    }

    function translate(uint toConvert, uint ptt, uint ptb) pure public  returns (uint amount){
        amount =  (ptt == 0 || ptb == 0) ? toConvert : toConvert.mul(ptb)/ptt;
    }

    // fetches and gets Reserves
    function getSyncReserves(address factory, address tokenA, address tokenB, address pair) internal view returns (uint112 reserveF, uint112 reserveA) {
        (reserveF, reserveA) = IZirconPylon(pylonFor(factory, tokenA, tokenB, pair)).getSyncReserves();
    }


    // TODO: Change this
    // fetches and sorts the reserves for a pair
    function maximumSync(uint reserve, uint reservePylon, uint syncPercentage, uint maxBase, uint ptt, uint ptb) internal pure returns (uint maximum) {
        uint pairReserveTranslated = translate(reserve, ptt, ptb);
        maximum = (pairReserveTranslated == 0 || reservePylon > pairReserveTranslated) ? maxBase :
        (pairReserveTranslated.mul(syncPercentage)/100).sub(reservePylon);
    }

}
