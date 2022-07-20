//SPDX-License-Identifier: Unlicense
pragma solidity =0.5.16;

import "hardhat/console.sol";
import "./interfaces/IZirconEnergy.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol';
import "./libraries/SafeMath.sol";
import "./interfaces/IZirconEnergyFactory.sol";
import "../interfaces/IZirconPair.sol";
import "../interfaces/IZirconPylon.sol";
import '../libraries/Math.sol';

contract ZirconEnergy is IZirconEnergy {

  /*
  Zircon Energy is the protocol-wide accumulator of revenue.
  Each Pylon ahas an energy that works as a "bank account" and works as an insurance portion balance

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
  }
  Pylon pylon;

  address energyFactory;
  uint anchorReserve; //Used to track balances and sync up in case of donations
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

  constructor() public {
    energyFactory = msg.sender;
  }

  function getFee() internal view returns (uint112 minFee, uint112 maxFee) {
    (minFee, maxFee) = IZirconEnergyFactory(energyFactory).getMinMaxFee();
  }

  function initialize(address _pylon, address _pair, address _token0, address _token1) external {
    require(msg.sender == energyFactory, 'Zircon: FORBIDDEN'); // sufficient check
    bool isFloatToken0 = IZirconPair(_pair).token0() == _token0;
    (address tokenA, address tokenB) = isFloatToken0 ? (_token0, _token1) : (_token1, _token0);
    pylon = Pylon(
      _pylon,
      _pair,
      tokenA,
      tokenB
    );
    // Approving pylon to use anchor tokens
    IUniswapV2ERC20(_pair).approve(_pylon, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
    IUniswapV2ERC20(tokenB).approve(_pylon, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
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
  function registerFee() external _onlyPylon {
    uint balance = IUniswapV2ERC20(pylon.anchorToken).balanceOf(address(this));
    require(balance >= anchorReserve, "ZE: Anchor not sent");

    uint register = balance.sub(anchorReserve);
    uint feePercentageForRev = IZirconEnergyFactory(energyFactory).feePercentageEnergy();
    address energyRevAddress = IZirconEnergyFactory(energyFactory).getEnergyRevenue(pylon.floatToken, pylon.anchorToken);
    uint toSend = register.mul(feePercentageForRev)/(100);
    if(toSend != 0) _safeTransfer(pylon.anchorToken, energyRevAddress, toSend);

    anchorReserve = balance.sub(toSend);
  }

//  function breakPiggybank(uint _requestedLiquidity) _onlyPylon external returns (uint returnedLiquidity) {
//    //Called by Pylon if omega is below 1. Pylon asks for X liquidity, breakPiggybank responds by depositing X or less and returning how much.
//    returnedLiquidity = pylon.insuranceUni >= _requestedLiquidity ? _requestedLiquidity : pylon.insuranceUni;
//
//    if (returnedLiquidity != 0) {
//      IUniswapV2ERC20(pylon.pairAddress).transfer(msg.sender, returnedLiquidity);
//      pylon.insuranceUni -= returnedLiquidity;
//    }
//  }
//
//  function syncFee() private {
//    uint feeLiquidity = IUniswapV2ERC20(pylon.pairAddress).balanceOf(address(this)).sub(lastPtBalance);
//    uint pylonLiquidity = IUniswapV2ERC20(pylon.pairAddress).balanceOf(pylon.pylonAddress);
//    uint ptTotalSupply = IUniswapV2ERC20(pylon.pairAddress).totalSupply();
//    uint insurancePerMille = IZirconEnergyFactory(energyFactory).insurancePerMille();
//
//    uint float0Fee = pylonLiquidity.mul(feeLiquidity)/ptTotalSupply;
//    pylon.insuranceUni += float0Fee.mul(insurancePerMille)/1e3;
//    pylon.revenueUni += float0Fee.mul((1e3)-(insurancePerMille))/1e3;
//    _returnExcess();
//
//    uint pairLiquidity = ptTotalSupply.add(pylonLiquidity); //fundamentally impossible for this to over/sub flow
//
//    pylon.revenueUni += feeLiquidity.mul(pairLiquidity)/ptTotalSupply;
//
//    lastPtBalance = IUniswapV2ERC20(pylon.pairAddress).balanceOf(address(this));
//  }
//
//  function syncPylonFee() _onlyPylon external {
//    syncFee();
//  }
//
//  //Called by pair mintFee to register inflow. Any excess is spread evenly.
//  function syncPairFee() _onlyPair external {
//    syncFee();
//  }


  //Returns the fee in basis points (0.01% units, needs to be divided by 10000)
  //Uses two piece-wise parabolas. Between 0.45 and 0.55 the fee is very low (minFee).
  //After the cutoff it uses a steeper parabola defined by a max fee at the extremes (very high, up to 1% by default).
  function getFeeByGamma(uint gammaMulDecimals) external view returns (uint amount) {
    (uint _minFee, uint _maxFee) = getFee();
    uint _gammaHalf = 5e17;
    uint x = (gammaMulDecimals > _gammaHalf) ? (gammaMulDecimals - _gammaHalf).mul(10) : (_gammaHalf - gammaMulDecimals).mul(10);
    if (gammaMulDecimals <= 45e16 || gammaMulDecimals >= 55e16) {
      amount = (_maxFee.mul(x)/1e18).mul(x)/(25e18); //25 is a reduction factor based on the 0.45-0.55 range we're using.
    } else {
      amount = ((_minFee.mul(x)/1e18).mul(x).mul(36)/(1e18)).add(_minFee); //Ensures minFee is the lowest value.
    }
  }

  //Function called periodically to check if the reserves are too large, returns them back to pylon if they are
//  function _returnExcess() private {
//
//    //Under an LP only model there is no "excess". You may need to cover 100% of the pool's worth
//    //But if it is over 100% (maybe due to heavy outflows) this function returns funds to Pylon LPs.
//    //Called by syncFee
//
//    //TODO: Critical to let Pylon manage uni token excesses effectively
//    //Pylon storage pylonRef = pylonAccounts[_pylonAddress];
//    uint pylonBalance = IUniswapV2ERC20(pylon.pairAddress).balanceOf(pylon.pylonAddress);
//    if(pylon.insuranceUni > pylonBalance) {
//      uint liquidity = pylon.insuranceUni - pylonBalance;
//      _safeTransfer(pylon.pairAddress, pylon.pylonAddress, liquidity);
//      pylon.insuranceUni -= liquidity;
//    }
//
//  }
  function migrateLiquidity(address newEnergy) external{
    require(msg.sender == energyFactory, 'ZP: FORBIDDEN'); // sufficient check

    uint balance = IZirconPair(pylon.pairAddress).balanceOf(address(this));
    uint balanceAnchor = IUniswapV2ERC20(pylon.anchorToken).balanceOf(address(this));

    _safeTransfer(pylon.pairAddress, newEnergy, balance);
    _safeTransfer(pylon.anchorToken, newEnergy, balanceAnchor);
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
