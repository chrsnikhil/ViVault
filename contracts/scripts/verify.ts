import { network } from 'hardhat';

async function main() {
  console.log('🔍 Verifying deployed contract...');

  // Connect to network first (Hardhat 3 pattern)
  const connection = await network.connect();
  const { ethers } = connection;

  console.log('🔍 Connected to network:', network.name);

  // Get the deployed VaultFactory contract
  const VaultFactory = await ethers.getContractFactory('VaultFactory');
  const vaultFactory = VaultFactory.attach('0x2e2bb24b2B88F30ea7dB6DFD8b9DAeC87b563b1C');

  // Verify contract details
  const owner = await vaultFactory.owner();
  const vaultCount = await vaultFactory.getVaultCount();

  console.log('✅ Contract verification successful!');
  console.log('📋 Contract Details:');
  console.log('  Address:', '0x2e2bb24b2B88F30ea7dB6DFD8b9DAeC87b563b1C');
  console.log('  Owner:', owner);
  console.log('  Vault Count:', vaultCount.toString());
  console.log('  Network: Base Sepolia (84532)');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
