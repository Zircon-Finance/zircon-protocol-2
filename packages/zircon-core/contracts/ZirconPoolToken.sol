pragma solidity ^0.5.16;
import "./ZirconERC20.sol";
import "./interfaces/IZirconPoolToken.sol";

contract ZirconPoolToken is ZirconERC20 {
    address public token;
    address public pair;
    bool public isAnchor;
    address public pylon;
    address public factory;

    constructor(address pylonFactory) public {
        factory = pylonFactory;
    }

    modifier onlyPylon {
        require(msg.sender == pylon, 'ZPT: FORBIDDEN');
        _;
    }

    function mint(address account, uint256 amount) external onlyPylon{
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyPylon{
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

    function changePylonAddress(address newPylon) external {
        require(msg.sender == factory, 'ZPT: FORBIDDEN');
        pylon = newPylon;
    }
}
