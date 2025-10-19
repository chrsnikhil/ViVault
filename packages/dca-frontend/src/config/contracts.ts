// Contract configuration for ViVault

// Deployed VaultFactory address on Base Sepolia
export const CONTRACT_ADDRESSES = {
  VaultFactory: '0xF68D5b37407809Ed208e73e9Ced8a0fbbb3CdABE', // Updated VaultFactory with withdrawTo function
};

// Common ERC20 token addresses on Base Sepolia
export const COMMON_TOKENS = {
  WETH: '0x4200000000000000000000000000000000000006', // WETH on Base Sepolia (official address)
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC-Circle on Base Sepolia (has Uniswap pools)
  USDC_OLD: '0x8a04d904055528a69f3e4594dda308a31aeb8457', // Old USDC Testnet (no pools)
  // Note: USDC-Circle has actual Uniswap V3 liquidity on Base Sepolia
};

// Minimal ABI for VaultFactory
export const VAULT_FACTORY_ABI = [
  'function createVault() external returns (address)',
  'function getVault(address user) external view returns (address)',
  'function hasVault(address user) external view returns (bool)',
  'function getVaultCount() external view returns (uint256)',
  'function owner() external view returns (address)',
  'event VaultCreated(address indexed user, address indexed vault, uint256 timestamp)',
];

// Minimal ABI for UserVault
export const USER_VAULT_ABI = [
  'function owner() external view returns (address)',
  'function factory() external view returns (address)',
  'function deposit(address token, uint256 amount) external',
  'function withdraw(address token, uint256 amount) external',
  'function withdrawTo(address token, uint256 amount, address to) external',
  'function withdrawAll(address token) external',
  'function getBalance(address token) external view returns (uint256)',
  'function getBalances(address[] calldata tokens) external view returns (uint256[] memory)',
  'function getSupportedTokens() external view returns (address[] memory)',
  'function getSupportedTokenCount() external view returns (uint256)',
  'function getVaultInfo() external view returns (address ownerAddress, address factoryAddress, uint256 tokenCount, uint256 totalValue)',
  'function registerExistingTokens(address[] calldata tokens) external',
  'event TokensReceived(address indexed token, uint256 amount, address indexed from, uint256 timestamp)',
  'event TokensWithdrawn(address indexed token, uint256 amount, address indexed to, uint256 timestamp)',
  'event TokenAdded(address indexed token, uint256 timestamp)',
  'event TokenRemoved(address indexed token, uint256 timestamp)',
];

// Minimal ABI for ERC20 tokens
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
];
