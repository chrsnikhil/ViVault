// Transfer ownership of VolatilityIndex contract to backend wallet
import { network as hardhatNetwork } from 'hardhat';

async function main() {
  console.log('🔄 Transferring ownership of VolatilityIndex contract...');

  // Connect to network first (Hardhat 3 pattern)
  const connection = await hardhatNetwork.connect();
  const { ethers } = connection;

  console.log('🔍 Connected to network:', hardhatNetwork.name);

  // Get deployer account (current owner)
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error('No signers available. Make sure you have a private key configured.');
  }
  const deployer = signers[0];
  console.log('Current owner (deployer):', deployer.address);

  // Backend wallet address (the one that needs to be owner)
  const backendWallet = '0x6fEa4477795cbBDca542BF514D25774743997a66';
  console.log('New owner (backend wallet):', backendWallet);

  // Contract address
  const contractAddress = '0x7a98960bd77870A3aa12fC038611b43443b30e43';
  console.log('Contract address:', contractAddress);

  // Get contract instance
  const VolatilityIndexFactory = await ethers.getContractFactory('VolatilityIndex');
  const contract = VolatilityIndexFactory.attach(contractAddress);

  // Check current owner
  const currentOwner = await contract.owner();
  console.log('Current contract owner:', currentOwner);

  if (currentOwner.toLowerCase() === backendWallet.toLowerCase()) {
    console.log('✅ Backend wallet is already the owner!');
    return;
  }

  // Transfer ownership
  console.log('🔄 Transferring ownership...');
  const tx = await contract.transferOwnership(backendWallet);
  console.log('⏳ Transaction submitted:', tx.hash);

  const receipt = await tx.wait();
  console.log('✅ Ownership transferred successfully!');
  console.log('Transaction receipt:', receipt);

  // Verify new owner
  const newOwner = await contract.owner();
  console.log('New contract owner:', newOwner);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Transfer failed:', error);
    process.exit(1);
  });
