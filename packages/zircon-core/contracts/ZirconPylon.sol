pragma solidity ^0.5.16;
import './libraries/Math.sol';
import './interfaces/IZirconPair.sol';
import './interfaces/IZirconPoolToken.sol';
import "./libraries/SafeMath.sol";
//import "./libraries/UQ112x112.sol";
import "./libraries/ZirconLibrary.sol";
import "./interfaces/IZirconPylonFactory.sol";
import "./interfaces/IZirconPylon.sol";
import "./energy/interfaces/IZirconEnergy.sol";
import "./energy/interfaces/IZirconEnergyRevenue.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol';
//import "hardhat/console.sol";

contract ZirconPylon is IZirconPylon, ReentrancyGuard {
    // **** Libraries ****
    using SafeMath for uint112;
    using SafeMath for uint256;
    //    using UQ112x112 for uint224;

    // **** STRUCTS *****
    struct PylonToken {
        address float;
        address anchor;
    }
    PylonToken public pylonToken;
    // ***** GLOBAL VARIABLES ******

    // ***** The address of the other components ******
    address public pairAddress;
    address public factoryAddress;
    address public pairFactoryAddress;
    address public floatPoolTokenAddress;
    address public anchorPoolTokenAddress;
    address public energyAddress;

    // Indicates if in the pair the token0 is float or anchor
    bool public isFloatReserve0;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));
    bytes4 private constant SELECTOR_FROM = bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));

    // ***** Variables for calculations *****
    uint public virtualAnchorBalance;
    //uint public dynamicFeePercentage; //Uses basis points (0.01%, /10000)
    uint public gammaMulDecimals; // Percentage of float over total pool value. Name represents the fact that this is always the numerator of a fraction with 10**18 as denominator.
    uint public muMulDecimals; // A "permanence" factor that is used to adjust fee redistribution. Stored as mu + 1 because unsigned math

    uint public gammaEMA; //A moving average of the gamma used to make price manipulation vastly more complex
    uint public thisBlockEMA; //A storage var for this block's changes.
    uint public EMASamples;

    uint public EMABlockNumber; //Last block height of the EMA update
    uint public muBlockNumber; //block height of last mu update
    uint public muOldGamma; //gamma value at last mu update
    //uint public muUpdatePeriod; //parameter to set frequency of mu snapshots. We don't want to capture too much noise

    //uint public deltaGammaThreshold; //Shouldn't be unreasonably low. A 3-4% change in a single block should be large enough to detect manipulation attempts.
    //uint public deltaGammaMinFee;

    uint public lastK;
    uint public lastPoolTokens;

    uint112 private reserve0;// uses single storage slot, accessible via getReserves (always anchor)
    uint112 private reserve1;// us es single storage slot, accessible via getReserves (always float)
    uint32 private blockTimestampLast; // uses single storage slot, accessible via getReserves

    // global variable used for testing
    uint private testMultiplier = 1e16;

    // **** MODIFIERS *****
    uint public initialized = 0;
    modifier isInitialized() {
        require(initialized == 1, 'ZP: NOT INITIALIZED');
        _;
    }

    // Calls dummy function with lock modifier
    //    modifier pairUnlocked() {
    //        IZirconPair(pairAddress).tryLock();
    //        _;
    //    }

    //    modifier blockRecursion() {
    //        // TODO: Should do some kind of block height check to ensure this user hasn't
    //        // already called any of these functions
    //        _;
    //    }

    // **** EVENTS ****
    event PylonUpdate(uint _reserve0, uint _reserve1);
    event PylonSync(uint _vab, uint _gamma);

    // Transform in just one event
    event MintSync(address sender, uint aIn0, bool isAnchor);
    event MintAsync(address sender, uint aIn0, uint aIn1);
    event MintAsync100(address sender, uint aIn0, bool isAnchor);
    event Burn(address sender, uint aIn0, bool isAnchor);
    event BurnAsync(address sender, uint aIn0, uint aIn1);
    event Excess(uint aIn0, bool isAnchor);
    event DeltaTax(uint aIn0, bool applied);

    // ****** CONSTRUCTOR ******
    constructor() public {
        factoryAddress = msg.sender;
    }

    // ****** HELPER FUNCTIONS *****
    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'ZP: TRANSFER_FAILED');
    }

    function _safeTransferFrom(address token, address from, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_FROM, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'ZP: TRANSFER_FROM_FAILED');
    }

    function getSyncReserves()  public view returns  (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /// @notice Private function to get pair reserves normalized on float and anchor
    // @return _reserve0 -> float
    // @return _reserve1 -> Anchor
    function getPairReservesNormalized()  private view returns (uint112 _reserve0, uint112 _reserve1) {
        (uint112 _reservePair0, uint112 _reservePair1,) = IZirconPair(pairAddress).getReserves();
        _reserve0 = isFloatReserve0 ? _reservePair0 : _reservePair1;
        _reserve1 = isFloatReserve0 ? _reservePair1 : _reservePair0;
    }

    /// @notice Function that returns pair reserves translated to pylon
    /// @return Float -> _reserve0
    /// @dev Anchor -> _reserve1
    function getPairReservesTranslated(uint error0, uint error1)  private view returns  (uint _reserve0, uint _reserve1) {
        (uint112 _reservePair0, uint112 _reservePair1) = getPairReservesNormalized();
        _reserve0 = translateToPylon(uint(_reservePair0), error0);
        _reserve1 = translateToPylon(uint(_reservePair1), error1);
    }

    /// @notice Function to obtain Pair Reserves on Pylon Basis
    /// In case PTT Or PTB are null it will @return errorReturn
    function translateToPylon(uint toConvert, uint errorReturn) view private returns (uint amount){
        uint ptb = IZirconPair(pairAddress).balanceOf(address(this));
        uint ptt = IZirconPair(pairAddress).totalSupply();
        amount =  (ptt == 0 || ptb == 0) ? errorReturn : toConvert.mul(ptb)/ptt;
    }


    /// @notice Helper function to calculate slippage-adjusted share of pool
    function _disincorporateAmount(uint _amountIn, bool isAnchor) private view returns (uint amount0, uint amount1) {
        (uint112 _reservePair0, uint112 _reservePair1) = getPairReservesNormalized();
        amount0 = !isAnchor ? _amountIn/2 : ZirconLibrary.getAmountOut(_amountIn/2, _reservePair1, _reservePair0);
        amount1 = isAnchor ? _amountIn/2 : ZirconLibrary.getAmountOut(_amountIn/2, _reservePair0, _reservePair1);
    }

    function getLiquidityFromPoolTokens(uint amountIn0, uint amountIn1,  bool shouldMintAnchor, IZirconPoolToken pt) private view returns (uint liquidity, uint amountInAdjusted){
        (uint112 _pairReserve0, uint112 _pairReserve1) = getPairReservesNormalized();
        (uint112 _reserve0, uint112 _reserve1,) = getSyncReserves(); // gas savings
        if (shouldMintAnchor) {
            amountInAdjusted = Math.min((amountIn0.mul(_pairReserve1).mul(2))/_pairReserve0, amountIn1.mul(2)); //Adjust AmountIn0 to its value in Anchor tokens
            liquidity = ZirconLibrary.calculatePTU(shouldMintAnchor, amountInAdjusted, pt.totalSupply(), translateToPylon(_pairReserve1, 0), _reserve1, gammaMulDecimals, virtualAnchorBalance);
        }else{
            amountInAdjusted = Math.min((amountIn1.mul(_pairReserve0).mul(2))/_pairReserve1, amountIn0.mul(2)); //Adjust AmountIn1 to its value in Float tokens
            liquidity = ZirconLibrary.calculatePTU(shouldMintAnchor, amountInAdjusted, pt.totalSupply(), translateToPylon(_pairReserve0, 0), _reserve0, gammaMulDecimals, virtualAnchorBalance);
        }
    }

    // ***** INIT ******
    // @notice Called once by the factory at time of deployment
    // @_floatPoolTokenAddress -> Contains Address Of Float PT
    // @_anchorPoolTokenAddress -> Contains Address Of Anchor PT
    // @floatToken -> Float token
    // @anchorToken -> Anchor token
    function initialize(address _floatPoolTokenAddress, address _anchorPoolTokenAddress, address _floatToken, address _anchorToken, address _pairAddress, address _pairFactoryAddress, address _energy) external nonReentrant {
        require(msg.sender == factoryAddress, 'ZP: FORBIDDEN'); // sufficient check
        floatPoolTokenAddress = _floatPoolTokenAddress;
        anchorPoolTokenAddress = _anchorPoolTokenAddress;
        pairAddress = _pairAddress;
        isFloatReserve0 = IZirconPair(_pairAddress).token0() == _floatToken;
        pylonToken = PylonToken(_floatToken, _anchorToken);
        pairFactoryAddress = _pairFactoryAddress;
        energyAddress = _energy;
    }

    // @notice On init pylon we have to handle two cases
    // The first case is when we initialize the pair through the pylon
    // And the second one is when initialize the pylon with a pair already existing
    function initPylon(address _to) external nonReentrant returns (uint floatLiquidity, uint anchorLiquidity) {
        require(initialized == 0, "Already initialized");
        uint balance0 = IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));
        uint balance1 = IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));
        require(balance0 > 0 && balance1 > 0, "ZP: NOT_ENOUGH");

        // Let's get the balances so we can see what the user send us
        // As we are initializing the reserves are going to be null


        // Let's see if the pair contains some reserves
        (uint112 _reservePair0, uint112 _reservePair1) = getPairReservesNormalized();
        // If pair contains reserves we have to use the ratio of the Pair so...
        virtualAnchorBalance = balance1;

        if (_reservePair0 > 0 && _reservePair1 > 0) {
            uint tpvAnchorPrime = (virtualAnchorBalance.add(balance0.mul(_reservePair1)/_reservePair0));

            if (virtualAnchorBalance < tpvAnchorPrime/2) {
                gammaMulDecimals = 1e18 - (virtualAnchorBalance.mul(1e18)/(tpvAnchorPrime));
            } else {
                gammaMulDecimals = tpvAnchorPrime.mul(1e18)/(virtualAnchorBalance.mul(4)); // Subflow already checked by if statement
            }
            //console.log("ZP: GAMMA_MUL_DECIMALS", gammaMulDecimals);
            // This is gamma formula when FTV <= 50%
        } else {
            // When Pair is not initialized let's start gamma to 0.5
            gammaMulDecimals = 500000000000000000;
        }


        // Time to mint some tokens

        (anchorLiquidity) = _calculateSyncLiquidity(balance1, 0, _reservePair1, anchorPoolTokenAddress, true);
        (floatLiquidity) = _calculateSyncLiquidity(balance0, 0, _reservePair0, floatPoolTokenAddress, false);
        _syncMinting();

        IZirconPoolToken(anchorPoolTokenAddress).mint(_to, anchorLiquidity);
        IZirconPoolToken(floatPoolTokenAddress).mint(_to, floatLiquidity);

        muMulDecimals = gammaMulDecimals; //Starts as gamma, diversifies over time. Used to calculate fee distribution

        //Here it updates the state and throws liquidity into the pool if possible
        //_update(); TODO
        _update();
        initialized = 1;
    }


    // ***** EXCESS RESERVES ******


    // This function takes
    // @balance0 & @balance1 -> The New Balances After A Sync Update
    // @max0 & @max1 -> The maximum that we can save on the reserves
    // If we have any excess reserves we donate them to the pool
    function updateReservesRemovingExcess(uint newReserve0, uint newReserve1, uint112 max0, uint112 max1) private {
        uint ptl = 0;
        if (max0 < newReserve0) {
            _safeTransfer(pylonToken.float, pairAddress, newReserve0.sub(max0));
            (ptl,,) = IZirconPair(pairAddress).mintOneSide(address(this), isFloatReserve0);
            reserve0 = max0;
        } else {
            reserve0 = uint112(newReserve0);
        }
        if (max1 < newReserve1) {
            _safeTransfer(pylonToken.anchor, pairAddress, newReserve1.sub(max1));
            (ptl,,) = IZirconPair(pairAddress).mintOneSide(address(this), !isFloatReserve0);
            reserve1 = max1;
        }else{
            reserve1 = uint112(newReserve1);
        }
        emit PylonUpdate(reserve0, reserve1);
    }


    // ****** UPDATE ********

    // Update reserves and, on the first call per block, price accumulator
    // Any excess of balance is going to be donated to the pair
    // So... here we get the maximum off both tokens and we mint Pool Tokens

    // Sends pylonReserves to pool if there is a match
    function _syncMinting() private {
        // Let's take the current balances
        uint balance0 = IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));
        uint balance1 = IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));

        // Intializing the variables, (Maybe gas consuming let's see how to sort out this
        // Getting pair reserves and updating variables before minting
        // Max0 and Max1 are two variables representing the maximum that can be minted on sync
        // Max0/2 & Max1/2 remain as reserves on the pylon for withdrawals
        // In the case the pair hasn't been initialized pair reserves will be 0 so we take our current balance as the maximum
        (uint reservesTranslated0, uint reservesTranslated1) = getPairReservesTranslated(balance0, balance1);
        uint maximumPercentageSync = IZirconPylonFactory(factoryAddress).maximumPercentageSync();

        uint112 max0 = uint112(reservesTranslated0.mul(maximumPercentageSync)/200);
        uint112 max1 = uint112(reservesTranslated1.mul(maximumPercentageSync)/200);
        // Pylon Update Minting
        if (balance0 > max0 && balance1 > max1) {
            (uint pairReserves0, uint pairReserves1) = getPairReservesNormalized();


            // Get Maximum simple gets the maximum quantity of token that we can mint
            uint px;
            uint py;
            if (pairReserves0 == 0 && pairReserves1 == 0) {
                (px, py) = ZirconLibrary._getMaximum(
                    balance0,
                    balance1,
                    balance0.sub(max0), balance1.sub(max1));
            }else{
                (px, py) = ZirconLibrary._getMaximum(
                    pairReserves0,
                    pairReserves1,
                    balance0.sub(max0), balance1.sub(max1));
            }


            console.log("mintAndSync px, py:", px/1e14, py/1e14);
            // Transferring tokens to pair and minting
            if(px != 0) _safeTransfer(pylonToken.float, pairAddress, px);
            if(py != 0) _safeTransfer(pylonToken.anchor, pairAddress, py);
            console.log("minting", px/1e14, py/1e14);
            IZirconPair(pairAddress).mint(address(this));
        }
        // Let's remove the tokens that are above max0 and max1, and donate them to the pool
        // This is for cases where somebody just donates tokens to pylon; tx reverts if this done via core functions
    }
    // @notice This Function is called to update some variables needed for calculation
    function _update() private {
        (uint112 _pairReserve0, uint112 _pairReserve1) = getPairReservesNormalized();
        lastPoolTokens = IZirconPair(pairAddress).totalSupply();
        lastK = uint(_pairReserve0).mul(_pairReserve1);

        //TODO: Seems like uniswap dead weight
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        //uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        blockTimestampLast = blockTimestamp;

        // Removing excess reserves from the pool
        uint balance0 = IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));
        uint balance1 = IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));
        (uint reservesTranslated0, uint reservesTranslated1) = getPairReservesTranslated(balance0, balance1);
        uint maximumPercentageSync = IZirconPylonFactory(factoryAddress).maximumPercentageSync();
        uint112 max0 = uint112(reservesTranslated0.mul(maximumPercentageSync)/100);
        uint112 max1 = uint112(reservesTranslated1.mul(maximumPercentageSync)/100);
        updateReservesRemovingExcess(balance0, balance1, max0, max1);
    }



    /// @dev Mu is the fee factor that is used to distribute the pot between anchors and floats.
    /// It is largely based off gamma fluctuations (the losing side will get more fees)
    /// but there is a dampenening factor that allows the fee equilibrium point to be different than a 50/50 split
    /// The rationale for this is that there will be many pools, such as coin <> stablecoin, where a
    /// 50/50 distribution is achieved by an imbalanced fee redistribution (e.g. 80-20).
    /// This because you accept much less yield on your stablecoins, so it's fair that stablecoins consistently get a lower share of the yield

    /// @dev The way this is achieved in practice is by defining when gamma is moving "outside" of the halfway point
    /// and when it's moving "towards" the halfway point (0.5)
    /// When moving outside it grows/reduces at a rate equal to deltagamma
    /// When moving inside the change rate is reduced by its closeness to the halfway point (changes very little if gamma is 50%)

    function _updateMu() private {
        uint _newBlockHeight = block.number; // t2
        uint _lastBlockHeight = muBlockNumber; // t1
        uint muUpdatePeriod = IZirconPylonFactory(factoryAddress).muUpdatePeriod();


        //We only go ahead with this if a sufficient amount of time passes
        //This is primarily to reduce noise, we want to capture sweeping changes over fairly long periods
        if((_lastBlockHeight - _newBlockHeight) > muUpdatePeriod) { //reasonable to assume it won't subflow
            uint _newGamma = gammaMulDecimals; //y2
            uint _oldGamma = muOldGamma; //y1


            bool deltaGammaIsPositive = _newGamma >= _oldGamma;

            bool gammaIsOver50 = _newGamma >= 5e17;

            // This the part that measures if gamma is going outside (to the extremes) or to the inside (0.5 midpoint)
            // It uses an XOR between current gamma and its delta
            // If delta is positive when above 50%, means it's moving to the outside
            // If delta is negative when below 50%, that also means it's going to the outside

            // In other scenarios it's going to the inside, which is why we use the XOR
            if(deltaGammaIsPositive != gammaIsOver50) { // != with booleans is an XOR
                uint absoluteGammaDeviation;

                if(gammaIsOver50) {
                    absoluteGammaDeviation = gammaMulDecimals - 5e17;
                } else {
                    absoluteGammaDeviation = 5e17 - gammaMulDecimals;
                }

                // This block assigns the dampened delta gamma to mu and checks that it's between 0 and 1
                // Due to uint math we can't do this in one line
                if (deltaGammaIsPositive) {
                    uint deltaMu = (_newGamma - _oldGamma).mul(absoluteGammaDeviation);
                    if (deltaMu + muMulDecimals <= 1e18) {
                        // Only updates if the result doesn't go above 1.
                        muMulDecimals += deltaMu;
                    }

                } else {
                    uint deltaMu = (_oldGamma - _newGamma).mul(absoluteGammaDeviation);
                    // Sublow check
                    if(deltaMu <= muMulDecimals) {
                        muMulDecimals -= deltaMu;
                    }
                }

            } else {
                //Here, gamma is moving to the extremes

                //We simply assign the change in gamma 1:1 to mu. Again uint math so we need an if else block
                if (deltaGammaIsPositive) {
                    uint deltaMu = (_newGamma - _oldGamma);
                    if (deltaMu + muMulDecimals <= 1e18) {
                        //Only updates if the result doesn't go above 1.
                        muMulDecimals += deltaMu;
                    }

                } else {
                    uint deltaMu = (_oldGamma - _newGamma);

                    if(deltaMu <= muMulDecimals) {
                        muMulDecimals -= deltaMu;
                    }
                }
            }

            //update variables for next step
            muOldGamma = _newGamma;
            muBlockNumber = _newBlockHeight;
        }


    }


    // ***** MINTING *****

    // @notice Mint Pool Token
    // @_balance -> Balance OF PT
    // @_pylonReserve -> Reserves of PT on Pylon
    //Internal helper function that calculates the amount of Pylon pool tokens to mint
    function _calculateSyncLiquidity(
        uint amountIn,
        uint _pylonReserve,
        uint _pairReserveTranslated,
        address _poolTokenAddress,
        bool isAnchor) private returns (uint liquidity) {
        require(amountIn > 0, "ZP: NOT_ENOUGH");
        // Taking the fee out in tokens
        uint pts = IZirconPoolToken(_poolTokenAddress).totalSupply();
        {
            uint _gamma = gammaMulDecimals;
            uint _vab = virtualAnchorBalance;
            if (pts == 0) {
                IZirconPoolToken(_poolTokenAddress).mint(address(0), MINIMUM_LIQUIDITY);
                if (isAnchor) {
                    liquidity = amountIn.sub(MINIMUM_LIQUIDITY);
                }else{
                    liquidity = (amountIn.mul(1e18)/_gamma.mul(2)).sub(MINIMUM_LIQUIDITY);
                }
            } else {
                // Paying fees only on not init call
                liquidity = ZirconLibrary.calculatePTU(isAnchor, amountIn, pts, _pairReserveTranslated, _pylonReserve, _gamma, _vab);
            }
        }
        emit MintSync(msg.sender, amountIn, isAnchor);
    }
    // @notice Helper function to see if we can do a mint sync or async
    // @amountSync -> Amount of tokens to mint sync
    // @liquidity -> In case async minting is done is returned the PT Liquidity to mint for the users on the async call, if not 0
    // @amount -> Amount on async if not 0
    function _handleSyncAndAsync(uint _amountIn, uint _pairReserveTranslated, uint _reserve, uint _balance, bool _isAnchor) private returns (uint liquidity, uint amountOut) {
        uint maximumPercentageSync = IZirconPylonFactory(factoryAddress).maximumPercentageSync();
        uint max = _pairReserveTranslated.mul(maximumPercentageSync) / 100; // half of maximum value
        uint freeSpace = 0;
        if (max > _reserve) {
            freeSpace = max.sub(_reserve);
            // when we have enough soace we can mint sync, if not we do it partially
            if (_amountIn <= freeSpace) {

                (liquidity) = _calculateSyncLiquidity(_amountIn, _reserve, _pairReserveTranslated, _isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress, _isAnchor);
                _syncMinting();
                return (liquidity, _amountIn);
            }
        }
        uint amountAsyncToMint = _amountIn.sub(freeSpace);
        (amountOut, liquidity) = calculateLiquidity(amountAsyncToMint, _isAnchor);

        // Lets do the sync minting if we have some space for it
        if (freeSpace > 0) {
            console.log("Sync Minting, liquidity:", freeSpace);
            (uint extraLiq) = _calculateSyncLiquidity(freeSpace, _reserve, _pairReserveTranslated, _isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress, _isAnchor);
            _syncMinting();
            console.log("Sync Minting, extraLiq:", extraLiq);
            liquidity += extraLiq;
            amountOut += freeSpace;
        }
        console.log("Sync+Async Minting, liquidity:", liquidity);

        // sending the async minting part to the pair
        _safeTransfer(_isAnchor ? pylonToken.anchor : pylonToken.float, pairAddress, amountAsyncToMint);
        IZirconPair(pairAddress).mintOneSide(address(this), isFloatReserve0 ? !_isAnchor : _isAnchor);
    }
    // @notice External Function called to mint pool Token
    // @dev Liquidity have to be sent before
    // TODO: recheck in dump scenario if sync pool can be blocked
    // aka syncMint
    function mintPoolTokens(address _to, bool isAnchor) isInitialized nonReentrant external returns (uint liquidity) {
        console.log("Minting Pool Tokens");
        sync();
        (uint112 _reserve0, uint112 _reserve1,) = getSyncReserves();
        (uint _reservePairTranslated0, uint _reservePairTranslated1) = getPairReservesTranslated(0, 0);

        // Minting Pool tokens
        uint balance = IUniswapV2ERC20(isAnchor ? pylonToken.anchor : pylonToken.float).balanceOf(address(this));
        uint amountIn = payFees(balance.sub(isAnchor ? _reserve1 : reserve0), isAnchor);
        uint amountOut;
        console.log("AmountIn-Fees: ", amountIn);
        (liquidity, amountOut) = _handleSyncAndAsync(amountIn, isAnchor ? _reservePairTranslated1 : _reservePairTranslated0,
            isAnchor ? reserve1 : reserve0, balance, isAnchor);
        console.log("Liquidity", liquidity);
        if(isAnchor) virtualAnchorBalance += amountOut;

        IZirconPoolToken(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress).mint(_to, liquidity);

        // Sends tokens into pool if there is a match
        _update();
    }


    /// @notice Private function that calculates anchor fees to send to energy
    /// @dev in case the user adds liquidity in float token it will swap the amount of tokens with the Pair
    /// @return amount minus fees payed

    //Swapping every time is not ideal for gas, but it will be changed if we ever deploy to a chain like ETH
    //We care about amassing Anchor assets, holding pool tokens isn't ideal.
    function payFees(uint amountIn, bool isAnchor) private returns (uint amountOut){
        (uint fee, ) = _applyDeltaAndGammaTax(amountIn);
        //console.log("Solidity: fee: ", fee);
        // TODO: This should never go above the balcance
        if (isAnchor) {
            _safeTransfer(pylonToken.anchor, energyAddress, fee);
        } else {
            _safeTransfer(pylonToken.float, pairAddress, fee);
            (uint112 _reservePair0, uint112 _reservePair1) = getPairReservesNormalized();
            uint amountSwapped = ZirconLibrary.getAmountOut(fee, _reservePair0, _reservePair1);
            IZirconPair(pairAddress).swap(isFloatReserve0 ? 0 : amountSwapped, isFloatReserve0 ? amountSwapped : 0, energyAddress, "");
        }
        amountOut =  amountIn.sub(fee);
    }

    /// @notice private function that sends to pair the LP tokens
    /// Burns them sending it to the energy address
    function payBurnFees(uint amountIn) private returns (uint amountOut) {
        (uint fee, ) = _applyDeltaAndGammaTax(amountIn);
        _safeTransfer(pairAddress, pairAddress, fee);
        IZirconPair(pairAddress).burnOneSide(energyAddress, !isFloatReserve0);
        amountOut = amountIn.sub(fee);
    }

    /// @notice private function that calculates fees for Burn Async
    /// Fees here are increased depending on current Gamma
    /// on unbalanced Gamma, fees are higher


    //Unnecessary with Delta Tax.
    //    function payBurnAsyncFees(uint amountIn) private returns (uint amountOut) {
    //        (uint fee, ) = _applyDeltaAndGammaTax(amountIn);
    //
    //        uint gammaFee = IZirconEnergy(energyAddress).getFeeByGamma(gammaMulDecimals);
    //        uint fee = amountIn.mul(dynamicFeePercentage + gammaFee/2)/10000; //TODO: Fix this up
    //        address revAddress = IZirconPair(pairAddress).energyRevenueAddress();
    //        _safeTransfer(pairAddress, revAddress, amountIn.mul(gammaFee/2)/10000);
    //        IZirconEnergyRevenue(revAddress).calculate();
    //
    //        _safeTransfer(pairAddress, pairAddress, fee);
    //        IZirconPair(pairAddress).burnOneSide(energyAddress, !isFloatReserve0);
    //        amountOut = amountIn.sub(fee);
    //    }

    //Anti-exploit measure applying extra fees for any mint/burn operation that occurs after a massive gamma change.
    //In principle classic "oracle" exploits merely speed up/force natural outcomes.
    //E.g. Maker's Black Thursday is functionally the same as a lending protocol "hack"
    //Same (sometimes) applies here if you move prices very fast. This fee is designed to make this unprofitable/temporarily lock the protocol.
    //It is also combined with the regular Pylon fee
    function _applyDeltaAndGammaTax(uint _amountIn) private returns (uint fee, bool applied) {
        console.log("Apply Delta And Gamma Tax");
        uint maxDerivative = Math.max(gammaEMA, thisBlockEMA);
        uint deltaGammaThreshold = IZirconPylonFactory(factoryAddress).deltaGammaThreshold();
        uint deltaGammaMinFee = IZirconPylonFactory(factoryAddress).deltaGammaMinFee();

        if (maxDerivative >= deltaGammaThreshold) {
            applied = true;
            uint feeBps = (maxDerivative - deltaGammaThreshold).mul(10000)/deltaGammaThreshold + deltaGammaMinFee;
            feeBps = feeBps.add(IZirconEnergy(energyAddress).getFeeByGamma(gammaMulDecimals));

            require(feeBps < 10000, "ZP: Fee too high");
            fee = _amountIn.mul(feeBps)/10000;
            console.log("Delta+Gamma Tax Applied", fee);

        }
        //Base case where the threshold isn't passed
        else {
            applied = false;
            fee = _amountIn.mul(IZirconEnergy(energyAddress).getFeeByGamma(gammaMulDecimals))/10000;
            console.log("Gamma Tax Applied", fee);
        }
        emit DeltaTax(fee, applied);
    }

    function calculateLiquidity(uint amountIn, bool isAnchor) private returns (uint amount, uint liquidity) {
        (uint a0, uint a1) = _disincorporateAmount(amountIn, isAnchor);
        console.log("Calculating Liquidity, amount1,2: ", a0/1e16, a1/1e16);

        (liquidity, amount) = getLiquidityFromPoolTokens(
            a0, a1,
            isAnchor,
            IZirconPoolToken(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress));
        console.log("Liquidity", liquidity);
    }


    // @notice Mint Async 100 lets you invest in one liquidity
    // The difference with Sync Liquidity is that it goes directly to the Pool
    function mintAsync100(address to, bool isAnchor) nonReentrant isInitialized external returns (uint liquidity) {
        sync();
        (uint112 _reserve0, uint112 _reserve1,) = getSyncReserves();
        uint amountIn;
        if (isAnchor) {
            uint balance = IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));
            amountIn = balance.sub(_reserve1);
        }else{
            uint balance = IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));
            amountIn = balance.sub(_reserve0);
        }
        amountIn = payFees(amountIn, isAnchor);

        require(amountIn > 0, "ZP: INSUFFICIENT_AMOUNT");

        _safeTransfer(isAnchor ? pylonToken.anchor : pylonToken.float, pairAddress, amountIn);
        {
            (uint amount, uint liquidity) = calculateLiquidity(amountIn, isAnchor);
            if (isAnchor) {
                virtualAnchorBalance += amount;
            }
            IZirconPair(pairAddress).mintOneSide(address(this), isFloatReserve0 ? !isAnchor : isAnchor);
            IZirconPoolToken(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress).mint(to, liquidity);
        }
        _update();
        emit MintAsync100(msg.sender, amountIn, isAnchor);
    }


    // @notice Mint Async lets you invest in both liquidity like you normally do on your DEX
    // The difference is that gives you directly with mint one side
    // TODO: Transfer first then calculate on basis of pool token share how many share we should give to the user
    function mintAsync(address to, bool shouldMintAnchor) external nonReentrant isInitialized returns (uint liquidity){
        sync();
        address _poolTokenAddress = shouldMintAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress;

        (uint112 _reserve0, uint112 _reserve1,) = getSyncReserves(); // gas savings
        uint amountIn0;
        uint amountIn1;
        {
            uint balance0 = IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));
            uint balance1 = IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));

            amountIn0 = balance0.sub(_reserve0);
            amountIn1 = balance1.sub(_reserve1);

            amountIn0 = payFees(amountIn0, false);
            amountIn1 = payFees(amountIn1, true);

            (uint _liquidity, uint amount) = getLiquidityFromPoolTokens(amountIn0, amountIn1, shouldMintAnchor, IZirconPoolToken(_poolTokenAddress));
            liquidity = _liquidity;
            if (shouldMintAnchor) {
                virtualAnchorBalance += amount;
            }

        }

        require(amountIn1 > 0 && amountIn0 > 0, "ZP: NOT_ENOUGH");
        _safeTransfer(pylonToken.float, pairAddress, amountIn0);
        _safeTransfer(pylonToken.anchor, pairAddress, amountIn1);
        IZirconPair(pairAddress).mint(address(this));
        // uint deltaSupply = pair.totalSupply().sub(_totalSupply);
        //TODO: Change fee
        IZirconPoolToken(_poolTokenAddress).mint(to, liquidity);


        emit MintAsync(msg.sender, amountIn0, amountIn1);
        //console.log("<<<Pylon:mintAsync::::::::", liquidity);
        _update();
    }


    /// @notice Master update function. Syncs up the vault's state with the pool and any price/fee changes
    function sync() private {
        // Prevents this from being called while the underlying pool is getting flash loaned
        if(msg.sender != pairAddress) { IZirconPair(pairAddress).tryLock(); }

        // So this thing needs to get pool reserves, get the price of the float asset in anchor terms
        // Then it applies the base formula:
        // Adds fees to virtualFloat and virtualAnchor
        // And then calculates Gamma so that the proportions are correct according to the formula
        (uint112 pairReserve0, uint112 pairReserve1) = getPairReservesNormalized();
        (uint112 pylonReserve0, uint112 pylonReserve1,) = getSyncReserves();

        uint oldGamma = gammaMulDecimals;

        // If the current K is equal to the last K, means that we haven't had any updates on the pair level
        // So is useless to update any variable because fees on pair haven't changed
        uint currentK = uint(pairReserve0).mul(pairReserve1);
        if (lastPoolTokens != 0 && pairReserve0 != 0 && pairReserve1 != 0) {

            uint poolTokensPrime = IZirconPair(pairAddress).totalSupply();
            // Here it is going to be useful to have a Minimum Liquidity
            // If not we can have some problems
            // uint poolTokenBalance = IZirconPair(pairAddress).balanceOf(address(this));
            // Let's get the amount of total pool value own by pylon

            uint totalPoolValueAnchorPrime = translateToPylon(pairReserve1.mul(2), 0);
            //uint totalPoolValueFloatPrime = translateToPylon(pairReserve0.mul(2), 0);

            //Fee value/total pool value ratio, modified implementation of Uniswap's mintFee formula
            uint one = 1e18;
            uint d = (one).sub((Math.sqrt(lastK)*poolTokensPrime*1e18)/(Math.sqrt(currentK)*lastPoolTokens));
            // Multiply by total pool value to get fee value in native units
            uint feeValueAnchor = totalPoolValueAnchorPrime.mul(d)/1e18;
            // uint feeValueFloat = totalPoolValueFloatPrime.mul(d)/1e18;
            //console.log("sync::anchor::fee", feeValueAnchor);
            // console.log("sync::float::fee", feeValueFloat);

            // Calculating gamma, variable used to calculate tokens to mint and withdrawals

            // gamma is supposed to always be an accurate reflection of the float share as a percentage of the totalPoolValue
            // however the virtual anchor balance also includes the syncPool reserve portion, which is completely outside of the pools.

            // When operating on fractional (anchor withdrawals get slashed if there is no money in energy),
            //gamma is higher than it should be compared to ftv + atv.
            // This means that anchors get more fees than they "should", which kinda works out because they're at high risk.
            // It works as an additional incentive to not withdraw.

            //VFB is no longer relevant, so it's commented out for now

            //Mu mostly follows gamma but it's designed to find an equilibrium point different from 50/50
            //More on this in the function itself;

            _updateMu();


            virtualAnchorBalance += ((feeValueAnchor.mul(1e18-muMulDecimals))/1e18);
            //Fees to floats are automatically assigned due to dTPV > dVAB
            //virtualFloatBalance += ((gammaMulDecimals).mul(feeValueFloat)/1e18);
            //            console.log("sync::gamma", d, muMulDecimals);

            if ((virtualAnchorBalance.sub(pylonReserve1)) < totalPoolValueAnchorPrime/2) {

                //Here gamma is simply a variation of tpv - vab

                gammaMulDecimals = 1e18 - ((virtualAnchorBalance.sub(pylonReserve1))*1e18 /  totalPoolValueAnchorPrime);
            } else {

                //Here gamma fixes the amount of float assets and lets anchors get slashed

                //This is a heavily simplified expression of a "derived" virtual Float balance (qu fantity of float asset supplied)
                //The formula assumes that the virtual anchor balance was once matched with an equal value of float assets
                //It then assumes that this point had the same k as now. Simplify a lot and suddenly there's no k in the formula :)
                //The derived vfb shifts when new assets are supplied to ensure there are no gaps between the two gamma formulas

                //This shift in the vfb means that the pool has a collective break even point that moves around.
                //Supplying anchors moves the break even higher. This can massively reduce IL for very strong pumps.
                //The flipside is that float LPs can lose more on a redump.
                //Supplying floats moves the breakeven lower, so floats lose less, useful to preserve the pool in downturns.

                //                console.log("sync::anchor::tpvamult18", totalPoolValueAnchorPrime.mul(1e18));

                gammaMulDecimals = (totalPoolValueAnchorPrime.mul(1e18))/((virtualAnchorBalance.sub(pylonReserve1)).mul(4));

                //console.log("sync::anchor::gamma", gammaMulDecimals);
            }


            //updateDelta()

            //Calculates a "delta gamma" EMA which is used to "lock down" the pool.
            //Above a threshold, fees get absurdly high and make it very difficult to complete price manipulation cycles (like in exploits).
            //The initial "trigger" that pumps the EMA is not taxed, to allow for legitimate whales to come in.

            //Using an EMA makes it more resilient, as otherwise an attacker could just wait out the sampling period to eliminate the outlier.

            //Block numbers are overall harder to manipulate and more relevant for our purposes.
            //There is some variability due to block time, it would make sense to tune the number of samples for each chain.

            uint blockDiff = block.number.sub(EMABlockNumber);
            if (blockDiff != 0) {

                //Using past average means that delta spikes stay embedded in it for a while

                gammaEMA = (gammaEMA.mul(EMASamples).add(thisBlockEMA))/(EMASamples.add(blockDiff));

                //Resets thisBlock values

                thisBlockEMA = ZirconLibrary.absoluteDiff(gammaMulDecimals, oldGamma);
                EMABlockNumber = block.number;
            } else {

                //Adds any delta change if it's in the same block.
                thisBlockEMA = thisBlockEMA.add(ZirconLibrary.absoluteDiff(gammaMulDecimals, oldGamma));
            }

            // Sync pool also gets a claim to these
            /// @notice event no longer has vfb
            emit PylonSync(virtualAnchorBalance, gammaMulDecimals);
        }
        //        console.log("sync::gamma", gammaMulDecimals);
    }


    /// @notice TODO
    function calculateLPTU(bool _isAnchor, uint _liquidity, uint _ptTotalSupply) view private returns (uint claim){
        (uint _reserve0, uint _reserve1) = getPairReservesTranslated(1, 1); // gas savings
        (uint112 _pylonReserve0, uint112 _pylonReserve1,) = getSyncReserves(); // gas savings
        uint pylonShare;
        if (_isAnchor) {
            pylonShare = (IZirconPair(pairAddress).balanceOf(address(this)).mul(virtualAnchorBalance.sub(_pylonReserve1)))/_reserve1.mul(2);
            // Adjustment factor to extract correct amount of liquidity
            pylonShare = pylonShare.add(pylonShare.mul(_pylonReserve1)/_reserve1.mul(2));
        }else{
            pylonShare = ((gammaMulDecimals).mul(IZirconPair(pairAddress).balanceOf(address(this))))/1e18;
            pylonShare = pylonShare.add(pylonShare.mul(_pylonReserve0)/_reserve0.mul(2));
        }


        // Liquidity/pt applies share over pool + reserves to something that is just pool.
        // So it gives less liquidity than it should

        claim = (_liquidity.mul(pylonShare))/_ptTotalSupply;
        require(claim > 0, 'ZP: INSUFFICIENT_LIQUIDITY_BURNED');
    }

    /// @notice TODO
    // Burn Async send both tokens 50-50
    // Liquidity has to be sent before
    function sendSlashing(uint omegaMulDecimals, uint liquidity) private returns(uint remainingPercentage){
        if (omegaMulDecimals < 1e18) {
            uint amountToAdd = liquidity.mul(1e18-omegaMulDecimals)/1e18;
            // uint energyAnchorBalance = IUniswapV2ERC20(pylonToken.anchor).balanceOf(energyAddress);
            uint energyPTBalance = IUniswapV2ERC20(pairAddress).balanceOf(energyAddress);
            if (amountToAdd < energyPTBalance) {
                // Sending PT tokens to Pair because burn one side is going to be called after
                _safeTransferFrom(pairAddress, energyAddress, pairAddress, amountToAdd);
                remainingPercentage = 0;
            } else {
                // Sending PT tokens to Pair because burn one side is going to be called after
                // @dev if amountToAdd is too small the remainingPercentage will be 0 so that is ok
                _safeTransferFrom(pairAddress, energyAddress, pairAddress, energyPTBalance);
                remainingPercentage = (amountToAdd.sub(energyPTBalance))/(liquidity);
            }
        } else {
            remainingPercentage = 0;
        }
    }

    /// @notice function that sends tokens to Pair to be burn after
    /// this function must be called only before a burn takes place, if not it'll give away tokens
    function sendSlashedTokensToUser(uint anchorAmount, uint floatAmount, uint percentage, address _to) private {
        if(percentage != 0) {
            uint totalAmount = anchorAmount;
            if ( floatAmount > 0 ) {
                (uint res0, uint res1) = getPairReservesNormalized();
                totalAmount += ZirconLibrary.getAmountOut(floatAmount, res0, res1);
            }
            uint energyAnchorBalance = IUniswapV2ERC20(pylonToken.anchor).balanceOf(energyAddress);
            uint amountToTransfer = totalAmount.mul(percentage);
            if(energyAnchorBalance > amountToTransfer ){
                _safeTransferFrom(pylonToken.anchor, energyAddress, _to, amountToTransfer);
            }
        }
    }


    /// @notice Burn Async let's you burn your anchor|float shares giving you back both tokens
    /// @dev sends to the Pair Contract the PTU equivalent to the Anchor|Float Shares
    /// and calls Classic burn
    function burnAsync(address _to, bool _isAnchor) external nonReentrant isInitialized returns (uint amount0, uint amount1) {
        sync();

        IZirconPoolToken pt = IZirconPoolToken(_isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress);
        uint liquidity = pt.balanceOf(address(this));
        require(liquidity > 0, "ZP: NOT_ENOUGH");
        uint ptTotalSupply = pt.totalSupply();
        uint extraPercentage = 0;

        {
            (uint reserveFloat, uint reserveAnchor,) = getSyncReserves();
            (uint pairReserves0,) = getPairReservesTranslated(0, 0);
            {
                //Calculates max liquidity to avoid withdrawing portion in sync pools
                uint maxPoolTokens = _isAnchor ?
                ptTotalSupply - ptTotalSupply.mul(reserveAnchor) / virtualAnchorBalance :
                ptTotalSupply - ptTotalSupply.mul(reserveFloat) / (pairReserves0.mul(2).mul(gammaMulDecimals) / 1e18).add(reserveFloat);
                require(liquidity < maxPoolTokens, "ZP: EXCEED");
            }
            uint ptu = calculateLPTU(_isAnchor, liquidity, ptTotalSupply);
            ptu = payBurnFees(ptu);
            // Anchor slashing logic
            if (_isAnchor) {
                (ptu, extraPercentage) = handleOmegaSlashing(ptu); //This one retrieves tokens from ZirconEnergy if available
            }
            _safeTransfer(pairAddress, pairAddress, ptu);
        }
        // Burning liquidity and sending to user
        // The pool tokens sent to the Pair are slashed by omega
        (uint amountA, uint amountB) = IZirconPair(pairAddress).burn(_to);
        amount0 = isFloatReserve0 ? amountA : amountB;
        amount1 = isFloatReserve0 ? amountB : amountA;
        sendSlashedTokensToUser(amount0, amount1, extraPercentage, _to);

        //Burns the Zircon pool tokens
        pt.burn(address(this), liquidity);

        // Updating
        if(_isAnchor) {
            virtualAnchorBalance -= virtualAnchorBalance.mul(liquidity)/ptTotalSupply;
        }
        _update();
        // Emiting event on burned async
        emit BurnAsync(msg.sender, amount0, amount1);
    }

    /// @notice Function That handles the amount of reserves in Float Anchor Shares
    /// and the amount of the minimum from liquidity and reserves
    /// @dev Helper function for burn
    function burnPylonReserves(bool isAnchor, uint _totalSupply, uint _liquidity) view private returns (uint reservePT, uint amount) {
        // variables declaration
        uint _gamma = gammaMulDecimals;
        uint _vab = virtualAnchorBalance;
        (uint _reserve0,) = getPairReservesTranslated(0,0); // gas savings
        (uint112 _pylonReserve0, uint112 _pylonReserve1,) = getSyncReserves();

        //Calculates maxPTs that can be serviced through Pylon Reserves
        uint pylonReserve = isAnchor ? _pylonReserve1 : _pylonReserve0;
        uint reserve = isAnchor ? reserve1 : _reserve0;
        reservePT = ZirconLibrary.calculatePTU(isAnchor, pylonReserve, _totalSupply, reserve, pylonReserve, _gamma, _vab);
        amount = ZirconLibrary.calculatePTUToAmount(isAnchor, Math.min(reservePT, _liquidity), _totalSupply,reserve, pylonReserve, _gamma, _vab);
    }


    /// @notice Omega is the slashing factor. It's always equal to 1 if pool has gamma above 50%
    /// If it's below 50%, it begins to go below 1 and thus slash any withdrawal.
    /// @dev Note that in practice this system doesn't activate unless the syncReserves are empty.
    /// Also note that a dump of 60% only generates about 10% of slashing.
    function handleOmegaSlashing(uint ptu) private returns (uint retPtu, uint extraPercentage){
        (, uint reserveAnchor,) = getSyncReserves();
        (, uint pairReserves1)  = getPairReservesTranslated(0,0);
        uint omegaMulDecimals = ZirconLibrary.slashLiabilityOmega(
            pairReserves1.mul(2),
            reserveAnchor,
            gammaMulDecimals,
            virtualAnchorBalance);
        //console.log("omega slash", omegaMulDecimals);
        (extraPercentage) = sendSlashing(omegaMulDecimals, ptu);
        retPtu = omegaMulDecimals.mul(ptu)/1e18;
    }

    // @notice Burn send liquidity back to user burning Pool tokens
    // The function first uses the reserves of the Pylon
    // If not enough reserves it burns The Pool Tokens of the pylon
    // Fees here are
    function burn(address _to, bool _isAnchor) external nonReentrant isInitialized returns (uint amount){
        sync();
        //        console.log("Finished sync in burn");
        // Selecting the Pool Token class on basis of the requested tranch to burn
        IZirconPoolToken pt = IZirconPoolToken(_isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress);
        // Let's get how much liquidity was sent to burn
        // Outside of scope to be used for vab/vfb adjustment later
        uint liquidity = pt.balanceOf(address(this));
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY");
        uint _totalSupply = pt.totalSupply();
        {
            address to = _to;
            bool isAnchor = _isAnchor;
            address _pairAddress = pairAddress;
            // Here we calculate max PTU to extract from sync reserve + amount in reserves
            (uint reservePT, uint _amount) = burnPylonReserves(isAnchor, _totalSupply, liquidity);


            amount = payFees(_amount, isAnchor);
            _safeTransfer(isAnchor ? pylonToken.anchor : pylonToken.float, to, amount);
            //In case the reserves weren't able to pay for everything
            if (reservePT < liquidity) {
                uint adjustedLiquidity = liquidity.sub(reservePT);
                uint ptu = calculateLPTU(isAnchor, adjustedLiquidity, _totalSupply);
                ptu = payBurnFees(ptu);
                uint extraPercentage = 0;
                if (isAnchor) { (ptu, extraPercentage) = handleOmegaSlashing(ptu); }
                _safeTransfer(_pairAddress, _pairAddress, ptu);
                bool isReserve0 = isFloatReserve0 ? !isAnchor : isAnchor;
                uint sentAmount = IZirconPair(_pairAddress).burnOneSide(to, isReserve0);  // XOR
                amount += sentAmount;
                sendSlashedTokensToUser(isReserve0 ? sentAmount : 0, isReserve0 ? 0 : sentAmount, extraPercentage, to);
                //Bool combines choice of anchor or float with which token is which in the pool
            }
            pt.burn(address(this), liquidity); //Should burn unadjusted amount ofc
        }

        if(_isAnchor) {
            virtualAnchorBalance -= virtualAnchorBalance.mul(liquidity)/_totalSupply;
        }
        _update();
        emit Burn(msg.sender, amount, _isAnchor);
    }

    function migrateLiquidity(address newPylon) external{
        require(msg.sender == factoryAddress, 'ZP: FORBIDDEN'); // sufficient check

        uint balance = IZirconPair(pairAddress).balanceOf(address(this));
        uint balanceAnchor = IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));
        uint balanceFloat = IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));

        _safeTransfer(newPylon, pairAddress, balance);
        _safeTransfer(newPylon, pylonToken.anchor, balanceAnchor);
        _safeTransfer(newPylon, pylonToken.float, balanceFloat);
    }

    function changeEnergyAddress(address _energyAddress) external {
        require(msg.sender == factoryAddress, 'ZP: FORBIDDEN'); // sufficient check
        energyAddress = _energyAddress;
    }

}
