pragma solidity =0.5.16;
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol';
import "./libraries/SafeMath.sol";
import "../interfaces/IZirconPair.sol";
import "../interfaces/IZirconPylon.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "hardhat/console.sol";
import "./interfaces/IZirconEnergyFactory.sol";

contract ZirconEnergyRevenue is ReentrancyGuard  {
    using SafeMath for uint112;
    using SafeMath for uint256;

    uint public reserve;
    address public energyFactory;
    uint public pylon1Balance;
    uint public pylon0Balance;
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


    modifier _onlyPair() {
        require(zircon.pairAddress == msg.sender, "ZE: Not Pair");
        _;
    }

    constructor() public {
        energyFactory = msg.sender;
        pylon0Balance = 0;
        pylon1Balance = 0;
    }

    function initialize(address _pair, address _tokenA, address _tokenB, address energy0, address energy1, address pylon0, address pylon1) external {
        require(energyFactory == msg.sender, "ZER: Not properly called");
        zircon = Zircon(
            _pair,
            _tokenA,
            _tokenB,
            energy0,
            energy1,
            pylon0,
            pylon1
        );

    }

    function calculate(uint percentage) external _onlyPair nonReentrant {
        uint balance = IUniswapV2ERC20(zircon.pairAddress).balanceOf(address(this));
        require(balance > reserve, "ZER: Reverted");

        uint totalSupply = IUniswapV2ERC20(zircon.pairAddress).totalSupply();
        uint pylonBalance0 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(zircon.pylon0);
        uint pylonBalance1 = IUniswapV2ERC20(zircon.pairAddress).balanceOf(zircon.pylon1);
        {
            (uint112 _reservePair0, uint112 _reservePair1,) = IZirconPair(zircon.pairAddress).getReserves();
            uint112 reserve0 = IZirconPair(zircon.pairAddress).token0() == zircon.floatToken ? _reservePair0 : _reservePair1;
            uint112 reserve1 = IZirconPair(zircon.pairAddress).token0() == zircon.floatToken ? _reservePair1 : _reservePair0;

            pylon0Balance += percentage.mul(reserve1).mul(2).mul(pylonBalance0)/totalSupply.mul(1e18);
            pylon1Balance += percentage.mul(reserve0).mul(2).mul(pylonBalance1)/totalSupply.mul(1e18);
        }

        {
            uint feePercentageForRev = IZirconEnergyFactory(energyFactory).feePercentageRev();
            uint amount = balance.sub(reserve);
            uint pylon0Liq = (amount.mul(pylonBalance0)/totalSupply).mul(100 - feePercentageForRev)/(100);
            uint pylon1Liq = (amount.mul(pylonBalance1)/totalSupply).mul(100 - feePercentageForRev)/(100);
            _safeTransfer(zircon.pairAddress, zircon.energy0, pylon0Liq);
            _safeTransfer(zircon.pairAddress, zircon.energy1, pylon1Liq);
            reserve = balance.sub(pylon0Liq.add(pylon1Liq));
        }


    }

    function changePylonAddresses(address _pylonAddressA, address _pylonAddressB) external {
        require(msg.sender == energyFactory, 'Zircon: FORBIDDEN'); // sufficient check
        zircon.pylon0 = _pylonAddressA;
        zircon.pylon1 = _pylonAddressB;
    }

    function migrateLiquidity(address newEnergy) external{
        require(msg.sender == energyFactory, 'ZP: FORBIDDEN'); // sufficient check
        uint balance = IZirconPair(zircon.pairAddress).balanceOf(address(this));
        uint anchorBalance = IZirconPair(zircon.anchorToken).balanceOf(address(this));
        uint floatBalance = IZirconPair(zircon.floatToken).balanceOf(address(this));
        _safeTransfer(zircon.pairAddress, newEnergy, balance);
        _safeTransfer(zircon.anchorToken, newEnergy, anchorBalance);
        _safeTransfer(zircon.floatToken, newEnergy, floatBalance);
    }

    function getBalanceFromPair() external returns (uint balance) {
        require(msg.sender == zircon.pylon0 || msg.sender == zircon.pylon1, "ZE: Not Pylon");
        if(msg.sender == zircon.pylon0) {
            balance = pylon0Balance;
            pylon0Balance = 0;
        } else if(msg.sender == zircon.pylon1) {
            balance = pylon1Balance;
            pylon1Balance = 0;
        }
    }

    function getFees(address _token, uint _amount, address _to) external {
        require(msg.sender == energyFactory, "ZER: Not properly called");
        require(_amount != 0, "Operations: Cannot recover zero balance");

        if(_token == zircon.pairAddress) {
            require(_amount <= reserve, "ZER: Reverted");
            reserve = reserve.sub(_amount);
        }

        _safeTransfer(_token, _to, _amount);
    }
}
