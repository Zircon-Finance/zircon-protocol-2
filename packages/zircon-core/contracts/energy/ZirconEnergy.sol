//SPDX-License-Identifier: Unlicense
pragma solidity =0.5.16;

import "hardhat/console.sol";
import "./interfaces/IZirconEnergy.sol";
import "./interfaces/IUniswapV2ERC20.sol";
import "./libraries/SafeMath.sol";
import "../interfaces/IZirconPair.sol";

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

  using SafeMath for uint112;
  using SafeMath for uint256;

  struct Pylon {
    address pylonAddress;
    address pairAddress;
    address floatToken;
    address anchorToken;
    uint insurancePerMille;
    uint insuranceUni;
    uint revenueUni;
  }
  Pylon pylon;
  struct PairFields {
    address pylonFloat0; //Means that this pylon has token0 as float
    address pylonFloat1;
    uint revenueUni;
  }
  address energyFactory;
  uint lastPtBalance; //Used to track balances and sync up in case of donations
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

  constructor() public {
    energyFactory = msg.sender;
  }

  function initialize(address _pylon, address _pair, address _token0, address _token1, uint _insurancePerMille) external {
    require(msg.sender == energyFactory, 'Zircon: FORBIDDEN'); // sufficient check

    bool isFloatToken0 = IZirconPair(_pair).token0() == _token0;
    (address tokenA, address tokenB) = true ? (_token0, _token1) : (_token1, _token0);
    pylon = Pylon(
      _pylon,
      _pair,
      tokenA,
      tokenB,
      _insurancePerMille,
      1,
      1
    );


  }

  // ****** HELPER FUNCTIONS *****
  function _safeTransfer(address token, address to, uint value) private {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'Zircon Pylon: TRANSFER_FAILED');
  }

  modifier _onlyPylon() {
    require(pylon.pylonAddress == msg.sender, "ZE: Not Pylon");
    _;
  }
  modifier _onlyPair() {
    require(pylon.pairAddress == msg.sender, "ZE: Not Pylon");
    _;
  }

  function breakPiggybank(uint _requestedLiquidity) _onlyPylon external returns (uint returnedLiquidity) {
    //Called by Pylon if omega is below 1. Pylon asks for X liquidity, breakPiggybank responds by depositing X or less and returning how much.
    returnedLiquidity = pylon.insuranceUni >= _requestedLiquidity ? _requestedLiquidity : pylon.insuranceUni;

    if (returnedLiquidity != 0) {
      IUniswapV2ERC20(pylon.pairAddress).transfer(msg.sender, returnedLiquidity);
      pylon.insuranceUni -= returnedLiquidity;
    }
  }

  function syncFee() private {
    uint feeLiquidity = IUniswapV2ERC20(pylon.pairAddress).balanceOf(address(this)).sub(lastPtBalance);
    uint pylonLiquidity = IUniswapV2ERC20(pylon.pairAddress).balanceOf(pylon.pylonAddress);
    uint ptTotalSupply = IUniswapV2ERC20(pylon.pairAddress).totalSupply();

    uint float0Fee = pylonLiquidity.mul(feeLiquidity)/ptTotalSupply;
    pylon.insuranceUni += float0Fee.mul(pylon.insurancePerMille)/1e3;
    pylon.revenueUni += float0Fee.mul((1e3)-(pylon.insurancePerMille))/1e3;
    _returnExcess();

    uint pairLiquidity = ptTotalSupply.add(pylonLiquidity); //fundamentally impossible for this to over/sub flow

    pylon.revenueUni += feeLiquidity.mul(pairLiquidity)/ptTotalSupply;

    lastPtBalance = IUniswapV2ERC20(pylon.pairAddress).balanceOf(address(this));
  }

  function syncPylonFee() _onlyPylon external {
    syncFee();
  }

  //Called by pair mintFee to register inflow. Any excess is spread evenly.
  function syncPairFee() _onlyPair external {
    syncFee();
  }


  //    uint float0Liquidity;
//    uint float1Liquidity;
//
//    if(_pylonFloat0 != address(0)) {
//      float0Liquidity = IUniswapV2ERC20(_pairAddress).balanceOf(_pylonFloat0);
//      uint float0Fee = float0Liquidity.mul(_feeLiquidity)/ptTotalSupply;
//      Pylon storage pylonRef = pylonAccounts[_pylonFloat0]; //Storage makes this a mutable reference vs. copying with Memory
//      uint _insurancePerMille = pylonRef.insurancePerMille;
//
//      pylonRef.insuranceUni += float0Fee.mul(_insurancePerMille)/1000;
//      pylonRef.revenueUni += float0Fee.mul(1000 - _insurancePerMille)/1000;
//      _returnExcess(_pylonFloat0);
//    }
//
//    if (_pylonFloat1 != address(0)) {
//      float1Liquidity = IUniswapV2ERC20(_pairAddress).balanceOf(_pylonFloat1);
//
//      uint float1Fee = float1Liquidity.mul(_feeLiquidity)/ptTotalSupply;
//      Pylon storage pylonRef = pylonAccounts[_pylonFloat1]; //Storage makes this a mutable reference vs. copying with Memory
//      uint _insurancePerMille = pylonRef.insurancePerMille;
//
//      pylonRef.insuranceUni += float1Fee.mul(_insurancePerMille)/1000;
//      pylonRef.revenueUni += float1Fee.mul(1000 - _insurancePerMille)/1000;
//      _returnExcess(_pylonFloat1);
//    }



  //Function called periodically to check if the reserves are too large, returns them back to pylon if they are
  function _returnExcess() private {

    //Under an LP only model there is no "excess". You may need to cover 100% of the pool's worth
    //But if it is over 100% (maybe due to heavy outflows) this function returns funds to Pylon LPs.
    //Called by syncFee

    //TODO: Critical to let Pylon manage uni token excesses effectively
    //Pylon storage pylonRef = pylonAccounts[_pylonAddress];
    uint pylonBalance = IUniswapV2ERC20(pylon.pairAddress).balanceOf(pylon.pylonAddress);
    if(pylon.insuranceUni > pylonBalance) {
      uint liquidity = pylon.insuranceUni - pylonBalance;
      _safeTransfer(pylon.pairAddress, pylon.pylonAddress, liquidity);
      pylon.insuranceUni -= liquidity;
    }

  }


//  //TODO: Add extensive checks and limits system to the extractToken flow
//
//  function extractToken() external {
//
//  }
//
//
//  function migrateState() external {
//
//  }
//
//  function setInsuranceFactor() external {
//
//  }


}
