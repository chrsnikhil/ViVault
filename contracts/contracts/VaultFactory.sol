// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./UserVault.sol";

/**
 * @title VaultFactory
 * @dev Factory contract for creating user-specific vaults
 * @notice Each user can have only one vault, linked to their Vincent wallet address
 */
contract VaultFactory is Ownable {
    constructor() Ownable(msg.sender) {}
    // Mapping from user address to their vault address
    mapping(address => address) public userVaults;
    
    // Array of all created vaults
    address[] public allVaults;
    
    // Events
    event VaultCreated(address indexed user, address indexed vault, uint256 timestamp);
    event VaultRemoved(address indexed user, address indexed vault);
    
    /**
     * @dev Creates a new vault for the caller
     * @notice Each user can only have one vault
     * @return vaultAddress The address of the newly created vault
     */
    function createVault() external returns (address) {
        require(userVaults[msg.sender] == address(0), "VaultFactory: User already has a vault");
        
        // Deploy new UserVault contract
        UserVault newVault = new UserVault(msg.sender, address(this));
        address vaultAddress = address(newVault);
        
        // Store the vault address for the user
        userVaults[msg.sender] = vaultAddress;
        allVaults.push(vaultAddress);
        
        emit VaultCreated(msg.sender, vaultAddress, block.timestamp);
        
        return vaultAddress;
    }
    
    /**
     * @dev Gets the vault address for a specific user
     * @param user The user's address
     * @return vaultAddress The address of the user's vault, or address(0) if none exists
     */
    function getVault(address user) external view returns (address) {
        return userVaults[user];
    }
    
    /**
     * @dev Checks if a user has a vault
     * @param user The user's address
     * @return hasVault True if the user has a vault, false otherwise
     */
    function hasVault(address user) external view returns (bool) {
        return userVaults[user] != address(0);
    }
    
    /**
     * @dev Gets the total number of vaults created
     * @return count The number of vaults
     */
    function getVaultCount() external view returns (uint256) {
        return allVaults.length;
    }
    
    /**
     * @dev Gets all vault addresses (for admin purposes)
     * @return vaults Array of all vault addresses
     */
    function getAllVaults() external view onlyOwner returns (address[] memory) {
        return allVaults;
    }
    
    /**
     * @dev Removes a vault (only owner can do this in case of emergency)
     * @param user The user whose vault should be removed
     */
    function removeVault(address user) external onlyOwner {
        address vaultAddress = userVaults[user];
        require(vaultAddress != address(0), "VaultFactory: No vault exists for this user");
        
        // Remove from mapping
        delete userVaults[user];
        
        // Remove from array (find and swap with last element)
        for (uint256 i = 0; i < allVaults.length; i++) {
            if (allVaults[i] == vaultAddress) {
                allVaults[i] = allVaults[allVaults.length - 1];
                allVaults.pop();
                break;
            }
        }
        
        emit VaultRemoved(user, vaultAddress);
    }
}