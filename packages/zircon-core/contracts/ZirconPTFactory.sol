// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
import './ZirconPoolToken.sol';
import './interfaces/IZirconPTFactory.sol';

contract ZirconPTFactory is IZirconPTFactory {
    mapping(address => mapping(address => address)) public getPoolToken;

    address public migrator;
    address public feeToSetter;

    constructor(address migrator_, address feeToSetter_) public {
        migrator = migrator_;
        feeToSetter = feeToSetter_;
    }

    modifier _onlyMigrator {
        require(msg.sender == migrator, 'ZPT: FORBIDDEN');
        _;
    }

    modifier _onlyFeeToSetter {
        require(msg.sender == feeToSetter, 'ZPT: FORBIDDEN');
        _;
    }

    function getInitHash(address _pylonFactory) public pure returns(bytes32){
        bytes memory bytecode = getCreationBytecode(_pylonFactory);
        return keccak256(abi.encodePacked(bytecode));
    }

    function getCreationBytecode(address _pylonFactory) public pure returns (bytes memory) {
        bytes memory bytecode = type(ZirconPoolToken).creationCode;

        return abi.encodePacked(bytecode, abi.encode(_pylonFactory));
    }

    function createPTAddress(address _token, address pylonAddress) external returns (address poolToken) {
        // Creating Token
        bytes memory bytecode = getCreationBytecode(msg.sender);
        bytes32 salt = keccak256(abi.encodePacked(_token, pylonAddress));
        assembly {
            poolToken := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        getPoolToken[pylonAddress][_token] = poolToken;

    }

    function changePylonAddress(address oldPylon, address tokenA, address tokenB, address newPylon, address pylonFactory) external  _onlyMigrator {

        address poolTokenA = address(uint(keccak256(abi.encodePacked(
                hex'ff',
                address(this),
                keccak256(abi.encodePacked(tokenA, oldPylon)),
                getInitHash(pylonFactory) // init code hash
            ))));

        address poolTokenB = address(uint(keccak256(abi.encodePacked(
                hex'ff',
                address(this),
                keccak256(abi.encodePacked(tokenB, oldPylon)),
                getInitHash(pylonFactory) // init code hash
            ))));

        ZirconPoolToken(poolTokenA).changePylonAddress(newPylon);
        ZirconPoolToken(poolTokenB).changePylonAddress(newPylon);

        getPoolToken[newPylon][tokenA] = poolTokenA;
        getPoolToken[newPylon][tokenB] = poolTokenB;

    }

    function setMigrator(address _migrator) external _onlyMigrator {
        migrator = _migrator;
    }

    function setFeeToSetter(address _feeToSetter) external _onlyFeeToSetter {
        feeToSetter = _feeToSetter;
    }

}
