pragma solidity =0.5.16;
//import './libraries/Math.sol';
import './interfaces/IZirconPair.sol';
import './interfaces/IZirconPoolToken.sol';
//import "./libraries/SafeMath.sol";
import "./libraries/ZirconLibrary.sol";
import "./interfaces/IZirconPylonFactory.sol";
import "./interfaces/IZirconFactory.sol";
import "./interfaces/IZirconPylon.sol";
import "./energy/interfaces/IZirconEnergy.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol';
//import 'hardhat/console.sol';

contract ZirconPylon is IZirconPylon {
    // **** Libraries ****
    using SafeMath for uint112;
    using SafeMath for uint256;
    // using UQ112x112 for uint224;

    // **** STRUCTS *****
    struct PylonToken {
        address float;
        address anchor;
    }
    PylonToken private pylonToken;
    // ***** GLOBAL VARIABLES ******
    bool private _entered;

    // ***** The address of the other components ******
    address private pairAddress;
    address private factoryAddress;
    address private pairFactoryAddress;
    address private floatPoolTokenAddress;
    address private anchorPoolTokenAddress;
    address private energyAddress;
    address private energyRevAddress;

    //    uint private lastAvgPrice;
    //    uint private lastOracleTimestamp;

    // Indicates if in the pair the token0 is float or anchor
    bool public isFloatReserve0;

    uint private constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));
    bytes4 private constant SELECTOR_FROM = bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));

    // ***** Variables for calculations *****
    uint public virtualAnchorBalance;
    //uint public virtualFloatBalance;
    bool public formulaSwitch;
    uint public anchorKFactor; //A multiplier used to adjust FTV when anchor liquidity is added

    uint public lastRootKTranslated;
    //uint public dynamicFeePercentage; //Uses basis points (0.01%, /10000)
    uint public gammaMulDecimals; // Percentage of float over total pool value. Name represents the fact that this is always the numerator of a fraction with 10**18 as denominator.
    uint public muMulDecimals; // A "permanence" factor that is used to adjust fee redistribution. Stored as mu + 1 because unsigned math

    uint public gammaEMA; //A moving average of the gamma used to make price manipulation vastly more complex
    uint public thisBlockEMA; //A storage var for this block's changes.
    uint public strikeBlock;

    uint public EMABlockNumber; //Last block height of the EMA update
    uint private muBlockNumber; //block height of last mu update
    uint private muOldGamma; //gamma value at last mu update

    uint public lastOracleTimestamp;
    uint public lastFloatAccumulator;
    uint public lastPrice;
    uint private oracleUpdateSecs;

    uint private liquidityFee;
    uint private maxPercentageSync;
    uint private deltaGammaThreshold;

    uint112 private reserve0;// uses single storage slot, accessible via getReserves (always anchor)
    uint112 private reserve1;// us es single storage slot, accessible via getReserves (always float)

    // uint32 private blockTimestampLast; // uses single storage slot, accessible via getReserves
    // global variable used for testing
    // uint private testMultiplier = 1e16;

    // **** MODIFIERS *****
    uint public initialized = 0;

    /// using functions instead of modifiers to save some space
    function reentrancyAndPauseCheck() internal {
        require(initialized == 1 && !IZirconPylonFactory(factoryAddress).paused(), 'Z: P');
        require(!_entered, "Z: R");
        _entered = true;
    }
    function onlyFactory() internal view{
        require(msg.sender == factoryAddress, 'Z: F'); // sufficient check
    }
    function notZero(uint256 _value) pure internal {
        require(_value > 0, 'Z: Z');
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
    event PylonSync(uint _vab, uint _vfb, uint _gamma);

    // Transform in just one event
    event MintSync(address sender, uint aIn0, bool isAnchor);
    event MintAsync(address sender, uint aIn0, uint aIn1);
    //    event MintAsync100(address sender, uint aIn0, bool isAnchor);
    event Burn(address sender, uint aIn0, bool isAnchor);
    event BurnAsync(address sender, uint aIn0, uint aIn1);
    //    event Excess(uint aIn0, bool isAnchor);
    //    event FeeBps(uint aIn0, bool applied);

    // ****** CONSTRUCTOR ******
    constructor() public {
        factoryAddress = msg.sender;
        //        _entered = false;
    }

    function _mint(address minter, address to, uint value) internal {
        IZirconPoolToken(minter).mint(to, value);
    }

    function _getBalanceOf(address erc20Address, address where) internal returns (uint balance){
        balance = IUniswapV2ERC20(erc20Address).balanceOf(where);
    }

    function _getFloatAnchorBalance() internal returns (uint floatBalance, uint anchorBalance){
        floatBalance = _getBalanceOf(pylonToken.float, address(this));
        anchorBalance = _getBalanceOf(pylonToken.anchor, address(this));
    }

    // ****** HELPER FUNCTIONS *****
    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'Z: TF');
    }

