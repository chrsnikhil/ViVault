import { ethers } from 'ethers';
import fs from 'fs';

console.log('🔧 Capacity Credits Setup Helper');
console.log('================================');
console.log('');

// Generate a new wallet if needed
const generateNewWallet = () => {
  const wallet = ethers.Wallet.createRandom();
  console.log('🔑 New Wallet Generated:');
  console.log('Address:', wallet.address);
  console.log('Private Key:', wallet.privateKey);
  console.log('');
  return wallet;
};

// Show current configuration
const showCurrentConfig = () => {
  try {
    const configContent = fs.readFileSync('./capacity-credits-config.js', 'utf8');
    console.log('📋 Current Configuration:');
    console.log(configContent);
  } catch (error) {
    console.log('❌ Configuration file not found');
  }
};

// Main setup function
const main = () => {
  console.log('Choose an option:');
  console.log('1. Generate new wallet for capacity credits');
  console.log('2. Show current configuration');
  console.log('3. Show setup instructions');
  console.log('');

  const option = process.argv[2];

  switch (option) {
    case '1':
    case 'generate':
      generateNewWallet();
      console.log('📋 Next Steps:');
      console.log('1. Copy the private key above');
      console.log('2. Update capacity-credits-config.js with the new private key');
      console.log('3. Get tstLPX tokens from https://faucet.litprotocol.com/');
      console.log('4. Enter the wallet address in the faucet');
      console.log('5. Run: node mint-and-delegate-capacity-credits.js');
      break;

    case '2':
    case 'config':
      showCurrentConfig();
      break;

    case '3':
    case 'help':
    default:
      console.log('📖 Setup Instructions:');
      console.log('');
      console.log('STEP 1: Configure your wallets');
      console.log('  - Edit capacity-credits-config.js');
      console.log('  - Set ETHEREUM_PRIVATE_KEY to a wallet that has tstLPX tokens');
      console.log('  - Set PKP_ETH_ADDRESS to your Vincent PKP wallet address');
      console.log('');
      console.log('STEP 2: Get tstLPX tokens');
      console.log('  - Go to: https://faucet.litprotocol.com/');
      console.log('  - Enter the wallet address from ETHEREUM_PRIVATE_KEY');
      console.log('  - Request tstLPX tokens');
      console.log('  - Wait for confirmation');
      console.log('');
      console.log('STEP 3: Run the minting script');
      console.log('  - Run: node mint-and-delegate-capacity-credits.js');
      console.log('  - This will mint capacity credits and delegate to your PKP');
      console.log('');
      console.log('STEP 4: Test vault creation');
      console.log('  - Start your dev server: npm run dev');
      console.log('  - Connect your Vincent PKP wallet');
      console.log('  - Try creating a vault - should work without rate limiting!');
      console.log('');
      console.log('Commands:');
      console.log('  node setup-capacity-credits.js generate  - Generate new wallet');
      console.log('  node setup-capacity-credits.js config    - Show current config');
      console.log('  node setup-capacity-credits.js help      - Show these instructions');
      break;
  }
};

main();
