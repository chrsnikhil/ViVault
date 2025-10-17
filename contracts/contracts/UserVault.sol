// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UserVault
 * @dev Individual vault contract for each user, linked to their Vincent wallet
 * @notice Can hold any ERC-20 token and supports deposits/withdrawals
 */
contract UserVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Factory contract address
    address public immutable factory;
    
    // Mapping from token address to balance
    mapping(address => uint256) public tokenBalances;
    
    // Array of supported token addresses
    address[] public supportedTokens;
    
    // Mapping to check if token is supported
    mapping(address => bool) public isTokenSupported;
    
    // Events
    event TokensReceived(address indexed token, uint256 amount, address indexed from, uint256 timestamp);
    event TokensWithdrawn(address indexed token, uint256 amount, address indexed to, uint256 timestamp);
    event TokenAdded(address indexed token, uint256 timestamp);
    event TokenRemoved(address indexed token, uint256 timestamp);
    
    /**
     * @dev Constructor sets the owner (Vincent wallet address) and factory
     * @param _owner The Vincent wallet address that owns this vault
     * @param _factory The VaultFactory contract address
     */
    constructor(address _owner, address _factory) Ownable(_owner) {
        factory = _factory;
    }
    
    /**
     * @dev Deposits ERC-20 tokens into the vault
     * @param token The ERC-20 token contract address
     * @param amount The amount of tokens to deposit
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "UserVault: Invalid token address");
        require(amount > 0, "UserVault: Amount must be greater than 0");
        
        IERC20 tokenContract = IERC20(token);
        
        // Check if user has sufficient balance
        require(tokenContract.balanceOf(msg.sender) >= amount, "UserVault: Insufficient token balance");
        
        // Check if user has approved this contract to spend tokens
        require(tokenContract.allowance(msg.sender, address(this)) >= amount, "UserVault: Insufficient token allowance");
        
        // Transfer tokens from user to vault
        tokenContract.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update vault balance
        tokenBalances[token] += amount;
        
        // Add token to supported tokens if not already added
        if (!isTokenSupported[token]) {
            supportedTokens.push(token);
            isTokenSupported[token] = true;
            emit TokenAdded(token, block.timestamp);
        }
        
        emit TokensReceived(token, amount, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Withdraws ERC-20 tokens from the vault
     * @param token The ERC-20 token contract address
     * @param amount The amount of tokens to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(0), "UserVault: Invalid token address");
        require(amount > 0, "UserVault: Amount must be greater than 0");
        require(tokenBalances[token] >= amount, "UserVault: Insufficient vault balance");
        
        // Update vault balance
        tokenBalances[token] -= amount;
        
        // Transfer tokens to owner
        IERC20(token).safeTransfer(owner(), amount);
        
        emit TokensWithdrawn(token, amount, owner(), block.timestamp);
    }
    
    /**
     * @dev Withdraws all tokens of a specific type
     * @param token The ERC-20 token contract address
     */
    function withdrawAll(address token) external onlyOwner nonReentrant {
        require(token != address(0), "UserVault: Invalid token address");
        uint256 balance = tokenBalances[token];
        require(balance > 0, "UserVault: No tokens to withdraw");
        
        // Update vault balance
        tokenBalances[token] -= balance;
        
        // Transfer tokens to owner
        IERC20(token).safeTransfer(owner(), balance);
        
        emit TokensWithdrawn(token, balance, owner(), block.timestamp);
    }
    
    /**
     * @dev Gets the balance of a specific token in the vault
     * @param token The ERC-20 token contract address
     * @return balance The token balance in the vault
     */
    function getBalance(address token) external view returns (uint256) {
        return tokenBalances[token];
    }
    
    /**
     * @dev Gets balances of multiple tokens
     * @param tokens Array of token addresses
     * @return balances Array of corresponding balances
     */
    function getBalances(address[] calldata tokens) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = tokenBalances[tokens[i]];
        }
        return balances;
    }
    
    /**
     * @dev Gets all supported token addresses
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    /**
     * @dev Gets the total number of supported tokens
     * @return count The number of supported tokens
     */
    function getSupportedTokenCount() external view returns (uint256) {
        return supportedTokens.length;
    }
    
    /**
     * @dev Gets vault information
     * @return ownerAddress The owner's address
     * @return factoryAddress The factory contract address
     * @return tokenCount The number of supported tokens
     * @return totalValue The total value (placeholder for future implementation)
     */
    function getVaultInfo() external view returns (
        address ownerAddress,
        address factoryAddress,
        uint256 tokenCount,
        uint256 totalValue
    ) {
        ownerAddress = owner();
        factoryAddress = factory;
        tokenCount = supportedTokens.length;
        totalValue = 0; // Placeholder for future value calculation
    }
    
    /**
     * @dev Emergency function to remove a token from supported list (only owner)
     * @param token The token address to remove
     */
    function removeToken(address token) external onlyOwner {
        require(isTokenSupported[token], "UserVault: Token not supported");
        require(tokenBalances[token] == 0, "UserVault: Cannot remove token with balance");
        
        // Remove from supported tokens array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
        
        isTokenSupported[token] = false;
        emit TokenRemoved(token, block.timestamp);
    }
    
    /**
     * @dev Allows the vault to receive ETH (for future functionality)
     */
    receive() external payable {
        // Vault can receive ETH but doesn't track it in tokenBalances
        // This is for future functionality like WETH wrapping
    }
}
