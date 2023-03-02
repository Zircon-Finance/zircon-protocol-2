// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
import './ZirconPair.sol';
import './energy/interfaces/IZirconEnergyFactory.sol';
import "./energy/interfaces/IZirconEnergyRevenue.sol";

contract Unblock {

    address public feeToSetter;


    function setFeeToSetter(address _feeToSetter) external {
        feeToSetter = _feeToSetter;
    }



}
