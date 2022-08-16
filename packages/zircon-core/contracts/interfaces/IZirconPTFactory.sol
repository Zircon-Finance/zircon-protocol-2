pragma solidity =0.5.16;

interface IZirconPTFactory {
    function createPTAddress(address _token, address pylonAddress) external returns (address poolToken);
    function changePylonAddress(address oldPylon, address tokenA, address tokenB, address newPylon, address pylonFactory) external;
    function setMigrator(address _migrator) external;
    function setFeeToSetter(address _feeToSetter) external;
}
