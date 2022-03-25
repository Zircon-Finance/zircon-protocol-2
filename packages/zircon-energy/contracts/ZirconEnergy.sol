//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.16;

import "hardhat/console.sol";
import "./interfaces/IZirconEnergy.sol";
import "./interfaces/IUniswapV2ERC20.sol";


contract ZirconEnergy is IZirconEnergy {

  /*

  Zircon Energy is the protocol-wide accumulator of revenue.
  It keeps a "bank account" balance for each Pylon and splits it into pure revenue + insurance portion balance

  Ok but how do you split them? You only know balances and delta balances. Especially difficult with double pylons.
  We modify mintFee to trigger calls on ZirconEnergy (need an interface for this)
  TODO: mintFee kinda needs to be modified to know which Pylon called it. Yeah it needs to be modified, only way
  We handle donations by dumping them into the insurance pool, spread evenly between pylons.

  The insurance portion gets used by breakPiggybank, called by Pylons, to finance withdrawals, which is done by sending
  Uni pool tokens to the Pylon (which then redeems them + handles partial/none repayment cases

  How do we handle Float/Anchor tokens? TODO: Change all pylon fees to send the underlying
  They are kept in their unwrapped form to form a cushion. When necessary they are minted (preferably both-sides) into Uni PTs

  EDIT: No, we convert them to UniV2 PTs. Mostly for simplicity — can add a risk/asset management system later.


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

  struct Pylon {
    address pairAddress;
    address token0; //Should always be float
    address token1; //Should always be Anchor
    uint insurancePerMille;
    uint insuranceUni;
    uint revenueUni;
  }

  struct PairFields {
    address pylonFloat0; //Means that this pylon has token0 as float
    address pylonFloat1;
    uint revenueUni;
  }

  mapping(address => Pylon) public pylonAccounts;

  mapping(address => PairFields) public pairToPylon;

  address pylonFactory;

  uint lastPtBalance; //Used to track balances and sync up in case of donations


  constructor(address _pylonFactory) {
    pylonFactory = _pylonFactory;
  }

  function breakPiggybank(uint _requestedLiquidity) external returns (uint returnedLiquidity) {

    //Called by Pylon if omega is below 1. Pylon asks for X liquidity, breakPiggybank responds by depositing X or less and returning how much.

    require(pylonAccounts[msg.sender].pairAddress != address(0), "ZE: Not Registered; Forbidden");

    Pylon storage pylonRef = pylonAccounts[msg.sender];

    returnedLiquidity = pylonRef.insuranceUni >= _requestedLiquidity ? _requestedLiquidity : pylonRef.insuranceUni;

    if (returnedLiquidity != 0) {
      IUniswapV2ERC20(pylonRef.pairAddress).transfer(msg.sender, returnedLiquidity);

      pylonRef.insuranceUni -= returnedLiquidity;
    }
  }

  //Should be called by Pylon factory during creation
  function registerPylon(address _pylonAddress, address _pairAddress, address _token0, address _token1, bool floatToken0, uint _insurancePerMille) external {
    require(msg.sender == pylonFactory, "ZE: Forbidden");

    Pylon memory pylonData = (
      _pairAddress,
      floatToken0 ? _token0 : _token1,
      floatToken0 ? _token0 : _token1,
      _insurancePerMille, //Insurance factor for this pool, should be modifiable somehow.
      1, //Balances initialized to 1 to avoid potential division by 0
      1,
    );

    //TODO: Do we need input sanitation on the addresses?

    pylonAccounts[_pylonAddress] = pylonData;
    //pairToPylon[_pairAddress] = (address(0), address(0));

    if(floatToken0) {
      pairToPylon[_pairAddress].pylonFloat0 = _pylonAddress;
    } else {
      pairToPylon[_pairAddress].pylonFloat1 = _pylonAddress;
    }

  }

  //Called by pair mintFee to register inflow. Any excess is spread evenly.
  function syncFee(address _pairAddress) external {

    //This function gets called by every time there is a mintFee.
    //This distributes the fees between pair-only (100% revenue), pylon1 and pylon 2 (split between insurance and revenue)

    uint _feeLiquidity = IUniswapV2ERC20(_pairAddress).balanceOf(address(self)) - lastPtBalance;


    address _pylonFloat0 = pairToPylon[_pairAddress].pylonFloat0;
    address _pylonFloat1 = pairToPylon[_pairAddress].pylonFloat1;

    uint float0Liquidity;
    uint float1Liquidity;
    uint ptTotalSupply = IUniswapV2ERC20(_pairAddress).totalSupply();

    if(_pylonFloat0 != address(0)) {
      float0Liquidity = IUniswapV2ERC20(_pairAddress).balanceOf(_pylonFloat0);
      uint float0Fee = float0Liquidity.mul(_feeLiquidity)/ptTotalSupply;
      Pylon storage pylonRef = pylonAccounts[_pylonFloat0]; //Storage makes this a mutable reference vs. copying with Memory
      uint _insurancePerMille = pylonRef.insurancePerMille;

      pylonRef.insuranceUni += float0Fee.mul(_insurancePerMille)/1000;
      pylonRef.revenueUni += float0Fee.mul(1000 - _insurancePerMille)/1000;
      _returnExcess(_pylonFloat0);

    }

    if (_pylonFloat1 != address(0)) {
      float1Liquidity = IUniswapV2ERC20(_pairAddress).balanceOf(_pylonFloat1);

      uint float1Fee = float1Liquidity.mul(_feeLiquidity)/ptTotalSupply;
      Pylon storage pylonRef = pylonAccounts[_pylonFloat1]; //Storage makes this a mutable reference vs. copying with Memory
      uint _insurancePerMille = pylonRef.insurancePerMille;

      pylonRef.insuranceUni += float1Fee.mul(_insurancePerMille)/1000;
      pylonRef.revenueUni += float1Fee.mul(1000 - _insurancePerMille)/1000;
      _returnExcess(_pylonFloat1);
    }

    uint pairLiquidity = ptTotalSupply - (float0Liquidity + float1Liquidity); //fundamentally impossible for this to over/sub flow

    pairToPylon[_pairAddress].revenueUni += _feeLiquidity.mul(pairLiquidity)/ptTotalSupply;

    lastPtBalance = IUniswapV2ERC20(_pairAddress).balanceOf(address(self));

  }


  //Function called periodically to check if the reserves are too large, returns them back to pylon if they are
  function _returnExcess(address _pylonAddress) private {

    //Under an LP only model there is no "excess". You may need to cover 100% of the pool's worth
    //But if it is over 100% (maybe due to heavy outflows) this function returns funds to Pylon LPs.
    //Called by syncFee

    //TODO: Critical to let Pylon manage uni token excesses effectively
    Pylon storage pylonRef = pylonAccounts[_pylonAddress];
    uint pylonBalance = IUniswapV2ERC20(pylonRef.pairAddress).balanceOf(_pylonAddress);
    if(pylonRef.insuranceUni > pylonBalance) {
      uint liquidity = pylonRef.insuranceUni - pylonBalance;
      IUniswapV2ERC20(pylonRef.pairAddress).transfer(_pylonAddress, liquidity); //TODO: Maybe switch to safeTransfer to revert this?
      pylonRef.insuranceUni -= liquidity;
    }

  }


  //TODO: Add extensive checks and limits system to the extractToken flow

  function extractToken() {

  }


  function migrateState() {

  }

  function setInsuranceFactor() {

  }


}
