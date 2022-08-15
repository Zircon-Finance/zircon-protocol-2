//SPDX-License-Identifier: Unlicense
pragma solidity =0.5.16;

//import "hardhat/console.sol";
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

  //Called when tokens are withdrawn to ensure pylon doesn't get bricked
  function syncReserve() external _onlyPylon {
      anchorReserve = IUniswapV2ERC20(pylon.anchorToken).balanceOf(address(this));
  }


  //Returns the fee in basis points (0.01% units, needs to be divided by 10000)
  //Uses two piece-wise parabolas. Between 0.45 and 0.55 the fee is very low (minFee).
  //After the cutoff it uses a steeper parabola defined by a max fee at the extremes (very high, up to 1% by default).
  function getFeeByGamma(uint gammaMulDecimals) external view returns (uint amount) {
    (uint _minFee, uint _maxFee) = getFee();
    uint _gammaHalf = 5e17;
    uint x = (gammaMulDecimals > _gammaHalf) ? (gammaMulDecimals - _gammaHalf).mul(10) : (_gammaHalf - gammaMulDecimals).mul(10);
    if (gammaMulDecimals <= 45e16 || gammaMulDecimals >= 55e16) {
      amount = (_maxFee.mul(x).mul(x))/(25e36); //25 is a reduction factor based on the 0.45-0.55 range we're using.
    } else {
      amount = (_minFee.mul(x).mul(x).mul(36)/(1e36)).add(_minFee); //Ensures minFee is the lowest value.
    }
  }


  function migrateLiquidity(address newEnergy) external{
    require(msg.sender == energyFactory, 'ZP: FORBIDDEN'); // sufficient check

    uint balance = IZirconPair(pylon.pairAddress).balanceOf(address(this));
    uint balanceAnchor = IUniswapV2ERC20(pylon.anchorToken).balanceOf(address(this));

    _safeTransfer(pylon.pairAddress, newEnergy, balance);
    _safeTransfer(pylon.anchorToken, newEnergy, balanceAnchor);
  }



}
