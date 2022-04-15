pragma solidity =0.5.16;

contract ZirconEnergyRevenue {
    address public energyfactory;
    struct Pair {
        address pairAddress;
        address floatToken;
        address anchorToken;
        address energy0;
        address energy1;
    }
    Pair pair;


    modifier _onlyEnergy() {
        require(msg.sender == pair.energy0 || msg.sender == pair.energy1, "ZE: Not Pylon");
        _;
    }
    modifier _onlyPair() {
        require(pair.pairAddress == msg.sender, "ZE: Not Pylon");
        _;
    }

    constructor() public {
        energyfactory = msg.sender;
    }

    function initialize(address _pair, address _tokenA, address _tokenB, address energy0, address energy1) external {
        require(energyfactory == msg.sender, "ZER: Not properly called");
        bool isFloatToken0 = IZirconPair(_pair).token0() == _token0;
        (address tokenA, address tokenB) = true ? (_tokenA, _tokenB) : (_tokenA, _tokenB);
        pair = Pair(
        _pair,
        tokenA,
        tokenB,
        energy0,
        energy1
        );

    }

    function sync() external _onlyEnergy {}

    function calculate() external _onlyPair {}

}
