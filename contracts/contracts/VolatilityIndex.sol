// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VolatilityIndex
 * @dev Contract to track and store volatility data for token pairs using Pyth price feeds
 * @notice Integrates with Pyth oracle to ensure fresh price data and calculates volatility metrics
 */
contract VolatilityIndex is Ownable {
    IPyth public pyth;
    
    struct VolatilityData {
        uint256 volatilityBps;  // Volatility in basis points (5000 = 50%)
        uint256 price;          // Current price at time of calculation
        uint256 timestamp;      // When this volatility was calculated
        uint256 confidence;     // Pyth confidence interval
    }
    
    // Mapping from price feed ID to volatility data
    mapping(bytes32 => VolatilityData) public volatilityData;
    
    // Array of supported price feed IDs
    bytes32[] public supportedFeeds;
    
    // Mapping to check if a feed is supported
    mapping(bytes32 => bool) public isFeedSupported;
    
    // Events
    event VolatilityUpdated(
        bytes32 indexed priceFeedId, 
        uint256 volatilityBps, 
        uint256 price, 
        uint256 timestamp,
        uint256 confidence
    );
    event FeedAdded(bytes32 indexed priceFeedId);
    event FeedRemoved(bytes32 indexed priceFeedId);
    
    /**
     * @dev Constructor sets the Pyth contract address
     * @param pythContract The address of the Pyth price feeds contract
     */
    constructor(address pythContract) Ownable(msg.sender) {
        require(pythContract != address(0), "VolatilityIndex: Invalid Pyth contract address");
        pyth = IPyth(pythContract);
    }
    
    /**
     * @dev Updates volatility data for a specific price feed
     * @param priceUpdate The encoded price update data from Pyth Hermes
     * @param priceFeedId The price feed ID to update
     * @param volatilityBps The calculated volatility in basis points
     */
    function updateVolatility(
        bytes[] calldata priceUpdate,
        bytes32 priceFeedId,
        uint256 volatilityBps
    ) external payable onlyOwner {
        require(priceUpdate.length > 0, "VolatilityIndex: Empty price update");
        require(volatilityBps <= 1000000, "VolatilityIndex: Invalid volatility (max 10000%)");
        
        // Update Pyth price feeds on-chain
        uint fee = pyth.getUpdateFee(priceUpdate);
        require(msg.value >= fee, "VolatilityIndex: Insufficient fee");
        
        pyth.updatePriceFeeds{value: fee}(priceUpdate);
        
        // Get the current price from Pyth
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceFeedId, 60);
        
        // Store volatility data
        volatilityData[priceFeedId] = VolatilityData({
            volatilityBps: volatilityBps,
            price: uint256(uint64(price.price)),
            timestamp: block.timestamp,
            confidence: uint256(uint64(price.conf))
        });
        
        // Add to supported feeds if not already added
        if (!isFeedSupported[priceFeedId]) {
            supportedFeeds.push(priceFeedId);
            isFeedSupported[priceFeedId] = true;
            emit FeedAdded(priceFeedId);
        }
        
        emit VolatilityUpdated(
            priceFeedId, 
            volatilityBps, 
            uint256(uint64(price.price)), 
            block.timestamp,
            uint256(uint64(price.conf))
        );
        
        // Refund excess fee
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    /**
     * @dev Gets the current volatility data for a price feed
     * @param priceFeedId The price feed ID
     * @return data The volatility data struct
     */
    function getVolatilityData(bytes32 priceFeedId) external view returns (VolatilityData memory data) {
        return volatilityData[priceFeedId];
    }
    
    /**
     * @dev Gets the current volatility in basis points
     * @param priceFeedId The price feed ID
     * @return volatilityBps The volatility in basis points
     */
    function getVolatility(bytes32 priceFeedId) external view returns (uint256 volatilityBps) {
        return volatilityData[priceFeedId].volatilityBps;
    }
    
    /**
     * @dev Gets the current price for a price feed
     * @param priceFeedId The price feed ID
     * @return price The current price
     */
    function getCurrentPrice(bytes32 priceFeedId) external view returns (uint256 price) {
        return volatilityData[priceFeedId].price;
    }
    
    /**
     * @dev Gets the last update timestamp for a price feed
     * @param priceFeedId The price feed ID
     * @return timestamp The last update timestamp
     */
    function getLastUpdate(bytes32 priceFeedId) external view returns (uint256 timestamp) {
        return volatilityData[priceFeedId].timestamp;
    }
    
    /**
     * @dev Gets all supported price feed IDs
     * @return feeds Array of supported price feed IDs
     */
    function getSupportedFeeds() external view returns (bytes32[] memory feeds) {
        return supportedFeeds;
    }
    
    /**
     * @dev Gets the number of supported feeds
     * @return count The number of supported feeds
     */
    function getSupportedFeedCount() external view returns (uint256 count) {
        return supportedFeeds.length;
    }
    
    /**
     * @dev Checks if a price feed is supported
     * @param priceFeedId The price feed ID
     * @return supported True if the feed is supported
     */
    function isSupported(bytes32 priceFeedId) external view returns (bool supported) {
        return isFeedSupported[priceFeedId];
    }
    
    /**
     * @dev Removes a price feed from supported feeds (only owner)
     * @param priceFeedId The price feed ID to remove
     */
    function removeFeed(bytes32 priceFeedId) external onlyOwner {
        require(isFeedSupported[priceFeedId], "VolatilityIndex: Feed not supported");
        
        // Remove from supported feeds array
        for (uint256 i = 0; i < supportedFeeds.length; i++) {
            if (supportedFeeds[i] == priceFeedId) {
                supportedFeeds[i] = supportedFeeds[supportedFeeds.length - 1];
                supportedFeeds.pop();
                break;
            }
        }
        
        isFeedSupported[priceFeedId] = false;
        emit FeedRemoved(priceFeedId);
    }
    
    /**
     * @dev Emergency function to withdraw ETH (only owner)
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "VolatilityIndex: No ETH to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Allows the contract to receive ETH
     */
    receive() external payable {
        // Contract can receive ETH for Pyth fees
    }
}
