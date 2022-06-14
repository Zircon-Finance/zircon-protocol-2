pragma solidity =0.5.16;
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol';
import "./libraries/SafeMath.sol";
import "../interfaces/IZirconPair.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ZirconEnergyRevenue is ReentrancyGuard  {
    using SafeMath for uint112;
    using SafeMath for uint256;

    uint public reserve;
    address public energyfactory;
    struct Zircon {
        address pairAddress;
        address floatToken;
        address anchorToken;
        address energy0;
        address energy1;
        address pylon0;
        address pylon1;
    }
    Zircon zircon;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'Zircon Pylon: TRANSFER_FAILED');
    }


    modifier _onlyEnergy() {
        require(msg.sender == zircon.energy0 || msg.sender == zircon.energy1, "ZE: Not Pylon");
        _;
    }
    modifier _onlyPair() {
        require(zircon.pairAddress == msg.sender, "ZE: Not Pylon");
        _;
    }

    constructor() public {
        energyfactory = msg.sender;
    }

    function initialize(address _pair, address _tokenA, address _tokenB, address energy0, address energy1, address pylon0, address pylon1) external {
        require(energyfactory == msg.sender, "ZER: Not properly called");
        bool isFloatToken0 = IZirconPair(_pair).token0() == _tokenA;
        (address tokenA, address tokenB) = isFloatToken0 ? (_tokenA, _tokenB) : (_tokenA, _tokenB);
        zircon = Zircon(
        _pair,
        tokenA,
        tokenB,
        energy0,
        energy1,
        pylon0,
        pylon1
        );

    }

    function calculate() external _onlyPair nonReentrant {
        uint balance = IUniswapV2ERC20(zircon.pairAddress).balanceOf(address(this));
        console.log("zer: Balance", balance);
        require(balance > reserve, "ZER: Reverted");

        uint pylonBalance0 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(zircon.pylon0);
        uint pylonBalance1 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(zircon.pylon1);
        uint totalSupply = IUniswapV2ERC20(zircon.pairAddress).totalSupply();
        uint amount = balance.sub(reserve);

        uint pylon0Liq = amount.mul(pylonBalance0)/totalSupply;
        uint pylon1Liq = amount.mul(pylonBalance1)/totalSupply;

        console.log("zer::pylon0", pylon0Liq, zircon.pylon0);
        console.log("zer::pylon1", pylon1Liq, zircon.pylon1);
        console.log("zer::amount", amount);

        _safeTransfer(zircon.pairAddress, zircon.energy0, pylon0Liq);
        _safeTransfer(zircon.pairAddress, zircon.energy1, pylon1Liq);
//        uint balance2 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(address(this));
//        uint balance3 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(zircon.energy0);
//        uint balance4 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(zircon.energy1);
//        console.log("zer: Balance2", balance2);
//        console.log("zer: Balance3", balance3);
//        console.log("zer: Balance4", balance4);

        reserve = balance.sub(pylon0Liq.add(pylon1Liq));
        console.log("zer::reserve", reserve);
    }

}
