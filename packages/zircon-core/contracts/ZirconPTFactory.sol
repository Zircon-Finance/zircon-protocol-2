// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;
import './ZirconPoolToken.sol';
import './interfaces/IZirconPTFactory.sol';

contract ZirconPTFactory is IZirconPTFactory {

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
    }

}
