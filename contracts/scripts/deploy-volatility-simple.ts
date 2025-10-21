// Simple deployment script for VolatilityIndex contract
import { network as hardhatNetwork } from 'hardhat';

async function main() {
  console.log('🚀 Deploying VolatilityIndex contract to Base Sepolia...');

  // Connect to network first (Hardhat 3 pattern)
  const connection = await hardhatNetwork.connect();
  const { ethers } = connection;

  console.log('🔍 Connected to network:', hardhatNetwork.name);

  // Get deployer account
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error('No signers available. Make sure you have a private key configured.');
  }
  const deployer = signers[0];
  console.log('Deploying with account:', deployer.address);
  console.log(
    'Account balance:',
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    'ETH'
  );

  // Pyth contract address on Base Sepolia
  const PYTH_CONTRACT = '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729';

  // Price feed IDs
  const WETH_USD_FEED_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';
  const USDC_USD_FEED_ID = '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a';

  console.log('\n📋 Deployment Parameters:');
  console.log('Pyth Contract:', PYTH_CONTRACT);
  console.log('WETH/USD Feed ID:', WETH_USD_FEED_ID);
  console.log('USDC/USD Feed ID:', USDC_USD_FEED_ID);

  // Deploy VolatilityIndex
  console.log('\n🔨 Deploying VolatilityIndex...');
  const VolatilityIndexFactory = await ethers.getContractFactory('VolatilityIndex');
  const volatilityIndex = await VolatilityIndexFactory.deploy(PYTH_CONTRACT, [
    WETH_USD_FEED_ID,
    USDC_USD_FEED_ID,
  ]);
  await volatilityIndex.waitForDeployment();

  const volatilityIndexAddress = await volatilityIndex.getAddress();
  console.log('✅ VolatilityIndex deployed to:', volatilityIndexAddress);

  // Verify deployment
  console.log('\n🔍 Verifying deployment...');
  const owner = await volatilityIndex.owner();
  const pythAddress = await volatilityIndex.pyth();
  const supportedFeeds = await volatilityIndex.getSupportedFeeds();

  console.log('Owner:', owner);
  console.log('Pyth Contract:', pythAddress);
  console.log('Supported Feeds:', supportedFeeds.length);

  console.log('\n=== Deployment Summary ===');
  const network = await ethers.provider.getNetwork();
  console.log('Network:', network.name);
  console.log('Chain ID:', network.chainId.toString());
  console.log('VolatilityIndex:', volatilityIndexAddress);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      VolatilityIndex: volatilityIndexAddress,
    },
    pythContract: PYTH_CONTRACT,
    supportedFeeds: [WETH_USD_FEED_ID, USDC_USD_FEED_ID],
    timestamp: new Date().toISOString(),
  };

  console.log('\n📄 Deployment info:', JSON.stringify(deploymentInfo, null, 2));

  console.log('\n✅ Deployment completed successfully!');
  console.log('\n🔧 Next steps:');
  console.log(
    '1. Update backend .env with VOLATILITY_INDEX_CONTRACT_ADDRESS=' + volatilityIndexAddress
  );
  console.log(
    '2. Update frontend .env with VITE_VOLATILITY_INDEX_CONTRACT_ADDRESS=' + volatilityIndexAddress
  );
  console.log('3. Start the backend worker to begin volatility updates');
  console.log('4. Verify the contract on Base Sepolia explorer');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
