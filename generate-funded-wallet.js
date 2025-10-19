const { ethers } = require('ethers');

// Generate a new wallet
const newWallet = ethers.Wallet.createRandom();

console.log('🔑 New Wallet Generated:');
console.log('Address:', newWallet.address);
console.log('Private Key:', newWallet.privateKey);
console.log('');
console.log('📋 Next Steps:');
console.log('1. Send at least 0.05 ETH to this address:', newWallet.address);
console.log('2. Update your .env file with the new private key');
console.log('3. Try minting capacity credits again');
console.log('');
console.log('💡 You can get test ETH from:');
console.log('- Ethereum Sepolia Faucet: https://sepoliafaucet.com/');
console.log('- Alchemy Faucet: https://sepoliafaucet.com/');
console.log('- Or transfer from another wallet you control');
console.log('');
console.log('⚠️  IMPORTANT: Keep this private key secure and never share it!');
