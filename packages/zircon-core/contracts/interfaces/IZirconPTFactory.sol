pragma solidity >=0.5.16;

interface IZirconPTFactory {
    function createPTAddress(address _token, address pylonAddress) external returns (address poolToken);
}
