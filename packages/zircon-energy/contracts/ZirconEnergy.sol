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

  struct PylonTuple {
    address pylonFloat0; //Means that this pylon has token0 as float
    address pylonFloat1;
  }

  mapping(address => Pylon) public pylonAccounts;

  mapping(address => PylonTuple) public pairToPylon;

  address pylonFactory;



  constructor(address _pylonFactory) {
    pylonFactory = _pylonFactory;
  }

  function breakPiggybank() external returns (uint liquidity) {


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

    //TODO: Check that mapping is indeed initialized to an address0 struct
    if(floatToken0) {
      pairToPylon[_pairAddress].pylonFloat0 = _pylonAddress;
    } else {
      pairToPylon[_pairAddress].pylonFloat1 = _pylonAddress;
    }

  }

  //Called by pair mintFee to register inflow. Any excess is spread evenly.
  function syncFee(address _pairAddress, uint _feeLiquidity) external {

    //This function gets called by every time there is a mintFee.
    //This distributes the fees between pair-only (100% revenue), pylon1 and pylon 2 (split between insurance and revenue)
    //Assumes msg.sender is the pair

    address _pylonFloat0 = pairToPylon[_pairAddress].pylonFloat0;
    address _pylonFloat1 = pairToPylon[_pairAddress].pylonFloat1;

    uint float0Liquidity;
    uint float1Liquidity;
    uint ptTotalSupply = IUniswapV2ERC20(_pairAddress).totalSupply();

    if(_pylonFloat0 != address(0)) {
      float0Liquidity = IUniswapV2ERC20(_pairAddress).balanceOf(_pylonFloat0);
      uint float0Fee = float0Liquidity.mul(_feeLiquidity)/ptTotalSupply;
      uint _insurancePerMille = pylonAccounts[_pylonFloat0]
      //pylonAccounts[_pylonFloat0].insuranceUni += float0Fee.mul()

      //TODO: What's cheaper? Copy in memory, change vars and put back, or do lookup every time?

    }

    if (_pylonFloat1 != address(0)) {
      float1Liquidity = IUniswapV2ERC20(_pairAddress).balanceOf(_pylonFloat1);
    }




  }


  //Function called periodically to check if the reserves are too large, returns them back to pylon if they are
  function returnExcess() {

  }


  //TODO: Add extensive checks and limits system to the extractToken flow

  function extractToken() {

  }


  function migrateState() {

  }




}
