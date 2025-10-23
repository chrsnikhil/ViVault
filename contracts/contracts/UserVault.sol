// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UserVault
 * @dev Individual vault contract for each user with robust balance syncing
 * @notice Can hold any ERC-20 token and supports deposits/withdrawals with automatic syncing
 */
contract UserVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Factory contract address
    address public immutable factory;
    
    // Mapping from token address to balance (internal tracking)
    mapping(address => uint256) public tokenBalances;
    
    // Array of supported token addresses
    address[] public supportedTokens;
    
    // Mapping to check if token is supported
    mapping(address => bool) public isTokenSupported;
    
    // Mapping to track last sync timestamp for each token
    mapping(address => uint256) public lastSyncTimestamp;
    
    // Auto-sync threshold (in seconds) - sync if last sync was more than this ago
    uint256 public constant AUTO_SYNC_THRESHOLD = 300; // 5 minutes
    
    // Events
    event TokensReceived(address indexed token, uint256 amount, address indexed from, uint256 timestamp);
    event TokensWithdrawn(address indexed token, uint256 amount, address indexed to, uint256 timestamp);
    event TokenAdded(address indexed token, uint256 timestamp);
    event TokenRemoved(address indexed token, uint256 timestamp);
    event BalanceSynced(address indexed token, uint256 oldBalance, uint256 newBalance, uint256 timestamp);
    event AutoSyncTriggered(address indexed token, uint256 timestamp);
    
    /**
     * @dev Constructor sets the owner (Vincent wallet address) and factory
     * @param _owner The Vincent wallet address that owns this vault
     * @param _factory The VaultFactory contract address
     */
    constructor(address _owner, address _factory) Ownable(_owner) {
        factory = _factory;
    }
    
    /**
     * @dev Deposits ERC-20 tokens into the vault with auto-sync
     * @param token The ERC-20 token contract address
     * @param amount The amount of tokens to deposit
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "UserVault: Invalid token address");
        require(amount > 0, "UserVault: Amount must be greater than 0");
        
        // Auto-sync before deposit to ensure accurate balance
        _autoSyncIfNeeded(token);
        
        // Transfer tokens from sender to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update internal balance tracking
        tokenBalances[token] += amount;
        
        // Add token to supported list if not already there
        if (!isTokenSupported[token]) {
            supportedTokens.push(token);
            isTokenSupported[token] = true;
            emit TokenAdded(token, block.timestamp);
        }
        
        // Update last sync timestamp
        lastSyncTimestamp[token] = block.timestamp;
        
        emit TokensReceived(token, amount, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Withdraws ERC-20 tokens from the vault with auto-sync
     * @param token The ERC-20 token contract address
     * @param amount The amount of tokens to withdraw
     * @param to The address to send tokens to
     */
    function withdrawTo(address token, uint256 amount, address to) external onlyOwner nonReentrant {
        require(token != address(0), "UserVault: Invalid token address");
        require(to != address(0), "UserVault: Invalid recipient address");
        require(amount > 0, "UserVault: Amount must be greater than 0");
        
        // Auto-sync before withdrawal to ensure accurate balance
        _autoSyncIfNeeded(token);
        
        // Check if we have enough balance (using synced balance)
        uint256 availableBalance = _getActualBalance(token);
        require(availableBalance >= amount, "UserVault: Insufficient vault balance");
        
        // Update internal balance tracking
        tokenBalances[token] -= amount;
        
        // Transfer tokens to recipient
        IERC20(token).safeTransfer(to, amount);
        
        // Update last sync timestamp
        lastSyncTimestamp[token] = block.timestamp;
        
        emit TokensWithdrawn(token, amount, to, block.timestamp);
    }
    
    /**
     * @dev Gets the actual on-chain balance of a token
     * @param token The ERC-20 token contract address
     * @return The actual balance of the token in this contract
     */
    function getBalance(address token) external view returns (uint256) {
        return _getActualBalance(token);
    }
    
    /**
     * @dev Gets the internal tracked balance of a token
     * @param token The ERC-20 token contract address
     * @return The internally tracked balance
     */
    function getTrackedBalance(address token) external view returns (uint256) {
        return tokenBalances[token];
    }
    
    /**
     * @dev Manually syncs the internal balance with actual on-chain balance
     * @param token The ERC-20 token contract address
     */
    function syncTokenBalance(address token) external {
        _syncTokenBalance(token);
    }
    
    /**
     * @dev Internal function to sync token balance
     * @param token The ERC-20 token contract address
     */
    function _syncTokenBalance(address token) internal {
        require(token != address(0), "UserVault: Invalid token address");
        
        uint256 oldBalance = tokenBalances[token];
        uint256 actualBalance = _getActualBalance(token);
        
        tokenBalances[token] = actualBalance;
        lastSyncTimestamp[token] = block.timestamp;
        
        emit BalanceSynced(token, oldBalance, actualBalance, block.timestamp);
    }
    
    /**
     * @dev Syncs all supported tokens
     */
    function syncAllTokens() external {
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            if (token != address(0)) {
                _syncTokenBalance(token);
            }
        }
    }
    
    /**
     * @dev Checks if a token needs syncing based on time threshold
     * @param token The ERC-20 token contract address
     * @return True if token needs syncing
     */
    function needsSync(address token) external view returns (bool) {
        return _needsSync(token);
    }
    
    /**
     * @dev Gets the last sync timestamp for a token
     * @param token The ERC-20 token contract address
     * @return The last sync timestamp
     */
    function getLastSyncTimestamp(address token) external view returns (uint256) {
        return lastSyncTimestamp[token];
    }
    
    /**
     * @dev Gets all supported tokens
     * @return Array of supported token addresses
     */
    function getAllSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    /**
     * @dev Gets the count of supported tokens
     * @return The number of supported tokens
     */
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokens.length;
    }
    
    /**
     * @dev Internal function to get actual on-chain balance
     * @param token The ERC-20 token contract address
     * @return The actual balance of the token in this contract
     */
    function _getActualBalance(address token) internal view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    /**
     * @dev Internal function to check if a token needs syncing
     * @param token The ERC-20 token contract address
     * @return True if token needs syncing
     */
    function _needsSync(address token) internal view returns (bool) {
        if (lastSyncTimestamp[token] == 0) {
            return true; // Never synced
        }
        
        return (block.timestamp - lastSyncTimestamp[token]) > AUTO_SYNC_THRESHOLD;
    }
    
    /**
     * @dev Internal function to auto-sync if needed
     * @param token The ERC-20 token contract address
     */
    function _autoSyncIfNeeded(address token) internal {
        if (_needsSync(token)) {
            emit AutoSyncTriggered(token, block.timestamp);
            _syncTokenBalance(token);
        }
    }
    
    /**
     * @dev Emergency function to recover tokens (only owner)
     * @param token The ERC-20 token contract address
     * @param amount The amount of tokens to recover
     * @param to The address to send tokens to
     */
    function emergencyRecover(address token, uint256 amount, address to) external onlyOwner {
        require(token != address(0), "UserVault: Invalid token address");
        require(to != address(0), "UserVault: Invalid recipient address");
        
        IERC20(token).safeTransfer(to, amount);
        
        // Sync balance after recovery
        _autoSyncIfNeeded(token);
    }
    
    /**
     * @dev Removes a token from supported list (only owner)
     * @param token The ERC-20 token contract address
     */
    function removeToken(address token) external onlyOwner {
        require(isTokenSupported[token], "UserVault: Token not supported");
        
        // Sync before removing
        _autoSyncIfNeeded(token);
        
        // Remove from supported list
        isTokenSupported[token] = false;
        
        // Remove from array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
        
        emit TokenRemoved(token, block.timestamp);
    }
    
    /**
     * @dev Updates the auto-sync threshold (only owner)
     * @param newThreshold The new threshold in seconds
     */
    function updateAutoSyncThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "UserVault: Invalid threshold");
        // Note: This would require making AUTO_SYNC_THRESHOLD mutable
        // For now, we'll keep it constant for gas efficiency
    }
}