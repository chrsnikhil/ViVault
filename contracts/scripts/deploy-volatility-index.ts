import hre from 'hardhat';

async function main() {
  console.log('🚀 Deploying VolatilityIndex contract...');

  // Pyth contract address on Base Sepolia
  const PYTH_CONTRACT = '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729';

  // Get the contract factory
  const VolatilityIndex = await hre.ethers.getContractFactory('VolatilityIndex');

  // Deploy the contract
  const volatilityIndex = await VolatilityIndex.deploy(PYTH_CONTRACT);
  await volatilityIndex.waitForDeployment();

  const address = await volatilityIndex.getAddress();

  console.log('✅ VolatilityIndex deployed to:', address);
  console.log('📋 Contract details:');
  console.log('  - Pyth Contract:', PYTH_CONTRACT);
  console.log('  - Owner:', await volatilityIndex.owner());

  // Verify deployment
  console.log('\n🔍 Verifying deployment...');
  const pythAddress = await volatilityIndex.pyth();
  console.log('  - Pyth address from contract:', pythAddress);

  if (pythAddress.toLowerCase() === PYTH_CONTRACT.toLowerCase()) {
    console.log('✅ Pyth contract address verified');
  } else {
    console.log('❌ Pyth contract address mismatch!');
  }

  console.log('\n📝 Next steps:');
  console.log('1. Update backend .env with VOLATILITY_INDEX_CONTRACT_ADDRESS=' + address);
  console.log('2. Update frontend config with the contract address');
  console.log('3. Start the backend worker to begin volatility updates');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
