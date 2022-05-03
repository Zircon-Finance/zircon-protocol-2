pragma solidity =0.5.16;
import "./interfaces/IUniswapV2ERC20.sol";
import "./libraries/SafeMath.sol";
import "../interfaces/IZirconPair.sol";
import "hardhat/console.sol";

contract ZirconEnergyRevenue {
    using SafeMath for uint112;
    using SafeMath for uint256;

    uint public reserve;
    uint public reservePylon0;
    uint public reservePylon1;
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
        (address tokenA, address tokenB) = true ? (_tokenA, _tokenB) : (_tokenA, _tokenB);
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

    function calculate() external _onlyPair {
        uint balance = IUniswapV2ERC20(zircon.pairAddress).balanceOf(address(this));
        console.log("ZER: Balance", balance);
        require(balance > reserve, "ZER: Reverted");

        uint pylonBalance0 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(zircon.pylon0);
        uint pylonBalance1 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(zircon.pylon1);
        uint totalSupply = IUniswapV2ERC20(zircon.pairAddress).totalSupply();
        console.log("ZER: Balance0", pylonBalance0);
        console.log("ZER: Balance1", pylonBalance1);
        console.log("Pylon0", zircon.pylon0);
        console.log("Pylon1", zircon.pylon1);
        console.log("Pylon1", totalSupply);
        uint amount = balance.sub(reserve);

        uint pylon0Liq = amount.mul(pylonBalance0)/totalSupply;
        reservePylon0 += pylon0Liq;

        uint pylon1Liq = amount.mul(pylonBalance1)/totalSupply;
        reservePylon1 += pylon1Liq;
        reserve = balance;
    }

}
