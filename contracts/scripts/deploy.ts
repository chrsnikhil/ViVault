import { network } from 'hardhat';

async function main() {
  console.log('🔍 Starting deployment...');

  // Connect to network first (Hardhat 3 pattern)
  const connection = await network.connect();
  const { ethers } = connection;

  console.log('🔍 Connected to network:', network.name);

  // Get deployer account
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error('No signers available. Make sure you have a private key configured.');
  }
  const deployer = signers[0];
  console.log('🔍 Deploying contracts with account:', deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('🔍 Account balance:', ethers.formatEther(balance), 'ETH');

  // Deploy VaultFactory
  console.log('🔍 Deploying VaultFactory...');
  const VaultFactory = await ethers.getContractFactory('VaultFactory');
  const vaultFactory = await VaultFactory.deploy();
  await vaultFactory.waitForDeployment();

  const vaultFactoryAddress = await vaultFactory.getAddress();
  console.log('✅ VaultFactory deployed to:', vaultFactoryAddress);

  // Wait a bit for the deployment to be confirmed
  console.log('🔍 Waiting for deployment confirmation...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('🎉 Deployment completed successfully!');
  console.log('📋 Contract Addresses:');
  console.log('  VaultFactory:', vaultFactoryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