//    function _safeTransferFrom(address token, address from, address to, uint value) private {
//        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_FROM, from, to, value));
//        require(success && (data.length == 0 || abi.decode(data, (bool))), 'Z: TFF');
//    }

    function getSyncReserves()  public view returns  (uint112 _reserve0, uint112 _reserve1) { //, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        //        _blockTimestampLast = blockTimestampLast;
    }

    /// @notice Private function to get pair reserves normalized on float and anchor
    // @return _reserve0 -> float
    // @return _reserve1 -> Anchor
    function getPairReservesNormalized()  private view returns (uint112 _reserve0, uint112 _reserve1, uint32 _lastTimestamp) {
        (uint112 _reservePair0, uint112 _reservePair1, uint32 _lastBlockTimestamp) = IZirconPair(pairAddress).getReserves();
        _reserve0 = isFloatReserve0 ? _reservePair0 : _reservePair1;
        _reserve1 = isFloatReserve0 ? _reservePair1 : _reservePair0;
        _lastTimestamp = _lastBlockTimestamp;
    }

    /// @notice Function that returns pair reserves translated to pylon
    /// @return Float -> _reserve0
    /// @dev Anchor -> _reserve1
    function getPairReservesTranslated(uint error0, uint error1) view private  returns  (uint _reserve0, uint _reserve1, uint32 timestamp) {
        (uint112 _reservePair0, uint112 _reservePair1, uint32 _timestamp) = getPairReservesNormalized();

        uint ptb = IZirconPair(pairAddress).balanceOf(address(this));
        uint ptt = IZirconPair(pairAddress).totalSupply();
        if (ptb == 0  || ptt == 0) return (error0, error1, uint32(block.timestamp));
        return (_reservePair0 * ptb/ptt, _reservePair1 * ptb/ptt, _timestamp);//overflow checked by uniswap
    }

    // ***** INIT ******
    // @notice Called once by the factory at time of deployment
    // @_floatPoolTokenAddress -> Contains Address Of Float PT
    // @_anchorPoolTokenAddress -> Contains Address Of Anchor PT
    // @floatToken -> Float token
    // @anchorToken -> Anchor token
    function initialize(address _floatPoolTokenAddress, address _anchorPoolTokenAddress, address _floatToken, address _anchorToken, address _pairAddress, address _pairFactoryAddress, address _energy, address _energyRev) external {
        onlyFactory();
        floatPoolTokenAddress = _floatPoolTokenAddress;
        anchorPoolTokenAddress = _anchorPoolTokenAddress;
        pairAddress = _pairAddress;
        isFloatReserve0 = IZirconPair(_pairAddress).token0() == _floatToken;
        pylonToken = PylonToken(_floatToken, _anchorToken);
        pairFactoryAddress = _pairFactoryAddress;
        energyAddress = _energy;
        energyRevAddress = _energyRev;
    }

    // 0.048 kb
    function initMigratedPylon(uint _gamma, uint _vab, uint _anchorKFactor, bool _formulaSwitch) external {
        onlyFactory(); // sufficient check
        gammaMulDecimals = _gamma;
        virtualAnchorBalance = _vab;
        anchorKFactor = _anchorKFactor;
        formulaSwitch = _formulaSwitch;

        muMulDecimals = gammaMulDecimals; //Starts as gamma, diversifies over time. Used to calculate fee distribution
        muBlockNumber = block.number; //block height of last mu update
        muOldGamma = gammaMulDecimals; //gamma value at last mu update

        if (_vab != 0 ) {_update();}
        initialized = 1;
    }

    function _calculateGamma(uint _virtualAnchorBalance, uint _anchorKFactor, uint _pylonReserve1, uint _translatedReserve1) pure public returns (uint gamma, bool isLineFormula, uint reserveSwitch) {
        uint totalPoolValueAnchorPrime = _translatedReserve1 * 2;
        uint adjustedVab = _virtualAnchorBalance.sub(_pylonReserve1);
        //The switching point is important. It's defined as reserveAnchor = VAB(aK + sqrt(aK**2 + aK)

        //sadly we can't get rid of sqrt
        //kFactor is guaranteed to be more than one by its assigning functions;
        uint sqrtKFactor = Math.sqrt((_anchorKFactor**2/1e18 - _anchorKFactor) * 1e18);
        uint vabMultiplier = sqrtKFactor < _anchorKFactor
        ? _anchorKFactor - sqrtKFactor
        : _anchorKFactor + sqrtKFactor;

        reserveSwitch = adjustedVab.mul(vabMultiplier)/1e18;


        if (_translatedReserve1 > reserveSwitch) {
            //Here gamma is simply a variation of tpv - vab
            gamma = 1e18 - ((adjustedVab)*1e18 /  totalPoolValueAnchorPrime);
        } else {
            //Here we use a "derived virtual float balance" formula
            //It allows float value to descend linearly to 0.
            //With derived vfb it's always guaranteed to intersect with the main 2sqrt(kx) formula.
            //However we need to add an adjustment factor that tracks when anchors deposit liquidity (or get fees)
            //This is only required when adding liquidity when we're using this formula
            //This basically holds the slope of the line formula steady, thus changing the intersection point
            gamma = totalPoolValueAnchorPrime.mul(1e18)/(4*adjustedVab);
            gamma = gamma * 1e18/_anchorKFactor; //would be caught before if it had to overflow
            isLineFormula = true;
        }

        //Todo: Add an event here with all input data
    }

    // @notice On init pylon we have to handle two cases
    // The first case is when we initialize the pair through the pylon
    // And the second one is when initialize the pylon with a pair already existing
    // 1.277 kb
    function initPylon(address _to) external returns (uint floatLiquidity, uint anchorLiquidity) {
        require(initialized == 0 && !IZirconPylonFactory(factoryAddress).paused() && !_entered);

        // Let's get the balances so we can see what the user send us
        // As we are initializing the reserves are going to be null
        // Let's see if the pair contains some reserves
        (uint112 _reservePair0, uint112 _reservePair1, uint32 timestamp) = getPairReservesNormalized();
        //console.log("Reserves: ", _reservePair0, _reservePair1);
        require(_reservePair0 > 0 && _reservePair1 > 0);

        lastOracleTimestamp = timestamp;
        lastFloatAccumulator = isFloatReserve0 ? IZirconPair(pairAddress).price0CumulativeLast() : IZirconPair(pairAddress).price1CumulativeLast();
        lastPrice = _reservePair1 * 1e18/_reservePair0;

        liquidityFee = IZirconFactory(pairFactoryAddress).liquidityFee();
        maxPercentageSync = IZirconPylonFactory(factoryAddress).maximumPercentageSync();
        deltaGammaThreshold = IZirconPylonFactory(factoryAddress).deltaGammaThreshold();
        oracleUpdateSecs = IZirconPylonFactory(factoryAddress).oracleUpdateSecs();


        _entered = true;
        (uint balance0, uint balance1) = _getFloatAnchorBalance();
        //        uint balance0 = _getBalanceOf(pylonToken.float, address(this));//IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));
        //        uint balance1 = _getBalanceOf(pylonToken.anchor, address(this)); //IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));
        notZero(balance0);
        notZero(balance1);

        // We force balances to match pair ratio. Required to avoid initializing vab and vfb at wrong values
        (balance0, balance1) = Math._getMaximum(_reservePair0, _reservePair1, balance0, balance1);

        virtualAnchorBalance = balance1;
        // virtualFloatBalance = balance0 - MINIMUM_LIQUIDITY;

        //Special call with 0 pylon Sync reserves and total pool value equal to the balances we're initializing with.
        //This should always be 50%

        anchorKFactor = 1e18;


        (gammaMulDecimals, formulaSwitch,) = _calculateGamma(virtualAnchorBalance, anchorKFactor, 0, balance1);

        // Time to mint some tokens
        _mint(anchorPoolTokenAddress, address(0), MINIMUM_LIQUIDITY);
        _mint(floatPoolTokenAddress, address(0), MINIMUM_LIQUIDITY);
        //        IZirconPoolToken(anchorPoolTokenAddress).mint(address(0), MINIMUM_LIQUIDITY);
        //        IZirconPoolToken(floatPoolTokenAddress).mint(address(0), MINIMUM_LIQUIDITY);

        anchorLiquidity = balance1.sub(MINIMUM_LIQUIDITY);
        floatLiquidity = (balance0 * 1e18/gammaMulDecimals.mul(2)).sub(MINIMUM_LIQUIDITY);

        _syncMinting(maxPercentageSync);
        _mint(anchorPoolTokenAddress, _to, anchorLiquidity);
        _mint(floatPoolTokenAddress, _to, floatLiquidity);

        //        IZirconPoolToken(anchorPoolTokenAddress).mint(_to, anchorLiquidity);
        //        IZirconPoolToken(floatPoolTokenAddress).mint(_to, floatLiquidity);

        muMulDecimals = gammaMulDecimals; // Starts as gamma, diversifies over time. Used to calculate fee distribution
        muBlockNumber = block.number; // block height of last mu update
        muOldGamma = gammaMulDecimals; // gamma value at last mu update

        // (uint _pairReserveTR0, uint _pairReserveTR1) = getPairReservesTranslated(0,0);
        // lastRootKTranslated = Math.sqrt(_pairReserveTR0.mul(_pairReserveTR1));

        //Here it updates the state and throws liquidity into the pool if possible
        _update();
        initialized = 1;
        _entered = false;


    }
    // ***** EXCESS RESERVES ******

    // This function takes
    // @balance0 & @balance1 -> The New Balances After A Sync Update
    // @max0 & @max1 -> The maximum that we can save on the reserves
    // If we have any excess reserves we donate them to the pool
    // 0.614 kb
    function updateReservesRemovingExcess(uint newReserve0, uint newReserve1, uint112 max0, uint112 max1) private {
        if (max0 < newReserve0) {
            _safeTransfer(pylonToken.float, pairAddress, newReserve0 - max0);
            (uint liq, ,) = IZirconPair(pairAddress).mintOneSide(address(this), isFloatReserve0);
            reserve0 = max0;
        } else {
            reserve0 = uint112(newReserve0);
        }

        if (max1 < newReserve1) {
            _safeTransfer(pylonToken.anchor, pairAddress, newReserve1 - max1);
            IZirconPair(pairAddress).mintOneSide(address(this), !isFloatReserve0);
            reserve1 = max1;
        }else{
            reserve1 = uint112(newReserve1);
        }

        emit PylonUpdate(reserve0, reserve1);
    }
    // ****** UPDATE ********

    // Any excess of balance is going to be donated to the pair
    // This function matches the Sync pool and sends liquidity into pair if possible

    // Sends pylonReserves to pool if there is a match
    // 0.786kb
    function _syncMinting(uint maximumPercentageSync) private {
        // Let's take the current balances
        (uint balance0, uint balance1) = _getFloatAnchorBalance();
        //    uint balance0 = _getBalanceOf(pylonToken.float, address(this)); //IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));
        //        uint balance1 = _getBalanceOf(pylonToken.anchor, address(this)); //IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));

        // Intializing the variables
        // Getting pair reserves and updating variables before minting
        // Max0 and Max1 are two variables representing the maximum that can be minted on sync
        // Max0/2 & Max1/2 remain as reserves on the pylon for withdrawals
        // In the case the pair hasn't been initialized pair reserves will be 0 so we take our current balance as the maximum
        (uint reservesTranslated0, uint reservesTranslated1,) = getPairReservesTranslated(balance0, balance1);
        //uint maximumPercentageSync = IZirconPylonFactoryz(factoryAddress).maximumPercentageSync();

        // Takes half of max. Matching only happens if there's more than 50% of max in pool.
        // Rest is reserved for burns
        uint112 max0 = uint112(reservesTranslated0.mul(maximumPercentageSync)/200);
        uint112 max1 = uint112(reservesTranslated1.mul(maximumPercentageSync)/200);
        // Pylon Update Minting
        if (balance0 > max0 && balance1 > max1) {
            (uint pairReserves0, uint pairReserves1,) = getPairReservesNormalized();
            // Get Maximum finds the highest amount that can be matched at 50/50
            (uint px, uint py) = Math._getMaximum(
                pairReserves0,
                pairReserves1,
                balance0 - max0,
                balance1 - max1);

            // We run the update kFactor function for the anchor portion of liquidity
            // This is only required after initialization
            // Actually unnecessary, commented
            // if (initialized == 1) {
            // (, uint pylonReserve1) = getSyncReserves();
            // anchorKFactor = ZirconLibrary.calculateAnchorFactor(formulaSwitch, py, anchorKFactor, virtualAnchorBalance.sub(pylonReserve1), reservesTranslated0, reservesTranslated1);
            // }

            // Transferring tokens to pair and minting
            _safeTransfer(pylonToken.float, pairAddress, px);
            _safeTransfer(pylonToken.anchor, pairAddress, py);
            IZirconPair(pairAddress).mint(address(this));

        } else {
            IZirconPair(pairAddress).publicMintFee(); //we force a mintfee since no liquidity was added. Needed to keep lastK calculations consistent;
        }
        // Let's remove the tokens that are above max0 and max1, and donate them to the pool
        // This is for cases where somebody just donates tokens to pylon; tx reverts if this done via core functions
    }
    // @notice This Function is called to update some variables needed for calculation
    //1.3kb
    function _update() private returns (uint gamma, uint reserveToSwitch){
        // lastPoolTokens = IZirconPair(pairAddress).totalSupply();
        // lastK = uint(_pairReserve0).mul(_pairReserve1);
        // TODO: Seems like UniSwap dead weight
        // uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        // uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        // blockTimestampLast = blockTimestamp;

        // Removing excess reserves from the pool
        (uint balance0, uint balance1) = _getFloatAnchorBalance();

        //    uint balance0 = _getBalanceOf(pylonToken.float, address(this)); //IUniswapV2ERC20(pylonToken.float).balanceOf(address(this));
        //        uint balance1 = _getBalanceOf(pylonToken.anchor, address(this)); //IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this));

        (uint reservesTranslated0, uint reservesTranslated1,) = getPairReservesTranslated(balance0, balance1);
        uint112 max0 = uint112((reservesTranslated0 * maxPercentageSync)/100); //gov-controlld parameter, mul is unnecessary
        uint112 max1 = uint112((reservesTranslated1 * maxPercentageSync)/100);

        updateReservesRemovingExcess(
            balance0,
            balance1,
            uint112(reservesTranslated0.mul(maxPercentageSync)/100),
            uint112(reservesTranslated1.mul(maxPercentageSync)/100));

        (reservesTranslated0, reservesTranslated1,) = getPairReservesTranslated(balance0, balance1);

        //Update lastK since we may have added/removed liquidity
        lastRootKTranslated = Math.sqrt(reservesTranslated0.mul(reservesTranslated1));


        (, uint pylonReserve1) = getSyncReserves();

        //Counts gamma change and applies strike condition if necessary
        (gamma,,reserveToSwitch) = _calculateGamma(virtualAnchorBalance, anchorKFactor, pylonReserve1, reservesTranslated1);
        console.log("gammaNew, gammaOld, blockN", gamma, gammaMulDecimals, block.number);
        if(Math.absoluteDiff(gamma, gammaMulDecimals) >= deltaGammaThreshold) {
            //This makes sure that a massive mintAsync can't be exited in the same block
            strikeBlock = block.number;
        }

    }
    // ***** UPDATE ********
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


    // @notice Helper function to see if we can do a mint sync or async
    // @amountSync -> Amount of tokens to mint sync
    // @liquidity -> In case async minting is done is returned the PT Liquidity to mint for the users on the async call, if not 0
    // @amount -> Amount on async if not 0
    // >0.172
    function _handleSyncAndAsync(uint _amountIn, uint _pairReserveTranslated, uint _reserve, bool _isAnchor) private returns (uint amountOut) {
        // Calculates max tokens to be had in this reserve pool
        uint maxP = maxPercentageSync;
        uint max = _pairReserveTranslated.mul(maxP) / 100;
        uint freeSpace = 0;

        // uint ptTotalSupply  =  IZirconPoolToken(_isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress).totalSupply();
        if (max > _reserve) {
            // Calculates how much liquidity sync pool can accept
            freeSpace = max - _reserve;
            // If amountIn is less than freeSpace, this liquidity is thrown into sync pool only, for future matching.
            if(freeSpace > 0) {
                if(_amountIn <= freeSpace) {
                    _syncMinting(maxP);
                    return (_amountIn);
                } else {
                    amountOut += freeSpace;
                }
            }
        }
        // require(_amountIn < freeSpace, "ZT: B");


        //Now we do the Async part
        //already guaranteed less than amountIn
        uint amountAsyncToMint = _amountIn - freeSpace;
        //Reduce by amount that actually was minted into the pair

        //Calculates pylon pool tokens and amount it considers to have entered pool (slippage adjusted)
        uint _amountOut;

        (uint _reservePairTranslated0, uint _reservePairTranslated1,) = getPairReservesTranslated(0, 0);
        if(_isAnchor) {

            uint reserve_ = _reserve;
            //CalculateLiquidity(), destructured since used only once
            uint sqrtK = Math.sqrt(uint(_reservePairTranslated0 * _reservePairTranslated1));
            uint amountInWithFee = amountAsyncToMint * (10000-(liquidityFee/2 + 1))/10000;
            //Add the amountIn to one of the reserves
            uint sqrtKPrime = Math.sqrt(_reservePairTranslated0 * (_reservePairTranslated1.add(amountInWithFee)));

            require(sqrtKPrime > sqrtK, "ZP:SK");
            uint liqPercentage = ((sqrtKPrime - sqrtK) * 1e18)/sqrtK;

            _amountOut += _reservePairTranslated1 * (2 * liqPercentage)/1e18;

            // uint _reservePylon = _reserve; //stack too deep shit
            anchorKFactor = ZirconLibrary.calculateAnchorFactor(formulaSwitch, _amountOut, anchorKFactor, virtualAnchorBalance.sub(reserve_), _reservePairTranslated0, _reservePairTranslated1);
        } else {
            // Update anchorKFactor based on float liq.
            // Here amount is in float units
            anchorKFactor = ZirconLibrary.anchorFactorFloatAdd(
                amountAsyncToMint,
                anchorKFactor,
                _reservePairTranslated0,
                _reservePairTranslated1,
                gammaMulDecimals,
                true
            );
        }
        //Amount Out return
        //This is not used by float, so it doesn't matter if it's not adding it.
        amountOut += _amountOut;
        //liquidity += _liquidity;
        if (freeSpace > 0) {
            //If there was free space, we mint the liquidity into the sync pool
            _syncMinting(maxP);
        }

        //        amountAsyncToMint = amountAsyncToMint.sub(_isAnchor ? anchorMinted : floatMinted);

        // sending the async minting part to the pair
        //Uses raw amount since mintOneSide compensates for slippage by itself
        //        _safeTransfer(_isAnchor ? pylonToken.anchor : pylonToken.float, pairAddress, amountAsyncToMint);
        //        IZirconPair(pairAddress).mintOneSide(address(this), isFloatReserve0 != _isAnchor); //Xor to pick the right reserve
    }

    // @notice External Function called to mint pool Token
    // @dev Liquidity have to be sent before
    // TODO: recheck in dump scenario if sync pool can be blocked
    // aka syncMint
    // 1.381 kb
    function mintPoolTokens(address _to, bool isAnchor) external returns (uint liquidity) {
        //Master sync function
        reentrancyAndPauseCheck();
        sync();
        (uint112 _reserve0, uint112 _reserve1) = getSyncReserves();

        // calculate initial derivedVfb here

        // balance of float/anchor sent to this
        // Reduces by amount that was in sync reserves
        uint amountIn = _getBalanceOf(isAnchor ? pylonToken.anchor : pylonToken.float, address(this)).sub(isAnchor ? _reserve1 : _reserve0);
        notZero(amountIn);

        amountIn = payFees(amountIn, getFeeBps(42), isAnchor);

        (uint _reservePairTranslated0, uint _reservePairTranslated1,) = getPairReservesTranslated(0, 0);

        uint floatLiquidityOwned;

        uint ptbMax = _getBalanceOf(pairAddress, address(this)); //IZirconPair(pairAddress).balanceOf(address(this));
        if(!isAnchor) {

            // Change derived vfb to liquidity Owned
            // ptb * gamma gives us the float share of liquidity (pool tokens)
            // It should work much better than derived vfb. However, we need to find a way to convert external reserves to ptb
            // We can assume that they are always matched by an equivalent.
            // Hence reserve float = 1/2 of pt minted by a mintAsync with a virtual anchor match
            // However this pt number will change as prices move because there is no impermanent loss
            // And this creates some issues with updateReservesExcess.
            // Because this will always lower the ptb owned number due to slippage, forcing users to eat extra losses.
            // Or in the case of an anchor add, it will most likely increase vfb and potentially trip the invariant.

            // We could potentially track this through a return from _update() that tells us how much of liquidity thrown was already in there.
            // We can then use this to adjust the liquidity returned to the upside or downside.

            // mathematically inefficient but with the extra 1e18 required it's the same number of multiplications
            floatLiquidityOwned = ((_reserve0 * ptbMax)/(2*_reservePairTranslated0)) + ((ptbMax * gammaMulDecimals)/1e18);

            // we overwrite ptb to record max pool tokens it should give
            // this is solidity, we save on variables
            ptbMax = amountIn * ptbMax/(2*_reservePairTranslated0);

            //console.log("reservept0, gammapt0, rs0", (_reserve0 * ptb)/(2*_reservePairTranslated0), (ptb * gammaMulDecimals)/1e18, _reserve0);
            //console.log("s1", _reserve1);


            //_reserve0.add(_reservePairTranslated0.mul(2 * gammaMulDecimals)/1e18);
        }

        //amountIn, pairReserveTranslated, reserveToken, reserveOther
        uint ptTotalSupply = IZirconPoolToken(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress).totalSupply();
        //amount out is sync + slipped async anchor
        //don't care about float amountOut
        uint amountOut = _handleSyncAndAsync(amountIn, isAnchor ? _reservePairTranslated1 : _reservePairTranslated0,
            isAnchor ? _reserve1 : _reserve0, isAnchor);
        if(isAnchor) {
            // liquidity to mint is a straight amountOut/vab
            liquidity = amountOut.mul(ptTotalSupply)/virtualAnchorBalance;
            virtualAnchorBalance += amountOut;

        }

        (uint newGamma, ) = _update();

        if(!isAnchor) {
            // we calculate new derived vfb. All minting operations should be done, which means we can just calculate it
            // this is possible since we derive everything for float from anchor data
            // we apply some extra slippage to account for some edge cases where this doesn't do it on its own.

            uint _amountIn = amountIn;
            (uint _pairTranslated0,,) = getPairReservesTranslated(0, 0);
            (uint112 _reserveSync0,) = getSyncReserves();
            uint ptbNew = _getBalanceOf(pairAddress, address(this));

            uint newFloatLiquidity = (_reserveSync0 * ptbNew)/(2*_pairTranslated0) + (ptbNew * newGamma)/1e18;

            require(newFloatLiquidity > floatLiquidityOwned, "ZP: VFB");

            //            console.log("amIn, fptD, fptEq", _amountIn, newFloatLiquidity - floatLiquidityOwned, ptbMax);
            // console.log("gamma1, ptb1", newGamma, ptbNew);
            // Safety check in case we're giving too many tokens
            // Wrapped in min liq check to avoid spurious deadlocks
            if(newFloatLiquidity - floatLiquidityOwned > MINIMUM_LIQUIDITY) {
                require((newFloatLiquidity - floatLiquidityOwned) <= ptbMax, "ZP: VFB2");
            }

            liquidity = ptTotalSupply.mul( ((newFloatLiquidity * 1e18)/floatLiquidityOwned) - 1e18 )/1e18; //one overflow check sufficient

            //            uint slippagePercentage = amountOut.mul(1e18)/amountIn;

            //            (uint _pairTranslated0,) = getPairReservesTranslated(0, 0);
            //            (uint112 _reserveSync0,) = getSyncReserves();
            //
            //            uint newDerVfb = _reserveSync0.add(_pairTranslated0.mul(2 * newGamma)/1e18);
            //            //new var for stack too deep
            //            require(newDerVfb > derivedVfb, "ZP: VFB");
            //
            //            console.log("newv, oldv", newDerVfb, derivedVfb);
            //            //Safety check in case we're giving too many tokens
            //            require((newDerVfb - derivedVfb) <= amountIn, "ZP: VFB2");
            //
            //            uint _liquidity = ptTotalSupply.mul( ((newDerVfb * 1e18)/derivedVfb) - 1e18 )/1e18; //one overflow check sufficient
            //            liquidity = _liquidity.mul(slippagePercentage)/1e18;

        }

        // Mints zircon pool tokens to user after throwing their assets in the pool
        _mint(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress, _to, liquidity);

        //        IZirconPoolToken(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress).mint(_to, liquidity);
        _entered = false;
    }


    /// @notice Private function that calculates anchor fees to send to energy
    /// @dev in case the user adds liquidity in float token it will swap the amount of tokens with the Pair
    /// @return amount minus fees payed

    // Swapping every time is not ideal for gas, but it will be changed if we ever deploy to a chain like ETH
    // We care about amassing Anchor assets, holding pool tokens isn't ideal.
    // 0.615kb
    function payFees(uint amountIn, uint feeBps, bool isAnchor) private returns (uint amountOut){
        uint fee = amountIn * feeBps/10000;
        if(fee == 0) {
            return(amountIn);
        }
        // TODO: This should never go above the balance
        if (isAnchor) {
            _safeTransfer(pylonToken.anchor, energyAddress, fee);
        } else {
            _safeTransfer(pylonToken.float, pairAddress, fee);
            (uint112 _reservePair0, uint112 _reservePair1,) = getPairReservesNormalized();

            uint amountInWithFee = fee.mul(10000-liquidityFee);
            uint amountSwapped = amountInWithFee.mul(_reservePair1) / (_reservePair0.mul(10000).add(amountInWithFee));

            // uint amountSwapped = ZirconLibrary.getAmountOut(fee, _reservePair0, _reservePair1, );
            IZirconPair(pairAddress).swap(isFloatReserve0 ? 0 : amountSwapped, isFloatReserve0 ? amountSwapped : 0, energyAddress, "");
        }
        // energyAddress.delegatecall(abi.encodeWithSignature("registerFee()"));
        IZirconEnergy(energyAddress).registerFee();
        amountOut =  amountIn - fee;
    }

    /// @notice private function that sends to pair the LP tokens
    /// Burns them spayFeesending it to the energy address
    // 0.259kb
    function payBurnFees(uint amountIn, uint feeBps) private returns (uint amountOut) {
        uint fee = amountIn * feeBps/10000;

        if(fee == 0) {return amountIn;}
        // feeBps guaranteed to be less than 10000
        _safeTransfer(pairAddress, pairAddress, fee);
        IZirconPair(pairAddress).burnOneSide(energyAddress, !isFloatReserve0);

        IZirconEnergy(energyAddress).registerFee();

        amountOut = amountIn - fee;
    }


    // Calculates fee in basis points. Applies anti-flash loan protection mechanism
    // Anti-exploit measure applying extra fees for any mint/burn operation that occurs after a massive gamma change.
    // In principle classic "oracle" exploits merely speed up/force natural outcomes.
    // E.g. Maker's Black Thursday is functionally the same as a lending protocol "hack"
    // Same (sometimes) applies here if you move prices very fast. This fee is designed to make this unprofitable/temporarily lock the protocol.
    // It is also combined with the regular Pylon fee
    // 0.534kb
    function getFeeBps(uint instantPriceDecimals) private returns (uint feeBps) {

        uint maxDerivative = Math.max(gammaEMA, thisBlockEMA);
        if (instantPriceDecimals == 42) {
            feeBps = IZirconEnergy(energyAddress).getFeeByGamma(gammaMulDecimals);
        } else {
            //twice the regular swap fee as base should be enough
            feeBps = liquidityFee * 2;
            if(instantPriceDecimals >= lastPrice) {
                //Overflows would be caught further down
                feeBps += (10000 - lastPrice.mul(10000)/instantPriceDecimals);
            } else {
                feeBps += (10000 - instantPriceDecimals.mul(10000)/lastPrice);
            }
        }
        console.log("feebps, ipd, lp", feeBps, instantPriceDecimals, lastPrice);
        // If either this block's gamma derivative or EMA is higher than threshold we go into the deltaTax mechanism
        if (maxDerivative >= deltaGammaThreshold) {
            uint strikeDiff = block.number - strikeBlock;

            // To avoid calling factory again we connect cooldown period to gammaThreshold.
            // If threshold is 4%, cooldownBlocks will be 25

            // The lower the threshold the higher the cooldown blocks
            // This cooldown is potentially higher than the one applied to EMA bleed.
            // It's meant to ensure that a single episode gives time to gammaEMA to return below threshold.

            uint cooldownBlocks = 1e18/deltaGammaThreshold;

            console.log("strike, current", strikeBlock, block.number);

            if(strikeDiff > cooldownBlocks) {
                // This is the first strike (in a while)
                // We don't apply deltaTax at this time, but Pylon will remember that
                strikeBlock = block.number;
            } else {
                // You're a naughty naughty boy
                // parent if condition forces maxDerivative/dgt to be at least 1, so we can subtract 10000 without worrying
                feeBps = ((maxDerivative.mul(10000)/deltaGammaThreshold) - 10000 + IZirconPylonFactory(factoryAddress).deltaGammaMinFee()) //DeltaGamma tax
                .add(feeBps); //Regular Pylon fee

                console.log("dgt, maxD", deltaGammaThreshold, maxDerivative);
                //                return feeBps;
                //                applied = true;


                //                emit FeeBps(feeBps, applied);
                //                return(feeBps, applied);
            }
        }

        // Avoids underflow issues downstream
        require(feeBps < 10000, "Z: FTH");

        //Base case where the threshold isn't passed or it's first strike
        //        applied = false;
        //        feeBps = IZirconEnergy(energyAddress).getFeeByGamma(gammaMulDecimals);
        //        emit FeeBps(feeBps, applied);
    }




    // @notice Mint Async 100 lets you invest in one liquidity
    // The difference with Sync Liquidity is that it goes directly to the Pool
    //    function mintAsync100(address to, bool isAnchor)  external returns (uint liquidity) {
    //
    //        uint x = 5e18;
    //        uint sqrtx = Math.sqrt(5e18);
    //
    ////        reentrancyAndPauseCheck();
    ////        sync();
    ////        (uint112 _reserve0, uint112 _reserve1,) = getSyncReserves();
    ////        uint amountIn;
    ////        if (isAnchor) {
    ////            amountIn = IUniswapV2ERC20(pylonToken.anchor).balanceOf(address(this)).sub(_reserve1);
    ////        }else{
    ////            amountIn = IUniswapV2ERC20(pylonToken.float).balanceOf(address(this)).sub(_reserve0);
    ////        }
    ////        notZero(amountIn);
    ////
    ////        (uint feeBps,) = getFeeBps();
    ////
    ////        amountIn = payFees(amountIn, feeBps, isAnchor);
    ////
    ////        //Transfers tokens for minting
    ////        _safeTransfer(isAnchor ? pylonToken.anchor : pylonToken.float, pairAddress, amountIn);
    ////        {
    ////            uint amount;
    ////            (amount, liquidity) = calculateLiquidity(amountIn, isAnchor);
    ////            if (isAnchor) {
    ////                virtualAnchorBalance += amount;
    ////            } else {
    ////                virtualFloatBalance += amount;
    ////            }
    ////            IZirconPair(pairAddress).mintOneSide(address(this), isFloatReserve0 ? !isAnchor : isAnchor);
    ////            IZirconPoolToken(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress).mint(to, liquidity);
    ////        }
    ////        _update();
    //
    //        //emit MintAsync100(msg.sender, amountIn, isAnchor);
    //    }


    // @notice Mint Async lets you invest in both liquidity like you normally do on your DEX
    // The difference is that gives you directly with mint one side
    // TODO: Transfer first then calculate on basis of pool token share how many share we should give to the user
    // 2.522 kb
    function mintAsync(address to, bool shouldMintAnchor) external  returns (uint liquidity){
        reentrancyAndPauseCheck();
        // Master sync function
        sync();
        address _poolTokenAddress = shouldMintAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress;

        (uint112 _reserve0, uint112 _reserve1) = getSyncReserves(); // gas savings
        uint amountIn0;
        uint amountIn1;
        uint floatLiquidityOwned;
        uint ptbMax;
        {
            (uint balance0, uint balance1) = _getFloatAnchorBalance();

            amountIn0 = balance0.sub(_reserve0);
            amountIn1 = balance1.sub(_reserve1);


            uint feeBps;

            {
                (uint _pairReserve0, uint _pairReserve1,) = getPairReservesNormalized();
                feeBps = getFeeBps(_pairReserve1*1e18/_pairReserve0);
            }

            amountIn0 = payFees(amountIn0, feeBps, false);
            amountIn1 = payFees(amountIn1, feeBps, true);

            //Required here due to potential change to reserves from fee
            (uint pairReserveTranslated0, uint pairReserveTranslated1,) = getPairReservesTranslated(0, 0);

            uint _syncReserve1 = _reserve1;//stack

            if(!shouldMintAnchor) {

                uint ptb = _getBalanceOf(pairAddress, address(this));
                floatLiquidityOwned = (_reserve0 * ptb)/(2*pairReserveTranslated0) + (ptb * gammaMulDecimals)/1e18;
                ptbMax = amountIn0 * ptb/pairReserveTranslated0;
                //derivedVfb = _reserve0.add(pairReserveTranslated0.mul(2 * gammaMulDecimals)/1e18);
            }

            // Derives adjusted amount (min of the two sides * 2)
            uint amount = shouldMintAnchor
            ? Math.min((amountIn0.mul(2 * pairReserveTranslated1))/pairReserveTranslated0, amountIn1 * 2)
            : Math.min((amountIn1.mul(2 * pairReserveTranslated0))/pairReserveTranslated1, amountIn0 * 2);


            // uint amount = getLiquidityFromPoolTokens(amountIn0, amountIn1, shouldMintAnchor, IZirconPoolToken(_poolTokenAddress).totalSupply());
            // liquidity = _liquidity;
            if (shouldMintAnchor) {

                // We need to track anchor liquidity additions to make sure float value doesn't change from it
                // This function calculates/updates this adjustment factor

                //(uint pairReserveTranslated0, uint pairReserveTranslated1) = getPairReservesTranslated(0, 0);
                anchorKFactor = ZirconLibrary.calculateAnchorFactor(formulaSwitch, amount, anchorKFactor, virtualAnchorBalance.sub(_syncReserve1), pairReserveTranslated0, pairReserveTranslated1);

                uint ptTotalSupply = IZirconPoolToken(_poolTokenAddress).totalSupply();

                liquidity = amount.mul(ptTotalSupply)/virtualAnchorBalance;
                virtualAnchorBalance += amount;

            } else {
                //Amount always has to be expressed in anchor units
                //uint amount, uint oldKFactor, uint _reserveTranslated0, uint _reserveTranslated1, uint _gamma) returns (uint anchorKFactor) {
                anchorKFactor = ZirconLibrary.anchorFactorFloatAdd(
                    amount * pairReserveTranslated1/pairReserveTranslated0,
                    anchorKFactor,
                    pairReserveTranslated0,
                    pairReserveTranslated1,
                    gammaMulDecimals,
                    false //isAsync100
                );
            }

        }

        notZero(amountIn0);
        notZero(amountIn1);
        _safeTransfer(pylonToken.float, pairAddress, amountIn0);
        _safeTransfer(pylonToken.anchor, pairAddress, amountIn1);
        IZirconPair(pairAddress).mint(address(this));
        // uint deltaSupply = pair.totalSupply().sub(_totalSupply);
        // TODO: Change fee

        (uint newGamma,) = _update();

        if(!shouldMintAnchor) {

            //this is possible since we derive everything for float from anchor data

            (uint _pairTranslated0,,) = getPairReservesTranslated(0, 0);
            (uint112 _reserveSync0,) = getSyncReserves();

            uint ptbNew = _getBalanceOf(pairAddress, address(this));
            uint newFloatLiquidity = (_reserveSync0 * ptbNew)/(2*_pairTranslated0) + (ptbNew * newGamma)/1e18;

            uint ptTotalSupply = IZirconPoolToken(_poolTokenAddress).totalSupply();

            //uint newDerVfb = _reserveSync0.add(_pairTranslated0.mul(2 * newGamma)/1e18);
            require(newFloatLiquidity > floatLiquidityOwned, "ZP: VFB");

            //Safety check in case we're giving too many tokens

            //console.log("as newv, oldv", newFloatLiquidity, floatLiquidityOwned);
            if(newFloatLiquidity - floatLiquidityOwned > MINIMUM_LIQUIDITY) {
                require((newFloatLiquidity - floatLiquidityOwned) <= ptbMax, "ZP: VFB2A");
            }

            liquidity = ptTotalSupply.mul( ((newFloatLiquidity * 1e18)/floatLiquidityOwned) - 1e18 )/1e18; //one overflow check sufficient

        }
        _mint(_poolTokenAddress, to, liquidity);
        //  IZirconPoolToken(_poolTokenAddress).mint(to, liquidity);

        emit MintAsync(msg.sender, amountIn0, amountIn1);
        _entered = false;

    }


    // 1.384
    /// @notice Master update function. Syncs up the vault's state with the pool and any price/fee changes
    function sync() private {
        liquidityFee = IZirconFactory(pairFactoryAddress).liquidityFee();
        maxPercentageSync = IZirconPylonFactory(factoryAddress).maximumPercentageSync();
        deltaGammaThreshold = IZirconPylonFactory(factoryAddress).deltaGammaThreshold();
        oracleUpdateSecs = IZirconPylonFactory(factoryAddress).oracleUpdateSecs();
        // Prevents this from being called while the underlying pool is getting flash loaned
        if(msg.sender != pairAddress) {
            IZirconPair(pairAddress).tryLock();
        }

        // we call removeExcess to skim tokens in case price changes made reserves go above max
        // This makes pool token calculations less prone to error.
        (uint _pairReserveTranslated0, uint _pairReserveTranslated1,) = getPairReservesTranslated(0, 0);
        //define rootK here before we potentially add liquidity
        IZirconPair(pairAddress).publicMintFee();
        uint rootKTranslated = Math.sqrt(_pairReserveTranslated0 * _pairReserveTranslated1); //generally if this overflows at this stage the pool is fucked

        {
            (uint112 _pylonReserve0, uint112 _pylonReserve1) = getSyncReserves();

            uint112 max0 = uint112((_pairReserveTranslated0 * maxPercentageSync)/100); //gov-controlled parameter, mul is unnecessary
            uint112 max1 = uint112((_pairReserveTranslated1 * maxPercentageSync)/100);
            updateReservesRemovingExcess(_pylonReserve0, _pylonReserve1, max0, max1);

        }
        // We force a mintfee to make sure fee calculations are always correct


        // So this thing needs to get pool reserves, get the price of the float asset in anchor terms
        // Then it applies the base formula:
        // Adds fees to virtualFloat and virtualAnchor
        // And then calculates Gamma so that the proportions are correct according to the formula

        (uint pairReserveTranslated0, uint pairReserveTranslated1, uint32 lastUniTimestamp) = getPairReservesTranslated(0, 0);
        (uint112 pylonReserve0, uint112 pylonReserve1) = getSyncReserves();

        uint oldGamma = gammaMulDecimals;

        //Oracle update

        //The accumulator we get is a sum of all prices so far.
        //To calculate an average price we have to do two samples and divide by the time elapsed
        //In our case we primarily care about the price between last block and the next
        //However this is largely impossible since we cannot assure the sample rate will be constant or frequent enough
        //In general tho a bit of averaging is good to prevent longer term toxic flow (e.g. listing pump)

        //The price is used for a comparison with current instant price based on reserves
        //We then use this to calculate a fee for async methods (which are a swap).

        //The purpose is to avoid toxic flow swooping the sync reserves.
        //Arbing through the regular swap should always be cheaper than this.
        //console.log("ping");
        uint currentFloatAccumulator = isFloatReserve0 ? IZirconPair(pairAddress).price0CumulativeLast() : IZirconPair(pairAddress).price1CumulativeLast();

        uint blockTimestamp = block.timestamp;
        //We set a minimum update delay for reliability. 120 seconds by default.
        if(blockTimestamp > lastOracleTimestamp + oracleUpdateSecs) {


            if(blockTimestamp > lastUniTimestamp) {

                uint timeElapsed = blockTimestamp - lastUniTimestamp;
                uint _reservePair1 = pairReserveTranslated1 << 112; //UQ encode
                //We simulate the Uni oracle in case no update, as per implementation.
                //Manually handling UQs to avoid library calls etc.
                currentFloatAccumulator += uint(_reservePair1/pairReserveTranslated0) * timeElapsed;

            }
            //        uint private lastOracleTimestamp;
            //        uint private lastFloatAccumulator;

            //In the unlikely case this messes up somehow, we keep old lastPrice
            if(currentFloatAccumulator > lastFloatAccumulator) {
                //convert accumulator to 1e18 multiplier form
                uint _avgPrice = uint256(((currentFloatAccumulator - lastFloatAccumulator) * 1e18) >> 112);


                _avgPrice = _avgPrice/(blockTimestamp - lastOracleTimestamp);

                lastPrice = _avgPrice;
                lastOracleTimestamp = blockTimestamp;
                lastFloatAccumulator = currentFloatAccumulator;

            }
        }




        // If the current K is equal to the last K, means that we haven't had any updates on the pair level
        // So is useless to update any variable because fees on pair haven't changed
        // uint currentK = uint(pairReserve0).mul(pairReserve1);
        // uint poolTokensPrime = IZirconPair(pairAddress).totalSupply();
        if (pairReserveTranslated0 != 0 && pairReserveTranslated1 != 0) {

            //uint poolTokensPrime = IZirconPair(pairAddress).totalSupply();
            // Here it is going to be useful to have a Minimum Liquidity
            // If not we can have some problems

            // uint totalPoolValueAnchorPrime = translateToPylon(pairReserve1.mul(2), 0);

            // uint feeValueAnchor = IZirconEnergyRevenue(energyRevAddress).getBalanceFromPair(); //totalPoolValueAnchorPrime.mul(d)/1e18;
            // We convert from anchor to float units
            // uint feeValueFloat = feeValueAnchor.mul(pairReserveTranslated0)/pairReserveTranslated1;

            // Calculating gamma, variable used to calculate tokens to mint and withdrawals

            // gamma is supposed to always be an accurate reflection of the float share as a percentage of the totalPoolValue
            // however the virtual anchor balance also includes the syncPool reserve portion, which is completely outside of the pools.

            // Mu mostly follows gamma but it's designed to find an equilibrium point different from 50/50
            // More on this in the function itself;

            // KTranslated is reduced by mintFee since it mints extra pool tokens (diluting ptt part of the translation)
            // So as long as we can ensure mintFee is always called before assigning, this should be correct.

            uint feeToAnchor;


            {

                //We redefine them here so that we don't use the old reference and get stack too deep.
                //                uint _reserveTranslated0 = pairReserveTranslated0;
                //                uint _reserveTranslated1 = pairReserveTranslated1;



                if(rootKTranslated > lastRootKTranslated) {
                    uint feeValuePercentageAnchor = (rootKTranslated - lastRootKTranslated).mul(muMulDecimals) / lastRootKTranslated;
                    //fees might be tiny and get canceled due to mu

                    if(feeValuePercentageAnchor > 0) {
                        feeToAnchor = 2*pairReserveTranslated1.mul(feeValuePercentageAnchor)/1e18;

                        //                        uint adjustedVab = virtualAnchorBalance.sub(pylonReserve1);
                        //
                        //                        //we calculate anchor factor here by treating fees as an addition of liquidity
                        //                        //however since the current k already includes this addition, we need to pass it down adjusted reserve values
                        //                        //we also only consider the part of fees going into the pool
                        //                        //Unnecessary
                        //
                        //                        anchorKFactor = ZirconLibrary.calculateAnchorFactor(
                        //                            formulaSwitch,
                        //                            feeToAnchor * adjustedVab / virtualAnchorBalance,
                        //                            anchorKFactor,
                        //                            virtualAnchorBalance.sub(pylonReserve1),
                        //                            _reserveTranslated0.mul(1e18 - feeValuePercentageAnchor) / 1e18,
                        //                            _reserveTranslated1.mul(1e18 - feeValuePercentageAnchor) / 1e18);
                    }

                }

            }



            virtualAnchorBalance += feeToAnchor;
            //virtualFloatBalance += adjustedVfb.mul(floatFeeFactor * feeValuePercentage)/1e36;

            (gammaMulDecimals, formulaSwitch,) = _calculateGamma(virtualAnchorBalance, anchorKFactor, pylonReserve1, pairReserveTranslated1);

            //Todo: Can simply pass factory instance and let energy fetch the parameters to save size
            muMulDecimals = IZirconEnergy(energyAddress)._updateMu(
                IZirconPylonFactory(factoryAddress).muUpdatePeriod(),
                IZirconPylonFactory(factoryAddress).muChangeFactor(),
                muBlockNumber,
                muMulDecimals,
                gammaMulDecimals,
                muOldGamma
            );
            muOldGamma = gammaMulDecimals;
            muBlockNumber = block.number;

            lastRootKTranslated = rootKTranslated;

            //updateDelta()

            //Calculates a "delta gamma" EMA which is used to "lock down" the pool.
            //Above a threshold, fees get absurdly high and make it very difficult to complete price manipulation cycles (like in exploits).
            //The initial "trigger" that pumps the EMA is not taxed, to allow for legitimate whales to come in.

            //Using an EMA makes it more resilient, as otherwise an attacker could just wait out the sampling period to eliminate the outlier.

            //Block numbers are overall harder to manipulate and more relevant for our purposes.
            //There is some variability due to block time, it would make sense to tune the number of samples for each chain.


            uint blockDiff = block.number.sub(EMABlockNumber);
            if (blockDiff != 0) {

                uint EMASamples = IZirconPylonFactory(factoryAddress).EMASamples();
                //Using past average means that delta spikes stay embedded in it for a while

                //Strike block is recorded by applyDeltaTax. It means that one of gamma/thisBlock triggered the failsafe
                //The first transaction is allowed but if there's anything else in this block/triggering a massive gamma change, it fails.
                //Threshold is quite high, this is unlikely to impact legitimate usage.

                //To recover from this strike condition we add a general time-based bleed that starts 10 blocks after the strike was triggered.


                //Bleed ensures pool doesn't get deadlocked by reducing EMA based on inactivity
                //To do this we use blockDiff instead of strikeDiff since otherwise EMA would almost always bleed to zero.
                uint bleed = (block.number - strikeBlock > 10) ? blockDiff / 10 : 0;

                //Adds old blockEMA
                //averaged out EMA primarily meant for non-flashloan manipulation attempts

                gammaEMA = ((gammaEMA * EMASamples).add(thisBlockEMA))/((EMASamples + 1).add(bleed));

                //This one is more for flash loans
                //Adds new value

                thisBlockEMA = Math.absoluteDiff(gammaMulDecimals, oldGamma);

                //Resets thisBlock values
                EMABlockNumber = block.number;
            } else {

                //Adds any delta change if it's in the same block.
                thisBlockEMA = thisBlockEMA.add(Math.absoluteDiff(gammaMulDecimals, oldGamma));
            }

            console.log("thisEMA", thisBlockEMA);

            // Sync pool also gets a claim to these
            emit PylonSync(virtualAnchorBalance, anchorKFactor, gammaMulDecimals);
        }
    }



    /// @notice 0.414kb
    function calculateLPTU(bool _isAnchor, uint _liquidity, uint _ptTotalSupply) view private returns (uint claim){
        (uint _reserve0, uint _reserve1,) = getPairReservesTranslated(1,1); // gas savings
        (uint112 _pylonReserve0, uint112 _pylonReserve1) = getSyncReserves(); // gas savings
        uint pylonShare;
        uint ptb = IUniswapV2ERC20(pairAddress).balanceOf(address(this));
        if (_isAnchor) {
            pylonShare = (ptb.mul(virtualAnchorBalance - _pylonReserve1))/(_reserve1 * 2);
            // Adjustment factor to extract correct amount of liquidity
            // pylonShare = pylonShare.add(pylonShare.mul(_pylonReserve1)/_reserve1.mul(2));
        }else{
            pylonShare = ((gammaMulDecimals).mul(ptb))/1e18;
            // pylonShare = pylonShare.add(pylonShare.mul(_pylonReserve0)/_reserve0.mul(2));
        }
        // Liquidity/pt applies share over pool + reserves to something that is just pool.
        // So it gives less liquidity than it should
        uint maxPoolTokens = _isAnchor ?
        _ptTotalSupply - (_ptTotalSupply.mul(_pylonReserve1) / virtualAnchorBalance) :
        _ptTotalSupply - (_ptTotalSupply.mul(_pylonReserve0) / (_reserve0.mul(2*gammaMulDecimals) / 1e18 + _pylonReserve0));

        claim = (_liquidity.mul(pylonShare))/maxPoolTokens;
        notZero(claim); // ( > 0, "Z: CZ");
    }

    /// @notice TODO
    // Burn Async send both tokens 50-50
    // Liquidity has to be sent before
    //    function sendSlashing(uint omegaMulDecimals, uint liquidity) private returns(uint remainingPercentage){
    //        if (omegaMulDecimals < 1e18) {
    //            //finds amount to cover
    //            uint amountToAdd = liquidity.mul(1e18-omegaMulDecimals)/1e18;
    //            // uint energyAnchorBalance = IUniswapV2ERC20(pylonToken.anchor).balanceOf(energyAddress);
    //            //finds how much we can cover
    //            uint energyPTBalance = IUniswapV2ERC20(pairAddress).balanceOf(energyAddress);
    //
    //
    //            if (amountToAdd < energyPTBalance) {
    //                // Sending PT tokens to Pair because burn one side is going to be called after
    //                // sends pool tokens directly to pair
    //                _safeTransferFrom(pairAddress, energyAddress, pairAddress, amountToAdd);
    //            } else {
    //                // Sending PT tokens to Pair because burn one side is going to be called after
    //                // @dev if amountToAdd is too small the remainingPercentage will be 0 so that is ok
    //
    //                _safeTransferFrom(pairAddress, energyAddress, pairAddress, energyPTBalance);
    //                remainingPercentage = (amountToAdd.sub(energyPTBalance).mul(1e18))/(liquidity);
    //
    //            }
    //        }TFF
    //    }

    /// @notice function that sends tokens to Pair to be burned after
    /// 0.505kb
    /// this function must be called only before a burn takes place, if not it'll give away tokens
    //    function sendSlashedTokensToUser(uint floatAmount, uint anchorAmount, uint percentage, address _to) private returns (uint amount) {
    //        if(percentage != 0) {
    //            uint totalAmount = anchorAmount;
    //            if (floatAmount > 0) {
    //                (uint res0, uint res1) = getPairReservesNormalized();
    //                totalAmount += floatAmount * res1/res0;
    //            }
    //
    //            // TotalAmount is what the user already received, while percentage is what's missing.
    //            // We divide to arrive to the original amount and diff it with totalAmount to get final number.
    //            // Percentage is calculated "natively" as a full 1e18
    //            // ta/(1-p) - ta = ta*p/(1-p)
    //            uint amountToTransfer = totalAmount.mul(percentage)/(1e18 - percentage);
    //            uint eBalance = IUniswapV2ERC20(pylonToken.anchor).balanceOf(energyAddress);
    //
    //            amount = eBalance > amountToTransfer ? amountToTransfer : eBalance;
    //            _safeTransferFrom(pylonToken.anchor, energyAddress, _to, amountToTransfer);
    //
    //            IZirconEnergy(energyAddress).syncReserve();
    //        }
    //    }


    /// @notice Burn Async let's you burn your anchor|float shares giving you back both tokens
    /// @dev sends to the Pair Contract the PTU equivalent to the Anchor|Float Shares
    /// and calls Classic burn
    // 1.42
    function burnAsync(address _to, bool _isAnchor) external  returns (uint amount0, uint amount1) {
        reentrancyAndPauseCheck();
        //Calls master sync function
        sync();
        //Calculates Pylon pool token balance to burn
        IZirconPoolToken pt = IZirconPoolToken(_isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress);
        uint liquidity = pt.balanceOf(address(this));
        notZero(liquidity);
        uint ptTotalSupply = pt.totalSupply(); // pylon total supply
        //        uint extraAmount = 0;

        uint feeBps;
        {
            (uint _pairReserve0, uint _pairReserve1,) = getPairReservesNormalized();
            feeBps = getFeeBps(_pairReserve1*1e18/_pairReserve0);
        }


        // We disable the strike protection for burns
        // require(strikeBlock != block.number, "Z: P");

        // Calculates user's share of Uniswap pool tokens held by Pylon
        // Declared here to be used for payBurnFees later
        uint ptu = calculateLPTU(_isAnchor, liquidity, ptTotalSupply);

        {

            (uint reserveFloat, uint reserveAnchor) = getSyncReserves();
            (uint pairReserves0, uint pairReserves1,) = getPairReservesTranslated(0, 0);
            {
                // Calculates max liquidity allowed for withdrawal with this method
                // Burn async can't touch the sync reserves, so max supply needs to be adjusted.
                uint maxPoolTokens = _isAnchor ?
                ptTotalSupply - ptTotalSupply.mul(reserveAnchor) / virtualAnchorBalance :
                ptTotalSupply - ptTotalSupply.mul(reserveFloat) / ((pairReserves0.mul(2 * gammaMulDecimals) / 1e18) + reserveFloat);
                require(liquidity < maxPoolTokens, "Z: E");
            }


            uint ptuWithFee = ptu.sub((feeBps * ptu)/10000);

            if (_isAnchor) {
                // If it's an anchor, it needs to compensate for potential slashing
                // This function tries to get compensation in the form of pool tokens
                // Function sends extra PTs to Pylon if required

                // ExtraPercentage defines how much is still needed to be covered by raw anchors.
                // ptu returned is the omega-adjusted share

                // The ptu returned is adjusted by Omega
                {
                    address to = _to;
                    (ptuWithFee, amount1) = IZirconEnergy(energyAddress).handleOmegaSlashing(
                        ptuWithFee,
                        Math.min(1e18, (1e18 - gammaMulDecimals).mul(pairReserves1 * 2)/(virtualAnchorBalance - reserveAnchor)),
                        liquidityFee,
                        isFloatReserve0,
                        to);
                }

                // (ptuWithFee, extraPercentage) = handleOmegaSlashing(ptuWithFee);
                // This one retrieves tokens from ZirconEnergy if available

                anchorKFactor = ZirconLibrary.calculateAnchorFactorBurn(
                    formulaSwitch,
                    virtualAnchorBalance.mul(liquidity)/ptTotalSupply, // we derive amount of anchors burned
                    ptuWithFee,
                    _getBalanceOf(pairAddress, address(this)), //IZirconPair(pairAddress).balanceOf(),
                    anchorKFactor,
                    virtualAnchorBalance - reserveAnchor,
                    pairReserves1
                );
            }

            // Sends for burning
            _safeTransfer(pairAddress, pairAddress, ptuWithFee);

        }
        // Burning liquidity and sending to user
        // The pool tokens sent to the Pair are slashed by omega
        // handleOmega has sent the pool tokens if it had them, so this function retrieves the full share
        address to = _to; //stack too deep

        (, uint _pairReserves1,) = getPairReservesTranslated(0, 0);
        //we save ptb here for the float anchorK calculation
        uint ptb = _getBalanceOf(pairAddress, address(this));

        (uint amountA, uint amountB) = IZirconPair(pairAddress).burn(to);

        // Burn fee after everything to avoid loss of precision to omega identity & burning compensation tokens
        uint ptuWithFee = payBurnFees(ptu, feeBps);
        //console.log("Burned:", amountA, amountB);

        amount0 += isFloatReserve0 ? amountA : amountB;
        amount1 += isFloatReserve0 ? amountB : amountA;
        if(!_isAnchor) {
            anchorKFactor = ZirconLibrary.anchorFactorFloatBurn(
                amount1 * 2,
                anchorKFactor,
                ptuWithFee,
                ptb,
                _pairReserves1,
                gammaMulDecimals
            );
        }

        // Burns the Zircon pool tokens
        pt.burn(address(this), liquidity);

        // Updating vab
        if(_isAnchor) {
            virtualAnchorBalance -= (virtualAnchorBalance * liquidity)/ptTotalSupply; //already calculated before, overflow is caught
        }

        // updates variables required for sync()
        _update();

        // Emitting event on burned async
        _entered = false;
        emit BurnAsync(msg.sender, amount0, amount1);
    }

    /// @notice Function That handles the amount of reserves in Float Anchor Shares
    /// and the amount of the minimum from liquidity and reserves
    /// @dev Helper function for burn
    /// 0.323kb
    function burnPylonReserves(bool isAnchor, uint _totalSupply, uint _liquidity) view private returns (uint reservePT, uint amount) {


        (uint _reserve0, uint _reserve1,) = getPairReservesTranslated(0,0); // gas savings
        (uint112 _pylonReserve0, uint112 _pylonReserve1) = getSyncReserves();

        // Calculates maxPTs that can be serviced through Pylon Reserves
        uint pylonReserve = isAnchor ? _pylonReserve1 : _pylonReserve0;
        uint reserve = isAnchor ? _reserve1 : _reserve0;

        uint virtualBalance = isAnchor ? virtualAnchorBalance : pylonReserve.add(reserve.mul(gammaMulDecimals).mul(2)/1e18);

        reservePT = pylonReserve.mul(_totalSupply)/virtualBalance;

        uint _ptuAmount = Math.min(reservePT, _liquidity);
        amount = virtualBalance.mul(_ptuAmount)/_totalSupply;
    }


    /// @notice Omega is the slashing factor. It's always equal to 1 if pool has gamma above 50%
    /// If it's below 50%, it begins to go below 1 and thus slash any withdrawal.
    /// @dev Note that in practice this system doesn't activate unless the syncReserves are empty.
    /// Also note that a dump of 60% only generates about 10% of slashing.
    // 0.39kb
    //    function handleOmegaSlashing(uint ptu) private returns (uint retPtu, uint extraPercentage){
    //        (, uint reserveAnchor) = getSyncReserves();
    //        (, uint pairReserves1) = getPairReservesTranslated(0,0);
    //
    //        uint omegaMulDecimals = Math.min(1e18, (1e18 - gammaMulDecimals).mul(pairReserves1 * 2)/(virtualAnchorBalance - reserveAnchor));
    //
    //        // Send slashing should send the extra PTUs to Uniswap.
    //        // When burn calls the uniswap burn it will also give users the compensation
    //        retPtu = omegaMulDecimals.mul(ptu)/1e18;
    //
    //        if (omegaMulDecimals < 1e18) {
    //            //finds amount to cover
    //            uint amountToAdd = ptu * (1e18-omegaMulDecimals)/1e18; // already checked
    //            // uint energyAnchorBalance = IUniswapV2ERC20(pylonToken.anchor).balanceOf(energyAddress);
    //            // finds how much we can cover
    //            uint energyPTBalance = IUniswapV2ERC20(pairAddress).balanceOf(energyAddress);
    //            if (amountToAdd < energyPTBalance) {
    //                // Sending PT tokens to Pair because burn one side is going to be called after
    //                // sends pool tokens directly to pair
    //                _safeTransferFrom(pairAddress, energyAddress, pairAddress, amountToAdd);
    //            } else {
    //                // Sending PT tokens to Pair because burn one side is going to be called after
    //                // @dev if amountToAdd is too small the remainingPercentage will be 0 so that is ok
    //                _safeTransferFrom(pairAddress, energyAddress, pairAddress, energyPTBalance);
    //                extraPercentage = (amountToAdd - energyPTBalance).mul(1e18)/(ptu);
    //            }
    //        }
    //        // (extraPercentage) = sendSlashing(omegaMulDecimals, ptu);
    //    }

    // @notice Burn send liquidity back to user burning Pool tokens
    // The function first uses the reserves of the Pylon
    // If not enough reserves it burns The Pool Tokens of the pylon
    // Fees here are
    // 1.55kb
    function burn(address _to, bool _isAnchor) external returns (uint amount){
        reentrancyAndPauseCheck();
        sync();
        // Selecting the Pool Token class on basis of the requested tranch to burn
        IZirconPoolToken pt = IZirconPoolToken(_isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress);
        // Let's get how much liquidity was sent to burn
        // Outside of scope to be used for vab/vfb adjustment later
        uint liquidity = pt.balanceOf(address(this));

        notZero(liquidity);
        uint _totalSupply = pt.totalSupply();
        {
            //address to = _to;
            bool isAnchor = _isAnchor;
            //address _pairAddress = pairAddress;

            // Here we calculate max PTU to extract from sync reserve + amount in reserves
            (uint reservePT, uint _amount) = burnPylonReserves(isAnchor, _totalSupply, liquidity);

            uint feeBps = getFeeBps(42); //42 is code for sync, disregard price info

            //This is a reserve extraction
            //Tpv doesn't change and neither does adjusted vab, so we don't care about anchor factor
            uint returnAmount = _amount - (_amount * feeBps)/10000;
            _safeTransfer(isAnchor ? pylonToken.anchor : pylonToken.float, _to, returnAmount);

            address to_ = _to;

            //In case the reserves weren't able to pay for everything
            if (reservePT < liquidity) {
                uint _liquidityAdjusted = liquidity - reservePT;
                uint ptu = calculateLPTU(isAnchor, _liquidityAdjusted, _totalSupply);
                //Two vars since we can't pay fees until omega calculations are done
                uint ptuWithFee = ptu - (ptu * feeBps)/10000;

                uint anchorPtSupply = _totalSupply; // stack too deep avoidance
                uint extraPercentage = 0;
                (uint reservesTranslated0, uint reservesTranslated1,) = getPairReservesTranslated(0, 0);

                bool isAnchor_ = isAnchor;
                address to__ = to_;

                uint ptb = _getBalanceOf(pairAddress, address(this));
                if(isAnchor_) {
                    (,uint reserveAnchor) = getSyncReserves();
                    {
                        uint amount_ = 0;
                        //ptuWithFee here is the one with omega applied
                        (ptuWithFee, amount_) = IZirconEnergy(energyAddress).handleOmegaSlashing(
                            ptuWithFee,
                            Math.min(1e18, (1e18 - gammaMulDecimals).mul(reservesTranslated1 * 2)/(virtualAnchorBalance - reserveAnchor)),
                            IZirconFactory(pairFactoryAddress).liquidityFee(),
                            isFloatReserve0,
                            to__);
                        returnAmount += amount_;

                    }

                    anchorKFactor = ZirconLibrary.calculateAnchorFactorBurn(
                        formulaSwitch,
                        virtualAnchorBalance * (_liquidityAdjusted)/anchorPtSupply, // unchecked here since they are checked in other places
                        ptuWithFee,
                        ptb,
                        anchorKFactor,
                        virtualAnchorBalance - reserveAnchor,
                        reservesTranslated1
                    );

                }

                // Shifting this to the bottom since we can't pay fees until slashing is done.
                payFees(_amount, feeBps, isAnchor_);


                _safeTransfer(pairAddress, pairAddress, ptuWithFee);
                // address to_ = _to; //stack too deep
                // bool isReserve0 = isFloatReserve0 ? !isAnchor : isAnchor;
                uint sentAmount = IZirconPair(pairAddress).burnOneSide(to_, isFloatReserve0 != isAnchor_);  // XOR

                returnAmount += sentAmount;

                // Float-based anchorK adjustment
                if(!isAnchor_) {
                    anchorKFactor = ZirconLibrary.anchorFactorFloatBurn(
                        sentAmount.mul(reservesTranslated1)/reservesTranslated0,
                        anchorKFactor,
                        ptuWithFee,
                        ptb,
                        reservesTranslated1,
                        gammaMulDecimals
                    );
                }

                payBurnFees(ptu, feeBps);
                // Bool combines choice of anchor or float with which token is which in the pool
            }

            pt.burn(address(this), liquidity); // Should burn unadjusted amount ofc
            amount = returnAmount;
        }

        if(_isAnchor) {
            virtualAnchorBalance -= virtualAnchorBalance.mul(liquidity)/_totalSupply;
        }

        _update();
        emit Burn(msg.sender, amount, _isAnchor);
        _entered = false;

    }

    // 0.287kb
    function migrateLiquidity(address newPylon) external{
        onlyFactory();
        _safeTransfer(pairAddress, newPylon , _getBalanceOf(pairAddress, address(this)));
        _safeTransfer(pylonToken.anchor, newPylon, _getBalanceOf(pylonToken.anchor, address(this)));
        _safeTransfer(pylonToken.float, newPylon, _getBalanceOf(pylonToken.float, address(this)));
    }

    function changeEnergyAddress(address _energyAddress, address _energyRevAddress) external {
        onlyFactory();
        energyAddress = _energyAddress;
        energyRevAddress = _energyRevAddress;
    }



}
