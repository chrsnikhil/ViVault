// Contract configuration for ViVault

// Deployed VaultFactory address on Base Sepolia
export const CONTRACT_ADDRESSES = {
  VaultFactory: '0x56ab9F1E53D3696766EE2eb13af8D4540924b4B0', // Updated VaultFactory with syncing mechanisms
};

// Common ERC20 token addresses on Base Sepolia
export const COMMON_TOKENS = {
  WETH: '0x4200000000000000000000000000000000000006', // WETH on Base Sepolia (official address)
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC-Circle on Base Sepolia (has Uniswap pools)
  USDC_OLD: '0x8a04d904055528a69f3e4594dda308a31aeb8457', // Old USDC Testnet (no pools)
  LINK: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C8e7d5', // Chainlink token on Base Sepolia
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI on Base Sepolia
  USDT: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // USDT on Base Sepolia (same as DAI for testing)
  // Note: USDC-Circle has actual Uniswap V3 liquidity on Base Sepolia
};

// Token metadata for display
export const TOKEN_METADATA = {
  [COMMON_TOKENS.WETH]: { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  [COMMON_TOKENS.USDC]: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  [COMMON_TOKENS.LINK]: { symbol: 'LINK', name: 'Chainlink', decimals: 18 },
  [COMMON_TOKENS.DAI]: { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  [COMMON_TOKENS.USDT]: { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
};

// Helper function to get token info by address
export const getTokenInfo = (address: string) => {
  // Handle native ETH
  if (address === 'ETH') {
    return {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
    };
  }

  return (
    TOKEN_METADATA[address as keyof typeof TOKEN_METADATA] || {
      symbol: 'UNK',
      name: 'Unknown Token',
      decimals: 18,
    }
  );
};

// VolatilityIndex contract configuration
export const VOLATILITY_INDEX = {
  // Contract address deployed on Base Sepolia
  ADDRESS: '0x7a98960bd77870A3aa12fC038611b43443b30e43',
  ABI: [
    'function getVolatilityData(bytes32 priceFeedId) external view returns (tuple(uint256 volatilityBps, uint256 price, uint256 timestamp, uint256 confidence))',
    'function getVolatility(bytes32 priceFeedId) external view returns (uint256)',
    'function getCurrentPrice(bytes32 priceFeedId) external view returns (uint256)',
    'function getLastUpdate(bytes32 priceFeedId) external view returns (uint256)',
    'function getSupportedFeeds() external view returns (bytes32[])',
    'function isSupported(bytes32 priceFeedId) external view returns (bool)',
    'event VolatilityUpdated(bytes32 indexed priceFeedId, uint256 volatilityBps, uint256 price, uint256 timestamp, uint256 confidence)',
  ],
};

// Pyth price feed IDs for Base Sepolia
export const PYTH_PRICE_FEED_IDS = {
  WETH_USD: '0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6',
  USDC_USD: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
} as const;

// Pyth contract address on Base Sepolia
export const PYTH_CONTRACT_ADDRESS = '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729';

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
  'function getTrackedBalance(address token) external view returns (uint256)',
  'function getBalances(address[] calldata tokens) external view returns (uint256[] memory)',
  'function getAllSupportedTokens() external view returns (address[] memory)',
  'function getSupportedTokenCount() external view returns (uint256)',
  'function getVaultInfo() external view returns (address ownerAddress, address factoryAddress, uint256 tokenCount, uint256 totalValue)',
  'function syncTokenBalance(address token) external',
  'function syncAllTokens() external',
  'function needsSync(address token) external view returns (bool)',
  'function getLastSyncTimestamp(address token) external view returns (uint256)',
  'function removeToken(address token) external',
  'function emergencyRecover(address token, uint256 amount, address to) external',
  'event TokensReceived(address indexed token, uint256 amount, address indexed from, uint256 timestamp)',
  'event TokensWithdrawn(address indexed token, uint256 amount, address indexed to, uint256 timestamp)',
  'event TokenAdded(address indexed token, uint256 timestamp)',
  'event TokenRemoved(address indexed token, uint256 timestamp)',
  'event BalanceSynced(address indexed token, uint256 oldBalance, uint256 newBalance, uint256 timestamp)',
  'event AutoSyncTriggered(address indexed token, uint256 timestamp)',
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
