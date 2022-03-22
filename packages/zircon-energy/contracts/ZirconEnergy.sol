//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.16;

import "hardhat/console.sol";


contract ZirconEnergy {

  /*

  Zircon Energy is the protocol-wide accumulator of revenue.
  It keeps a "bank account" balance for each Pylon and splits it into pure revenue + insurance portion balance

  The insurance portion gets used by breakPiggybank, called by Pylons, to finance withdrawals, which is done by sending
  Uni pool tokens to the Pylon (which then redeems them + handles partial/none repayment cases

  The insurance portion is managed through a per-Pylon insurance weighting that can be changed by an address stored for it,
  defaulting to governance but tweakable to potentially introduce per-pool governance

  returnExcess does some calculations to check max liability for Anchor (?) and returns any excess accrued to Pylon
  TODO: More study of this

  extractToken then allows governance to withdraw protocol revenue (only).
  It should use some time lock checks (can't withdraw more than X per day)
  and some amount checks (can't withdraw more than X [or percentage of total] in each transaction)

  Also some way to make sure it can't called during a flash loan?
  Hard to make it generalized while letting smart contracts call it.

  All checks can be set by governance. Important to ensure that this doesn't brick the funds somehow.
  

  addInsurance function can be called by governance to increase a pool's insurance share, which can be used to bail out pools by gov




  */




  constructor() {

  }

  function breakPiggybank() external returns (uint liquidity) {


  }


  //Function called periodically to check if the reserves are too large, returns them back to pylon if they are
  function returnExcess() {

  }


  //TODO: Add extensive checks and limits system to the extractToken flow

  function extractToken() {

  }





}
