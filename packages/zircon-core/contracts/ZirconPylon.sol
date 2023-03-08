pragma solidity =0.5.16;
import './interfaces/IZirconPair.sol';
import './interfaces/IZirconPoolToken.sol';
import "./libraries/ZirconLibrary.sol";
import "./interfaces/IZirconPylonFactory.sol";
import "./interfaces/IZirconFactory.sol";
import "./interfaces/IZirconPylon.sol";
import "./energy/interfaces/IZirconEnergy.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol';

contract ZirconPylon is IZirconPylon {

    // **** Libraries ****
    using SafeMath for uint112;
    using SafeMath for uint256;
    ZirconLibrary.Decimals decimals;
    using ZirconLibrary for ZirconLibrary.Decimals;

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

    // Indicates if in the pair the token0 is float or anchor
    bool public isFloatReserve0;

    uint private constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));
    bytes4 private constant SELECTOR_FROM = bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));

    // ***** Key variables required to reproduce Pylon state *****
    uint public virtualAnchorBalance;
    bool public formulaSwitch;
    uint public p2x;
    uint public p2y;
    uint public virtualFloatBalance;


    uint public lastRootKTranslated;
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

    // **** EVENTS ****
    event FeeBPS(uint feeBps);
    event PylonUpdate(uint reserve0, uint reserve1, uint virtualAnchorBalance, uint virtualFloatBalance, uint p2x, uint p2y, uint gamma);
    event PylonSync(uint reserve0, uint reserve1, uint virtualAnchorBalance, uint virtualFloatBalance, uint p2x, uint p2y, uint gamma);
    event MintSync(address sender, uint aIn0, bool isAnchor);
    event MintAsync(address sender, uint aIn0, uint aIn1);
    event Burn(address sender, uint aIn0, bool isAnchor);
    event BurnAsync(address sender, uint aIn0, uint aIn1);
    event UpdateLastPrice(uint lastPrice, uint blockTimestamp, uint currentFloatAccumulator);
    event ProcessFees(uint float, uint anchor);

    // ****** CONSTRUCTOR ******
    constructor() public {
        factoryAddress = msg.sender;
    }

    // **** HELPER FUNCTIONS ******
    function _mint(address token, address to, uint value) private {
        IZirconPoolToken(token).mint(to, value);
    }

    function _burn(address token, address to, uint value) internal {
        IZirconPoolToken(token).burn(to, value);
    }

    function _totalSupply(address token) private view returns (uint totalSupply) {
        totalSupply = IUniswapV2ERC20(token).totalSupply();
    }

    function _getBalanceOf(address erc20Address, address where) private view returns (uint balance){
        balance = IUniswapV2ERC20(erc20Address).balanceOf(where);
    }

    function _getFloatAnchorBalance() private view returns (uint floatBalance, uint anchorBalance){
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

    function getSyncReserves()  public view returns  (uint112 _reserve0, uint112 _reserve1) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
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
        (uint _reservePair0, uint _reservePair1, uint32 _timestamp) = getPairReservesNormalized();
        uint ptb = _getBalanceOf(pairAddress, address(this));
        uint ptt = _totalSupply(pairAddress);
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
        decimals = ZirconLibrary.Decimals(
            10**uint(IUniswapV2ERC20(_floatToken).decimals()),
            10**uint(IUniswapV2ERC20(_anchorToken).decimals()),
            10**uint(IUniswapV2ERC20(_floatToken).decimals() + 18 - IUniswapV2ERC20(_anchorToken).decimals()));
    }

    // 0.048 kb
    function initMigratedPylon(uint _gamma, uint _vab, uint _vfb, uint _p2x, uint _p2y, bool _formulaSwitch) external {
        onlyFactory(); // sufficient check
        updateFees();
        gammaMulDecimals = _gamma;
        virtualAnchorBalance = _vab;
        formulaSwitch = _formulaSwitch;

        muMulDecimals = gammaMulDecimals; // Starts as gamma, diversifies over time. Used to calculate fee distribution
        muBlockNumber = block.number; // block height of last mu update
        muOldGamma = gammaMulDecimals; // gamma value at last mu update

        // with 0 it reverts in the next lines
        (uint cacheReserve0, uint cacheReserve1,) = getPairReservesTranslated(1, 1);
        (uint res0, uint res1, uint timestamp) = getPairReservesNormalized();
        (uint syncReserve0,) = getSyncReserves();

        lastPrice = (res1 * decimals.priceMultiplier)/res0;
        lastFloatAccumulator = isFloatReserve0 ? IZirconPair(pairAddress).price0CumulativeLast() : IZirconPair(pairAddress).price1CumulativeLast();
        lastOracleTimestamp = timestamp;
        EMABlockNumber = block.number;

        p2x = _p2x;
        p2y = _p2y;
        virtualFloatBalance = _vfb;
        // TODO: Might cause issue since it's not adjusted, maybe call with code 42?
        if (_vab != 0) {_update(0, false, cacheReserve0, cacheReserve1, _vab);}

        initialized = 1;
    }

    //    # Parabolic VFB
    //
    //    # We have a very open parabola defined by three points:
    //    # P1 = (0,0)
    //    # P2 = (y/VFB, 2k/vfb - vab) or (custom point based on fitting to liquidity changes)
    //    # P3 = (VAB ** 2 /k), VAB) (principle behind kx/vab formula)
    //
    //    # P2 is in the base case a point defined as having the same Y as the point of closest approach
    //    # between 2kx and vfbx, which is conveniently found as d(2kx)/dx = vfb
    //
    //    # Any addition/removal of liquidity while in parabola mode changes P2 to fit.
    //    # P2 then gets reset once out of inLineFormula. Generally this shouldn't change the curve that much.
    //    #
    //    # We then fit a parabola with these three points. Parabola can be angled down, up, or be a line if a is (almost) 0
    //    # This fits all cases of float balance, including too much or too little.
    //    # However additions of too much float are still limited in case the parabola gets too bent.

    function _calculateGamma(
        uint _virtualAnchorBalance,
         uint _pylonReserve1,
        uint _translatedReserve0, uint _translatedReserve1) view public returns (uint gamma, bool isLineFormula, bool reduceOnly) {

        uint adjustedVab = _virtualAnchorBalance.sub(_pylonReserve1);
        // Gradual division since adding 1e18 immediately would result in overflow
        uint x = (_translatedReserve1 * (decimals.priceMultiplier))/_translatedReserve0;
        uint ftv;
        (ftv, isLineFormula, reduceOnly) = decimals.getFTVForX(
            x,
            p2x, p2y,
            _translatedReserve0,
            _translatedReserve1,
            adjustedVab);
        gamma = ftv.mul(1e18)/(_translatedReserve1 * 2);
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

        require(_reservePair0 > 0 && _reservePair1 > 0);

        lastOracleTimestamp = timestamp;
        lastFloatAccumulator = isFloatReserve0 ? IZirconPair(pairAddress).price0CumulativeLast() : IZirconPair(pairAddress).price1CumulativeLast();
        lastPrice = (uint256(_reservePair1) * decimals.priceMultiplier/_reservePair0);
        updateFees();

        _entered = true;
        (uint balance0, uint balance1) = _getFloatAnchorBalance();
        notZero(balance0);
        notZero(balance1);

        // We force balances to match pair ratio. Required to avoid initializing vab and vfb at wrong values
        (balance0, balance1) = Math._getMaximum(_reservePair0, _reservePair1, balance0, balance1);

        virtualAnchorBalance = balance1;
        virtualFloatBalance = balance0;

        uint balance0Adjusted = balance0 - (balance0 * maxPercentageSync)/200;
        uint balance1Adjusted = balance1 - (balance1 * maxPercentageSync)/200;

        {

            (p2x, p2y) = decimals.calculateP2(balance0Adjusted * balance1Adjusted, balance1Adjusted, balance0Adjusted);

            //Special call with 0 pylon Sync reserves and total pool value equal to the balances we're initializing with.
            //This should always be 50%
            (gammaMulDecimals, formulaSwitch,) = _calculateGamma(
                virtualAnchorBalance,
                (balance1 * maxPercentageSync)/200,
                balance0Adjusted,
                balance1Adjusted);

        }

        // Time to mint some tokens
        _mint(anchorPoolTokenAddress, address(0), MINIMUM_LIQUIDITY);
        _mint(floatPoolTokenAddress, address(0), MINIMUM_LIQUIDITY);

        anchorLiquidity = balance1.sub(MINIMUM_LIQUIDITY);
        floatLiquidity = (balance0 * 1e18/gammaMulDecimals.mul(2)).sub(MINIMUM_LIQUIDITY);

        _syncMinting(maxPercentageSync);
        _mint(anchorPoolTokenAddress, _to, anchorLiquidity);
        _mint(floatPoolTokenAddress, _to, floatLiquidity);

        muMulDecimals = gammaMulDecimals; // Starts as gamma, diversifies over time. Used to calculate fee distribution
        muBlockNumber = block.number; // block height of last mu update
        muOldGamma = gammaMulDecimals; // gamma value at last mu update

        //Here it updates the state and throws liquidity into the pool if possible
        _update(42, false, balance0Adjusted, balance1Adjusted, balance1Adjusted);
        initialized = 1;
        _entered = false;


    }
    // ***** EXCESS RESERVES ******

    // This function takes
    // @balance0 & @balance1 -> The New Balances After A Sync Update
    // @max0 & @max1 -> The maximum that we can save on the reserves
    // If we have any excess reserves we donate them to the pool
    // 0.614 kb
    function updateReservesRemovingExcess(uint newReserve0, uint newReserve1, uint112 max0, uint112 max1) private returns (uint liq0, uint liq1){
        if (max0 < newReserve0) {
            _safeTransfer(pylonToken.float, pairAddress, newReserve0 - max0);
            (liq0, ,) = IZirconPair(pairAddress).mintOneSide(address(this), isFloatReserve0);
            reserve0 = max0;
        } else {
            reserve0 = uint112(newReserve0);
        }

        if (max1 < newReserve1) {
            _safeTransfer(pylonToken.anchor, pairAddress, newReserve1 - max1);
            (liq1,,) = IZirconPair(pairAddress).mintOneSide(address(this), !isFloatReserve0);
            reserve1 = max1;
        }else{
            reserve1 = uint112(newReserve1);
        }

    }
    // ****** UPDATE ********

    // Any excess of balance is going to be donated to the pair
    // This function matches the Sync pool and sends liquidity into pair if possible

    // Sends pylonReserves to pool if there is a match
    // 0.786kb
    function _syncMinting(uint maximumPercentageSync) private returns (uint px, uint py)  {
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
            (px, py) = Math._getMaximum(
                pairReserves0,
                pairReserves1,
                balance0 - max0,
                balance1 - max1);

            // Transferring tokens to pair and minting
            _safeTransfer(pylonToken.float, pairAddress, px);
            _safeTransfer(pylonToken.anchor, pairAddress, py);
            IZirconPair(pairAddress).mint(address(this)); // Event emitted on the Pair so ir should be fine

        } else {
            IZirconPair(pairAddress).publicMintFee();
            px = 0;
            py = 0;
            // we force a mintfee since no liquidity was added. Needed to keep lastK calculations consistent;
        }
        // Let's remove the tokens that are above max0 and max1, and donate them to the pool
        // This is for cases where somebody just donates tokens to pylon; tx reverts if this done via core functions
    }

    // @notice This function executes async100 mint and resets key variables for future calculations
    // It also calculates P2 and desiredFtv, critical for the system.
    // DesiredFtv requires holding both pre-mint and post-mint parameters, which adds a significant amount of awkwardness to the procedure.
    // 1.3kb
    function _update(uint floatChange, bool isPercentage, uint oldReserve0, uint oldReserve1, uint oldVab) private returns (uint gamma, bool reduceOnly){

        // Removing excess reserves from the pool
        (uint balance0, uint balance1) = _getFloatAnchorBalance();
        (uint reservesTranslated0, uint reservesTranslated1,) = getPairReservesTranslated(balance0, balance1);
        {
            updateReservesRemovingExcess(
                balance0,
                balance1,
                uint112(reservesTranslated0.mul(maxPercentageSync) / 100),
                uint112(reservesTranslated1.mul(maxPercentageSync) / 100));
        }

        reservesTranslated0 = oldReserve0;
        reservesTranslated1 = oldReserve1;

        uint desiredFtv;
        if(floatChange != 42 ) {
            uint _floatChange = floatChange;
            bool _isPercentage = isPercentage;
            (uint newReserve0, uint newReserve1,) = getPairReservesTranslated(balance0, balance1);

            desiredFtv = calculateDesiredFtv(
                reservesTranslated0, reservesTranslated1, // We take old reserves
                newReserve1.mul(decimals.priceMultiplier)/newReserve0,
                oldVab,
                _floatChange,
                _isPercentage
            );
            reservesTranslated0 = newReserve0;
            reservesTranslated1 = newReserve1;

        }

        // Update lastK since we may have added/removed liquidity
        lastRootKTranslated = Math.sqrt(reservesTranslated0.mul(reservesTranslated1));

        (uint pylonReserve0, uint pylonReserve1) = getSyncReserves();

        // Calculates new p2x and p2y points based on desiredFtv, which is calculated by upstream methods.
        // Code for ignoring desired FTV parameter, to be used only in init
        if(floatChange != 42) {
            (p2x, p2y) = decimals.evaluateP2(
                (reservesTranslated1 * decimals.priceMultiplier)/reservesTranslated0,
                virtualAnchorBalance - pylonReserve1,
                virtualFloatBalance - pylonReserve0,
                reservesTranslated0, reservesTranslated1,
                desiredFtv
            );
        }


        // Counts gamma change and applies strike condition if necessary
        (gamma, ,reduceOnly) = _calculateGamma(
            virtualAnchorBalance,
             pylonReserve1,
            reservesTranslated0, reservesTranslated1
        );

        if(Math.absoluteDiff(gamma, gammaMulDecimals) >= deltaGammaThreshold) {
            // This makes sure that a massive mintAsync can't be exited in the same block
            strikeBlock = block.number;
        }

        emit PylonUpdate(reserve0, reserve1, virtualAnchorBalance, virtualFloatBalance, p2x, p2y, gamma);

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
    function _handleSyncAndAsync(uint _amountIn, uint _pairReserveTranslated, uint _reserve, bool _isAnchor) private returns (uint amountOut, uint amountPool, uint trueAmountOut) {
        // Calculates max tokens to be had in this reserve pool
        uint maxP = maxPercentageSync;
        uint max = _pairReserveTranslated.mul(maxP) / 100;
        uint freeSpace;
        uint syncMint;

        // We pre-calculate how much could get syncminted
        {
            (uint res0, uint res1,) = getPairReservesTranslated(0, 0);
            uint max0 = res0 * maxP / 200;
            uint max1 = res1 * maxP / 200;

            uint balance0 = _getBalanceOf(pylonToken.float, address(this));
            uint balance1 = _getBalanceOf(pylonToken.anchor, address(this));

            if(balance0 > max0 && balance1 > max1) {
                (uint _px, uint _py) = Math._getMaximum(
                    res0, res1,
                    balance0 - max0,
                    balance1 - max1
                );

                if(_isAnchor) {
                    max = (res1 + _py) * maxP/100;
                    syncMint = _py;
                } else {
                    max = (res0 + _px) * maxP/100;
                    syncMint = _px;
                }
            }
        }

        if (max > _reserve) {
            // Calculates how much liquidity sync pool can accept
            freeSpace = max + syncMint - _reserve;
            // If amountIn is less than freeSpace, this liquidity is thrown into sync pool only, for future matching.
            if(freeSpace > 0) {
                if(_amountIn <= freeSpace) {
                    (uint px,) = _syncMinting(maxP);
                    return (_amountIn, px, _amountIn);
                } else {
                    amountOut += freeSpace;
                }
            }
        }
        // Now we do the Async part
        // already guaranteed less than amountIn
        uint amountAsyncToMint = _amountIn - freeSpace;
        // Reduce by amount that actually was minted into the pair

        // Calculates pylon pool tokens and amount it considers to have entered pool (slippage adjusted)
        uint _amountOut;

        (uint _reservePairTranslated0, uint _reservePairTranslated1,) = getPairReservesTranslated(0, 0);
        if(_isAnchor) {

//            uint reserve_ = _reserve;
            //CalculateLiquidity(), destructured since used only once
            uint sqrtK = Math.sqrt(uint(_reservePairTranslated0 * _reservePairTranslated1));
            uint amountInWithFee = amountAsyncToMint * (10000-(liquidityFee/2 + 1))/10000;
            //Add the amountIn to one of the reserves
            uint sqrtKPrime = Math.sqrt(_reservePairTranslated0 * (_reservePairTranslated1.add(amountInWithFee)));

            require(sqrtKPrime > sqrtK, "ZP:SK");
            uint liqPercentage = ((sqrtKPrime - sqrtK) * 1e18)/sqrtK;

            _amountOut += _reservePairTranslated1 * (2 * liqPercentage)/1e18;

            //Don't care about other variables when adding anchor

        } else {

//            uint reserve_ = _reserve;
            //CalculateLiquidity(), destructured since used only once
            uint sqrtK = Math.sqrt(uint(_reservePairTranslated0 * _reservePairTranslated1));
            uint amountInWithFee = amountAsyncToMint * (10000-(liquidityFee/2 + 1))/10000;
            //Add the amountIn to one of the reserves
            uint sqrtKPrime = Math.sqrt((_reservePairTranslated0.add(amountInWithFee)) * _reservePairTranslated1);

            require(sqrtKPrime > sqrtK, "ZP:SK");

            //          we divide by sqrtk prime instead of sqrtk to create additional slashing
            //          since this addition of liquidity is dumping the price significantly
            //          and making other floats lose
            //          this is a middle ground with the "snapshot" method
            //          since it introduces way too much slippage for the user

            uint liqPercentage = ((sqrtKPrime - sqrtK) * 1e18)/sqrtK;
            uint liqPercentageAdjusted = ((sqrtKPrime - sqrtK) * 1e18)/sqrtKPrime;

            _amountOut += _reservePairTranslated0 * (2 * liqPercentageAdjusted)/1e18;
            trueAmountOut = _reservePairTranslated0 * (2 * liqPercentage)/1e18;

        }
        //Amount Out return
        //This is not used by float, so it doesn't matter if it's not adding it.
        amountOut += _amountOut;
        //liquidity += _liquidity;
        uint px;
        if (freeSpace > 0) {
            //If there was free space, we mint the liquidity into the sync pool
            (px,) = _syncMinting(maxP);
        }
        amountPool = px + trueAmountOut;
        trueAmountOut += freeSpace;

        //With float we get amountOut for Pt calculations, amountPool for desiredFTV and trueAmountOut for VFB.
        //With anchor we only care about amountOut and px for amountPool
    }

    // @notice External Function called to mint pool Token
    // @dev Liquidity have to be sent before
    // aka syncMint
    // 1.381 kb
    function mintPoolTokens(address _to, bool isAnchor) external returns (uint liquidity) {
        //Master sync function
        reentrancyAndPauseCheck();
        sync();
        (uint112 _reserve0, uint112 _reserve1) = getSyncReserves();

        // Calculate initial derivedVfb here

        // Balance of float/anchor sent to this
        // Reduces by amount that was in sync reserves

        uint amountIn = _getBalanceOf(isAnchor ? pylonToken.anchor : pylonToken.float, address(this)).sub(isAnchor ? _reserve1 : _reserve0);
        notZero(amountIn);

        {
            // Skims the other side if it has been sent
            // Required due to a number of potential issues it might cause when update() runs.
            address wrongToken = isAnchor ? pylonToken.float : pylonToken.anchor;
            uint wrongBalance = _getBalanceOf(wrongToken, address(this));
            uint wrongReserve = isAnchor ? _reserve0 : _reserve1;
            if(wrongBalance > wrongReserve) {
                _safeTransfer(wrongToken, energyAddress, wrongBalance - wrongReserve);
                IZirconEnergy(energyAddress).registerFee();
            }
        }

        amountIn = payFees(amountIn, getFeeBps(42), isAnchor);
        uint ptb = _getBalanceOf(pairAddress, address(this));

        (uint _reservePairTranslated0, uint _reservePairTranslated1,) = getPairReservesTranslated(0, 0);

        // Amount out is sync + slipped async anchor
        // Don't care about float amountOut
        uint oldVab = virtualAnchorBalance - _reserve1;
        uint ftvChange;
        uint ptTotalSupply = _totalSupply(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress);
        uint _liquidity;
        address to_ = _to;
        bool _isAnchor = isAnchor;
        {
            uint _syncReserve0 = _reserve0;
            uint _syncReserve1 = _reserve1;

            uint _amountIn = amountIn;
            (uint _pairReserve0, uint _pairReserve1) = (_reservePairTranslated0, _reservePairTranslated1);

            uint _ptb = ptb;
            (uint amountOut, uint amountPool, uint trueAmountOut) = _handleSyncAndAsync(_amountIn, _isAnchor ? _pairReserve1 : _pairReserve0,
                _isAnchor ? _syncReserve1 : _syncReserve0, _isAnchor);

            // Logic of desiredFtv is same for both cases
            // Amount pool returns px + trueAmountOut so it's already adjusted by slippage

            // Adjusted in update if there is any price change

            ftvChange = amountPool * _pairReserve1/_pairReserve0;

            if (_isAnchor) {
                // liquidity to mint is a straight amountOut/vab
                _liquidity = amountOut.mul(ptTotalSupply) / virtualAnchorBalance;
                virtualAnchorBalance += amountOut;

            } else {
                uint floatLiquidityOwned = ((_syncReserve0 * _ptb)/(2*_pairReserve0)) + ((_ptb * gammaMulDecimals)/1e18);
                _liquidity = (amountOut * _ptb / (2 * _pairReserve0)).mul(ptTotalSupply) / floatLiquidityOwned;
                // TODO: Change to getFTV for x?
                uint ftv = (2 * _pairReserve0 * gammaMulDecimals) / 1e18;
                virtualFloatBalance += virtualFloatBalance * trueAmountOut / (ftv + _syncReserve0);
            }

        }

        (, bool reduceOnly) = _update(ftvChange, false, _reservePairTranslated0, _reservePairTranslated1, oldVab);

        // We block all float mints that place the pool into reduceOnly
        require(!reduceOnly || isAnchor, "ZP: ReduceOnly");

        // Mints zircon pool tokens to user after throwing their assets in the pool
        _mint(_isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress, to_, _liquidity);

        liquidity = _liquidity;

        // IZirconPoolToken(isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress).mint(_to, liquidity);
        _entered = false;
    }

    /// @notice Private function that calculates anchor fees to send to energy
    /// @dev in case the user adds liquidity in float token it will swap the amount of tokens with the Pair
    /// @return amount minus fees payed

    // Swapping every time is not ideal for gas, but it will be changed if we ever deploy to a chain like ETH
    // We care about amassing Anchor assets, holding pool tokens isn't ideal.
    // 0.615kb
    function payFees(uint amountIn, uint feeBps, bool isAnchor) private returns (uint amountOut){
        uint fee = (amountIn * feeBps)/10000;
        if(fee <= 10) {
            return(amountIn);
        }
        if (isAnchor) {
            // Require primarily for UX purposes of sending a custom error
            require(_getBalanceOf(pylonToken.anchor, address(this)) > fee, "Z: FTH2");
            _safeTransfer(pylonToken.anchor, energyAddress, fee);
        } else {
            _safeTransfer(pylonToken.float, pairAddress, fee);
            (uint112 _reservePair0, uint112 _reservePair1,) = getPairReservesNormalized();

            uint amountInWithFee = fee.mul(10000-liquidityFee);
            uint amountSwapped = amountInWithFee.mul(_reservePair1) / (_reservePair0.mul(10000).add(amountInWithFee));
            if(amountSwapped == 0) return amountIn;
            IZirconPair(pairAddress).swap(isFloatReserve0 ? 0 : amountSwapped, isFloatReserve0 ? amountSwapped : 0, energyAddress, "");
        }

        IZirconEnergy(energyAddress).registerFee();
        amountOut =  amountIn.sub(fee); // SubFlow Check here if fee > amountIn (MintAsync)
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
        // If either this block's gamma derivative or EMA is higher than threshold we go into the deltaTax mechanism
        if (maxDerivative >= deltaGammaThreshold) {
            uint strikeDiff = block.number - strikeBlock;

            // To avoid calling factory again we connect cooldown period to gammaThreshold.
            // If threshold is 4%, cooldownBlocks will be 25

            // The lower the threshold the higher the cooldown blocks
            // This cooldown is potentially higher than the one applied to EMA bleed.
            // It's meant to ensure that a single episode gives time to gammaEMA to return below threshold.

            uint cooldownBlocks = 1e18/deltaGammaThreshold;


            if(strikeDiff > cooldownBlocks) {
                // This is the first strike (in a while)
                // We don't apply deltaTax at this time, but Pylon will remember that
                strikeBlock = block.number;
            } else {
                // You're a naughty naughty boy
                // parent if condition forces maxDerivative/dgt to be at least 1, so we can subtract 10000 without worrying
                feeBps = ((maxDerivative.mul(10000)/deltaGammaThreshold) - 10000 + IZirconPylonFactory(factoryAddress).deltaGammaMinFee()) //DeltaGamma tax
                .add(feeBps); //Regular Pylon fee

                //                console.log("dgt, maxD", deltaGammaThreshold, maxDerivative);
                //                return feeBps;
                //                applied = true;


                //                emit FeeBps(feeBps, applied);
                //                return(feeBps, applied);
            }
        }

        emit FeeBPS(feeBps);
        // Avoids underflow issues downstream
        require(feeBps < 10000, "Z: FTH");

        //Base case where the threshold isn't passed or it's first strike
        //        applied = false;
        //        feeBps = IZirconEnergy(energyAddress).getFeeByGamma(gammaMulDecimals);
        //        emit FeeBps(feeBps, applied);
    }

    // @notice Mint Async lets you invest in both liquidity like you normally do on your DEX
    // The difference is that gives you directly with mint one side
    // 2.522 kb
    function mintAsync(address to, bool shouldMintAnchor) external  returns (uint liquidity){
        reentrancyAndPauseCheck();

        // Master sync function
        sync();

        uint oldVab;
        {
            (, uint112 _syncReserve1) = getSyncReserves();
            oldVab = virtualAnchorBalance - _syncReserve1;
        }
        uint liquidity_;
        address _poolTokenAddress = shouldMintAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress;

        uint amountIn0;
        uint amountIn1;
        uint floatExtra;
        uint ftvChange;
        {
            (uint112 _syncReserve0, uint112 _syncReserve1) = getSyncReserves();
            {
                (uint _pairReserve0, uint _pairReserve1,) = getPairReservesNormalized();
                (uint balance0, uint balance1) = _getFloatAnchorBalance();
                uint feeBps = getFeeBps(_pairReserve1*decimals.priceMultiplier/_pairReserve0);

                //We charge all fees to the Anchor side and use a mintOneSide to throw the rest of the float.
                //Due to how small this is, in most cases the extra slippage is something like 0.0004% of the amountIn so no big deal.
                //Similarly the effect on price is tiny - swapping 30 bucks out of 20k.

                //But we need to keep track of the extra float and mint it separately.
                amountIn0 = balance0.sub(_syncReserve0);
                //taking the fee applied to the float and using it to mint a bit extra after the main event.

                floatExtra = amountIn0 * (2 * feeBps)/10000;
                amountIn0 = amountIn0.sub(floatExtra); // SubFlow Protection Here
                amountIn1 = payFees(balance1.sub(_syncReserve1), 2 * feeBps, true);
            }


            bool _shouldMintAnchor = shouldMintAnchor;
            // Required here due to potential change to reserves from fee
            (uint pairReserveTranslated0, uint pairReserveTranslated1,) = getPairReservesTranslated(0, 0);

            address _ptAddress = _poolTokenAddress;

            uint _amountIn0 = amountIn0;
            uint _amountIn1 = amountIn1;

            uint amount = _shouldMintAnchor
            ? Math.min((_amountIn0.mul(2 * pairReserveTranslated1))/pairReserveTranslated0, _amountIn1 * 2)
            : Math.min((_amountIn1.mul(2 * pairReserveTranslated0))/pairReserveTranslated1, _amountIn0 * 2);

            {
                // Calculating extra liquidity from floatExtra
                // Since we saved on a swap we can add a few sqrts to give the mathematically correct amount
                // We simulate the fact that we're minting this one after the main mint. Ensures lowest slippage
                uint sqrtK = Math.sqrt((pairReserveTranslated0 + _amountIn0) * (pairReserveTranslated1 + _amountIn1));
                uint sqrtKP = Math.sqrt((pairReserveTranslated0 + _amountIn0 + floatExtra) * (pairReserveTranslated1 + _amountIn1));

                if(sqrtKP > sqrtK) {
//                    uint supposedAmount = _shouldMintAnchor ? _amountIn1 * 2 : _amountIn0 * 2;

                    amount += (sqrtKP - sqrtK).mul(_shouldMintAnchor ? 2 * (pairReserveTranslated1 + _amountIn1)
                        : 2 * (pairReserveTranslated0 + _amountIn0))/sqrtK;
                }

            }


            if(!_shouldMintAnchor) {
                uint _liquidity;
                {
                    uint ptb = _getBalanceOf(pairAddress, address(this));
                    uint floatLiquidityOwned = (_syncReserve0 * ptb) / (2 * pairReserveTranslated0) + (ptb * gammaMulDecimals) / 1e18;
                    uint ptbMax = amount * ptb / (2 * pairReserveTranslated0);
                    _liquidity = ptbMax.mul(_totalSupply(_ptAddress)) / floatLiquidityOwned;
                }
                liquidity_ = _liquidity;
                ftvChange = (amount * pairReserveTranslated1/pairReserveTranslated0);
                virtualFloatBalance += virtualFloatBalance.mul(amount)/((pairReserveTranslated0.mul(2*gammaMulDecimals)/1e18) + _syncReserve0);
            }

            // Derives adjusted amount (min of the two sides * 2)
            if (_shouldMintAnchor) {

                // We need to track anchor liquidity additions to make sure float value doesn't change from it
                // This function calculates/updates this adjustment factor

                liquidity_ = amount.mul(_totalSupply(_ptAddress))/virtualAnchorBalance;
                virtualAnchorBalance += amount;

            }

        }
        liquidity = liquidity_;

        // Recording reserve before mint operations
        (uint cacheReserve0, uint cacheReserve1,) = getPairReservesTranslated(0, 0);
        notZero(amountIn0);
        notZero(amountIn1);

        _safeTransfer(pylonToken.float, pairAddress, amountIn0);
        _safeTransfer(pylonToken.anchor, pairAddress, amountIn1);
        IZirconPair(pairAddress).mint(address(this));

        // Minting the extra chunk
        // Quite inefficient ofc but better than losing extra to fees.
        _safeTransfer(pylonToken.float, pairAddress, floatExtra);
        IZirconPair(pairAddress).mintOneSide(address(this), isFloatReserve0);

        // We need to pass update the pre-change reserves to ensure the Ftv calculations are correct
        (, bool reduceOnly) = _update(ftvChange, false, cacheReserve0, cacheReserve1, oldVab);

        require(!reduceOnly || shouldMintAnchor, "ZP: ReduceOnly");
        _mint(_poolTokenAddress, to, liquidity);

        emit MintAsync(msg.sender, amountIn0, amountIn1);
        _entered = false;

    }

    function updateFees() private {
        // TODO: here makes sense to do smth like an update variable just for gas savings
        liquidityFee = IZirconFactory(pairFactoryAddress).liquidityFee();
        maxPercentageSync = IZirconPylonFactory(factoryAddress).maximumPercentageSync();
        deltaGammaThreshold = IZirconPylonFactory(factoryAddress).deltaGammaThreshold();
        oracleUpdateSecs = IZirconPylonFactory(factoryAddress).oracleUpdateSecs();
    }

    // 1.384
    /// @notice Master update function. Syncs up the vault's state with the pool and any price/fee changes
    function sync() private {
        updateFees();

        // Prevents this from being called while the underlying pool is getting flash loaned
        if(msg.sender != pairAddress) {
            IZirconPair(pairAddress).tryLock();
        }

        // Define rootK here before we potentially add liquidity
        IZirconPair(pairAddress).publicMintFee();
        (uint _pairReserveTranslated0, uint _pairReserveTranslated1,) = getPairReservesTranslated(0, 0);
        uint rootKTranslated = Math.sqrt(_pairReserveTranslated0 * _pairReserveTranslated1); //generally if this overflows at this stage the pool is fucked

        // This section skims tokens in case price changes would result in existing reserves to be thrown into the pool
        // We force a mintFee to make sure fee calculations are always correct
        // So this thing needs to get pool reserves, get the price of the float asset in anchor terms
        // Then it applies the base formula:
        // Adds fees to virtualFloat and virtualAnchor
        // And then calculates Gamma so that the proportions are correct according to the formula

        (uint pairReserveTranslated0, uint pairReserveTranslated1, uint32 lastUniTimestamp) = getPairReservesTranslated(0, 0);
        (uint112 pylonReserve0, uint112 pylonReserve1) = getSyncReserves();

        uint oldGamma = gammaMulDecimals;

        // Oracle update

        // The accumulator we get is a sum of all prices so far.
        // To calculate an average price we have to do two samples and divide by the time elapsed
        // In our case we primarily care about the price between last block and the next
        // However this is largely impossible since we cannot assure the sample rate will be constant or frequent enough
        // In general tho a bit of averaging is good to prevent longer term toxic flow (e.g. listing pump)

        // The price is used for a comparison with current instant price based on reserves
        // We then use this to calculate a fee for async methods (which are a swap).

        // The purpose is to avoid toxic flow swooping the sync reserves.
        // Arbing through the regular swap should always be cheaper than this.
        uint currentFloatAccumulator = isFloatReserve0 ? IZirconPair(pairAddress).price0CumulativeLast() : IZirconPair(pairAddress).price1CumulativeLast();

        uint blockTimestamp = block.timestamp;
        //We set a minimum update delay for reliability. 120 seconds by default.
        if(blockTimestamp > lastOracleTimestamp + oracleUpdateSecs) {
            if(blockTimestamp > lastUniTimestamp) {
                uint timeElapsed = blockTimestamp - lastUniTimestamp;
                uint _reservePair1 = pairReserveTranslated1 << 112; //UQ encode
                // We simulate the Uni oracle in case no update, as per implementation.
                // Manually handling UQs to avoid library calls etc.
                currentFloatAccumulator += uint(_reservePair1/pairReserveTranslated0) * timeElapsed;
            }
            //In the unlikely case this messes up somehow, we keep old lastPrice
            if(currentFloatAccumulator > lastFloatAccumulator) {
                //convert accumulator to 1e18 multiplier form
                //Shift in two steps to avoid cancellation

                //normalize all prices to 1e18 to avoid loss of precision on shitcoins paired with usd
                //don't make tokens with low decimals kids

                uint _avgPrice = (uint256(((
                (currentFloatAccumulator - lastFloatAccumulator)
                /(blockTimestamp - lastOracleTimestamp))
                >> 28)) * decimals.priceMultiplier) >> 84;

                lastPrice = _avgPrice;
                lastOracleTimestamp = blockTimestamp;
                lastFloatAccumulator = currentFloatAccumulator;
                emit UpdateLastPrice(lastPrice, blockTimestamp, currentFloatAccumulator);
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
            uint feeToFloat;

            (uint _pairReserveTranslated0, uint _pairReserveTranslated1) = (pairReserveTranslated0, pairReserveTranslated1);

        {

                // We redefine them here so that we don't use the old reference and get stack too deep.

                if(rootKTranslated > lastRootKTranslated) {
                    // Since we always multiply current reserves by feePercentage it's more correct to divide by SqrtKPrime
                    uint feeValuePercentage = (rootKTranslated - lastRootKTranslated) * 1e18 / rootKTranslated;

                    uint _pylonReserve1 = pylonReserve1;
//                    uint _pylonReserve0 = pylonReserve0;

                    (uint _feeToAnchor, uint _feeToFloat, uint _p2x, uint _p2y) = processFees(
                         _pylonReserve1,
                        _pairReserveTranslated0, _pairReserveTranslated1,
                        feeValuePercentage
                    );

                    if(_feeToFloat != 0 && _p2x != 0) {
                        p2x = _p2x;
                        p2y = _p2y;
                        feeToAnchor = _feeToAnchor;
                        feeToFloat = _feeToFloat;
                    } else {
                        feeToAnchor = _feeToAnchor;
                    }
                    emit ProcessFees(feeToFloat, feeToAnchor);

                }

            }

            virtualAnchorBalance += feeToAnchor;
            virtualFloatBalance += feeToFloat;

            (gammaMulDecimals, formulaSwitch,) = _calculateGamma(
                virtualAnchorBalance, pylonReserve1,
                _pairReserveTranslated0, _pairReserveTranslated1
            );

            {
                uint oldMu = muMulDecimals;

                muMulDecimals = IZirconEnergy(energyAddress)._updateMu(
                    IZirconPylonFactory(factoryAddress).muUpdatePeriod(),
                    IZirconPylonFactory(factoryAddress).muChangeFactor(),
                    muBlockNumber,
                    muMulDecimals,
                    gammaMulDecimals,
                    muOldGamma
                );
                if(muMulDecimals != oldMu) {
                    muOldGamma = gammaMulDecimals;
                    muBlockNumber = block.number;
                }
            }

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
                //To do this we use blockDifff instead of strikeDiff since otherwise EMA would almost always bleed to zero.
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

            // Sync pool also gets a claim to these
            emit PylonUpdate(reserve0, reserve1, virtualAnchorBalance, virtualFloatBalance, p2x, p2y, gammaMulDecimals);
        }
    }


    function processFees(
        uint pylonReserve1,
        uint pairReserve0,
        uint pairReserve1,
        uint feeValuePercentage) private view returns (uint feeToAnchor, uint feeToFloat, uint _p2x, uint _p2y) {

        feeToAnchor = (2*pairReserve1.mul(feeValuePercentage)/1e18);

        feeToFloat = (feeToAnchor.mul(1e18 - muMulDecimals)/1e18).mul(pairReserve0)/pairReserve1;
        feeToAnchor = feeToAnchor.mul(muMulDecimals)/1e18;

        _p2x = p2x;
        _p2y = p2y.add(feeToFloat.mul(p2x)/1e18); //convert float into anchor at old p2 price

        //        //This function basically needs to assign the fee to the float
        //        //Which is automatically done if we're in sqrtkx
        //        //But needs a manual adjustment if we're not
        //
        //        //The difficulty is that the fee is already in the pair
        //        //And we also need to split it into two
        //
        //        //this is also happening before anything is calculated in terms of gamma etc
        //        //this can help us frame this by basically retroactively adding the fee to the pylon state
        //        //so we imagine that the fee is added as a single thing at p2x, if applicable.

        if(decimals.checkDerivative(_p2x, _p2y, pairReserve0, pairReserve1, virtualAnchorBalance + feeToAnchor - pylonReserve1)) {
            //reset all fees to anchor.
            feeToAnchor = feeToAnchor * 1e18/(muMulDecimals);
            feeToFloat = 0;
            _p2x = 0; //Not assigned downstream if 0
            _p2y = 0;
        }
    }



    /// @notice 0.414kb
    function calculateLPTU(bool _isAnchor, uint _liquidity, uint _ptTotalSupply) view private returns (uint claim){
        (uint _reserve0, uint _reserve1,) = getPairReservesTranslated(1,1); // gas savings
        (uint112 _pylonReserve0, uint112 _pylonReserve1) = getSyncReserves(); // gas savings
        uint pylonShare;
        uint ptb = _getBalanceOf(pairAddress, address(this));
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
        notZero(claim);
    }


    /// @notice Burn Async let's you burn your anchor|float shares giving you back both tokens
    /// @dev sends to the Pair Contract the PTU equivalent to the Anchor|Float Shares
    /// and calls Classic burn
    // 1.42


    function burnAsync(address _to, bool _isAnchor) external  returns (uint amount0, uint amount1) {
        reentrancyAndPauseCheck();
        //Calls master sync function
        sync();
        //Calculates Pylon pool token balance to burn
        address pt = (_isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress);
        uint liquidity = _getBalanceOf(pt, address(this));
        notZero(liquidity);
        uint ptTotalSupply = _totalSupply(pt); // pylon total supply
        //        uint extraAmount = 0;

        uint feeBps;
        {
            (uint _pairReserve0, uint _pairReserve1,) = getPairReservesNormalized();
            feeBps = getFeeBps(_pairReserve1*decimals.priceMultiplier/_pairReserve0);
        }

        // We disable the strike protection for burns
        // require(strikeBlock != block.number, "Z: P");

        // Calculates user's share of Uniswap pool tokens held by Pylon
        // Declared here to be used for payBurnFees later
        uint ptu = calculateLPTU(_isAnchor, liquidity, ptTotalSupply);
//        console.log("ptu", ptu);

        uint ftvChange = 1e18;
        uint ptuWithFee = ptu;
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

            ptuWithFee = ptu.sub((feeBps * ptu)/10000);
//            console.log("ptu:: ", ptuWithFee, ptu);
            if (_isAnchor) {
                // If it's an anchor, it needs to compensate for potential slashing
                // This function tries to get compensation in the form of pool tokens
                // Function sends extra PTs to Pylon if required

                // ExtraPercentage defines how much is still needed to be covered by raw anchors.
                // ptu returned is the omega-adjusted share

                // The ptu returned is adjusted by Omega

//                console.log("g", gammaMulDecimals, pairReserves1);
//                console.log("g2", virtualAnchorBalance, reserveAnchor);

                {
                    address to = _to;
                    (ptuWithFee, amount1) = IZirconEnergy(energyAddress).handleOmegaSlashing(
                        ptuWithFee,
                        Math.min(1e18, (1e18 - gammaMulDecimals).mul(pairReserves1 * 2)/(virtualAnchorBalance - reserveAnchor)),
                        isFloatReserve0,
                        to);
                }

                //                desiredFtv = (2 * pairReserves1 * gammaMulDecimals)/1e18;

                // (ptuWithFee, extraPercentage) = handleOmegaSlashing(ptuWithFee);
                // This one retrieves tokens from ZirconEnergy if available

            }

        }
        // Burning liquidity and sending to user
        // The pool tokens sent to the Pair are slashed by omega
        // handleOmega has sent the pool tokens if it had them, so this function retrieves the full share
        address to = _to; //stack too deep

        (uint _pairReserves0, uint _pairReserves1,) = getPairReservesTranslated(0, 0);

        uint ptb = _getBalanceOf(pairAddress, address(this));

        {
            // Sends for burning
            _safeTransfer(pairAddress, pairAddress, ptuWithFee);
//            console.log("ptuWithFee", ptuWithFee);
            (uint amountA, uint amountB) = IZirconPair(pairAddress).burn(to);
            amount0 += isFloatReserve0 ? amountA : amountB;
            amount1 += isFloatReserve0 ? amountB : amountA;
        }

        payBurnFees(ptu, feeBps);

        if(!_isAnchor) {
            ftvChange -= ptu.mul(1e18)/(ptb.mul(gammaMulDecimals)/1e18);
            //            desiredFtv = (2 * _pairReserves1 * gammaMulDecimals)/1e18 - removedAmount;

            //TODO: might change to getFTV for x

            virtualFloatBalance -= (virtualFloatBalance * liquidity)/ptTotalSupply;
        }

        // Burn fee after everything to avoid loss of precision to omega identity & burning compensation tokens
        //console.log("Burned:", amountA, amountB);




        // Burns the Zircon pool tokens
        _burn(pt, address(this), liquidity);

        uint oldVab;
        {
            (, uint sync1) = getSyncReserves();
            oldVab = virtualAnchorBalance - sync1;
        }
        // Updating vab
        if(_isAnchor) {
            virtualAnchorBalance -= (virtualAnchorBalance * liquidity)/ptTotalSupply; //already calculated before, overflow is caught
        }

        _update(ftvChange, true, _pairReserves0, _pairReserves1, oldVab);
        // Emitting event on burned async
        _entered = false;
        emit BurnAsync(msg.sender, amount0, amount1);
    }

    /// @notice Function That handles the amount of reserves in Float Anchor Shares
    /// and the amount of the minimum from liquidity and reserves
    /// @dev Helper function for burn
    /// 0.323kb
    function burnPylonReserves(bool isAnchor, uint _ts, uint _liquidity) view private returns (uint reservePT, uint amount) {


        (uint _reserve0, uint _reserve1,) = getPairReservesTranslated(0,0); // gas savings
        (uint112 _pylonReserve0, uint112 _pylonReserve1) = getSyncReserves();

        // Calculates maxPTs that can be serviced through Pylon Reserves
        uint pylonReserve = isAnchor ? _pylonReserve1 : _pylonReserve0;
        uint reserve = isAnchor ? _reserve1 : _reserve0;

        uint virtualBalance = isAnchor ? virtualAnchorBalance : pylonReserve.add(reserve.mul(gammaMulDecimals).mul(2)/1e18);

        reservePT = pylonReserve.mul(_ts)/virtualBalance;

        uint _ptuAmount = Math.min(reservePT, _liquidity);
        amount = virtualBalance.mul(_ptuAmount)/_ts;
    }

    // @notice Burn send liquidity back to user burning Pool tokens
    // The function first uses the reserves of the Pylon
    // If not enough reserves it burns The Pool Tokens of the pylon
    // Fees here are
    // 1.55kb
    function burn(address _to, bool _isAnchor) external returns (uint amount){
        reentrancyAndPauseCheck();
        sync();
        // Selecting the Pool Token class on basis of the requested tranch to burn

        address pt = _isAnchor ? anchorPoolTokenAddress : floatPoolTokenAddress;
        // Let's get how much liquidity was sent to burn
        // Outside of scope to be used for vab/vfb adjustment later
        uint liquidity = _getBalanceOf(pt, address(this));

        notZero(liquidity);
        uint _ts = _totalSupply(pt);
        (uint reservesTranslated0, uint reservesTranslated1,) = getPairReservesTranslated(0, 0);
        uint percentageFloatChange = 1e18;
        {
            //address to = _to;
            bool isAnchor = _isAnchor;
            //address _pairAddress = pairAddress;

            // Here we calculate max PTU to extract from sync reserve + amount in reserves
            (uint reservePT, uint _amount) = burnPylonReserves(isAnchor, _ts, liquidity);
            uint feeBps = getFeeBps(42); //42 is code for sync, disregard price info
            //This is a reserve extraction
            //Tpv doesn't change and neither does adjusted vab, so we don't care about anchor factor
            address to_ = _to;
            uint returnAmount = _amount - (_amount * feeBps)/10000;
            _safeTransfer(isAnchor ? pylonToken.anchor : pylonToken.float, to_, returnAmount);


            //In case the reserves weren't able to pay for everything
            if (reservePT < liquidity) {
                uint adjustedLiquidity = liquidity - reservePT;
                uint totalSupply_ = _ts;
                uint _reservesTranslated1 = reservesTranslated1;

                (uint floatPercentage, uint ptu, uint amountOut) = handleAsyncBurn(
                    isAnchor,
                    adjustedLiquidity,
                    feeBps,
                    _reservesTranslated1,
                    to_,
                    totalSupply_
                );
                returnAmount += amountOut;
                percentageFloatChange = floatPercentage;
                payBurnFees(ptu, feeBps);

            }

            payFees(_amount, feeBps, isAnchor);

            _burn(pt, address(this), liquidity); // Should burn unadjusted amount ofc
            amount = returnAmount;
        }

        uint _floatChange = percentageFloatChange;
        uint oldVab;
        {
            (, uint112 _syncReserve1) = getSyncReserves();
            oldVab = virtualAnchorBalance - _syncReserve1;
        }
        if(_isAnchor) {
            virtualAnchorBalance -= virtualAnchorBalance.mul(liquidity)/_ts;
        } else {
            virtualFloatBalance -= virtualFloatBalance.mul(liquidity)/_ts;
        }



        _update(_floatChange, true, reservesTranslated0, reservesTranslated1, oldVab);
        emit Burn(msg.sender, amount, _isAnchor);
        _entered = false;

    }

    function calculateDesiredFtv(uint oldReserve0, uint oldReserve1, uint newPrice, uint adjustedVab, uint change, bool isPercentage) view private returns (uint desiredFtv){
        (desiredFtv,,) = decimals.getFTVForX(
            newPrice,
            p2x, p2y,
            oldReserve0, oldReserve1,
            adjustedVab
        );

        //Percentage easier when removing, raw amount easier when adding
        if(isPercentage) {
            if(change != 1e18) {
                desiredFtv = desiredFtv.mul(change)/1e18;
            }
        } else {
            uint oldPrice = oldReserve1.mul(decimals.priceMultiplier)/oldReserve0;
            if(oldPrice != newPrice) {
                change = change.mul(newPrice)/oldPrice;
            }
            desiredFtv = desiredFtv.add(change);
        }


    }

    function handleAsyncBurn(bool isAnchor, uint adjustedLiquidity, uint feeBps, uint reservesTranslated1, address to, uint totalSupply) private returns (uint floatPercentage, uint ptu, uint amountOut) {

        ptu = calculateLPTU(isAnchor, adjustedLiquidity, totalSupply);
        // Two vars since we can't pay fees until omega calculations are done
        uint ptuWithFee = ptu - (ptu * feeBps)/10000;
        uint ptb = _getBalanceOf(pairAddress, address(this));
        (,uint reserveAnchor) = getSyncReserves();
        uint percentageFloatChange;

        if(isAnchor) {

            // reduce ptu by additional slippage
            // This is primarily a disincentive to dump enormous amounts with this method.
            // If they do, they suffer extra slippage equal to the percentage of the pool they're withdrawing.
            // An alternative is applying the omega value after the dump, but this requires too many calculations.

            // Can be avoided with burn & swap, withdrawing with small amounts, waiting for reserves. Everything really.
            // The slashing goes primarily to float side, since they're getting dumped hard
            // But also it helps anchors by not worsening omega too much.

            // var temping as percentage of pool getting extracted here
            // The PTUs unclaimed are auto assigned to the remaining anchors

            uint _reservesTranslated1 = reservesTranslated1;
            address _to = to;

            uint amount_ = 0;
            // ptuWithFee here is the one with omega applied

            (ptuWithFee, amount_) = IZirconEnergy(energyAddress).handleOmegaSlashing(
                ptuWithFee,
                Math.min(1e18, (1e18 - gammaMulDecimals).mul(_reservesTranslated1 * 2)/(virtualAnchorBalance - reserveAnchor)),
                isFloatReserve0,
                _to);

            amountOut = amount_;

            percentageFloatChange = (ptb - ptuWithFee) * 1e18/ptb;
            if(percentageFloatChange < 97e16) {
                ptuWithFee = (ptuWithFee * percentageFloatChange)/1e18;
            }

            //Temping is done, we reassign it to its proper unchanged value
            percentageFloatChange = 1e18;

        } else {
            // Just records % of float liquidity removed here
            percentageFloatChange = uint(1e18).sub((ptu * 1e18)/((gammaMulDecimals * ptb)/1e18));
        }

        _safeTransfer(pairAddress, pairAddress, ptuWithFee);
        amountOut += IZirconPair(pairAddress).burnOneSide(to, isFloatReserve0 != isAnchor);  // XOR
        floatPercentage = percentageFloatChange;
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
