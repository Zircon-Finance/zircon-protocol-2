pragma solidity ^0.5.16;
import "./ZirconERC20.sol";
import "./interfaces/IZirconPoolToken.sol";

contract ZirconPoolToken is ZirconERC20 {
    address public token;
    address public pair;
    bool public isAnchor;
    address public factory;
    address public pylon;

    constructor() public {
        factory = msg.sender;
    }

    function mint(address account, uint256 amount) external {
        require(msg.sender == pylon, 'ZPT: FORBIDDEN');
        // sufficient check
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        require(msg.sender == pylon, 'ZPT: FORBIDDEN');
        // sufficient check
        _burn(account, amount);
    }



    // called once by the factory at time of deployment
    function initialize(address _token0, address _pair, address _pylon, bool _isAnchor) external {
        require(msg.sender == factory, 'ZPT: FORBIDDEN');
        // sufficient check
        token = _token0;
        pair = _pair;
        isAnchor = _isAnchor;
        pylon = _pylon;
    }
}
