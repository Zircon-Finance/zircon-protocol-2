pragma solidity ^0.5.16;

interface IZirconEnergyRevenue {
    function initialize(address _pair, address _tokenA, address _tokenB, address energy0, address energy1, address pylon0, address pylon1) external;
    function calculate() external;
}
