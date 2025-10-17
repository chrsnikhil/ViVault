// Simple deployment script for Hardhat 3
const { ethers } = require('hardhat');

async function main() {
  console.log('Deploying ViVault contracts to Base Sepolia...');

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log(
    'Account balance:',
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  // Deploy VaultFactory
  console.log('\nDeploying VaultFactory...');
  const VaultFactoryFactory = await ethers.getContractFactory('VaultFactory');
  const vaultFactory = await VaultFactoryFactory.deploy();
  await vaultFactory.waitForDeployment();
  const vaultFactoryAddress = await vaultFactory.getAddress();
  console.log('VaultFactory deployed to:', vaultFactoryAddress);

  // Verify deployment
  console.log('\nVerifying deployment...');
  const owner = await vaultFactory.owner();
  const vaultCount = await vaultFactory.getVaultCount();
  console.log('VaultFactory owner:', owner);
  console.log('VaultFactory vault count:', vaultCount.toString());

  console.log('\n=== Deployment Summary ===');
  const network = await ethers.provider.getNetwork();
  console.log('Network:', network.name);
  console.log('Chain ID:', network.chainId.toString());
  console.log('VaultFactory:', vaultFactoryAddress);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      VaultFactory: vaultFactoryAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('\nDeployment info:', JSON.stringify(deploymentInfo, null, 2));

  console.log('\n✅ Deployment completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Verify the contract on Base Sepolia explorer');
  console.log('2. Test creating a vault');
  console.log('3. Integrate with Vincent Abilities');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
