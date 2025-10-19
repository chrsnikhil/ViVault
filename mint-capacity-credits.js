require('dotenv').config();
const { ethers } = require('ethers');
const { LitContracts } = require('@lit-protocol/contracts-sdk');
const { LitNodeClient } = require('@lit-protocol/lit-node-client');
const { LIT_NETWORK, LIT_RPC } = require('@lit-protocol/constants');

// Configuration
const ETHEREUM_PRIVATE_KEY =
  process.env.VITE_DELEGATEE_PRIVATE_KEY ||
  '0xcbe08e167d797d1420612467230e4b8a551b6fa56e300808dda6cbfba6cc6eb3';
const PKP_ETH_ADDRESS = process.env.PKP_ETH_ADDRESS || '0xcc68b13b4Bd8D8fC9d797282Bf9b927F79fcC470'; // Your Vincent PKP address

async function main() {
  try {
    console.log('🚀 Starting Capacity Credits minting and delegation process...');
    console.log('📋 Configuration:');
    console.log('  - dApp Owner Wallet:', new ethers.Wallet(ETHEREUM_PRIVATE_KEY).address);
    console.log('  - PKP Address:', PKP_ETH_ADDRESS);
    console.log('  - Network: DatilDev (Development)');
    console.log('');

    // 1. Set up your signer (the wallet that will mint the credit)
    const dAppOwnerWallet = new ethers.Wallet(ETHEREUM_PRIVATE_KEY);
    console.log('✅ dApp owner wallet initialized:', dAppOwnerWallet.address);

    // 2. Connect to Lit Contracts
    const contractClient = new LitContracts({
      signer: dAppOwnerWallet,
      network: LIT_NETWORK.DatilDev, // Use DatilDev for development
    });
    await contractClient.connect();
    console.log('✅ Lit Contracts client connected');

    // 3. Mint the Capacity Credits NFT
    console.log('🔍 Minting Capacity Credits NFT...');
    const { capacityTokenIdStr } = await contractClient.mintCapacityCreditsNFT({
      requestsPerKilosecond: 80, // 80 requests per kilosecond
      daysUntilUTCMidnightExpiration: 7, // 7 days until expiration
    });
    console.log('✅ Minted Capacity Credit NFT with tokenId:', capacityTokenIdStr);

    // 4. Connect to Lit Node Client
    const litNodeClient = new LitNodeClient({
      litNetwork: LIT_NETWORK.DatilDev,
      debug: true,
    });
    await litNodeClient.connect();
    console.log('✅ Lit Node Client connected');

    // 5. Delegate the NFT to a PKP
    console.log('🔍 Delegating capacity to PKP...');
    const { capacityDelegationAuthSig } = await litNodeClient.createCapacityDelegationAuthSig({
      uses: '10', // Number of times the delegation can be used
      dAppOwnerWallet: dAppOwnerWallet,
      capacityTokenId: capacityTokenIdStr,
      delegateeAddresses: [PKP_ETH_ADDRESS],
    });
    console.log('✅ Capacity delegated to PKP:', PKP_ETH_ADDRESS);

    // 6. Output results
    console.log('');
    console.log('🎉 SUCCESS! Capacity Credits minted and delegated:');
    console.log('📊 Results:');
    console.log('  - Capacity Token ID:', capacityTokenIdStr);
    console.log('  - Delegated to PKP:', PKP_ETH_ADDRESS);
    console.log('  - Uses remaining: 10');
    console.log('  - Expires in: 7 days');
    console.log('');
    console.log('🔑 Delegation AuthSig (save this):');
    console.log(JSON.stringify(capacityDelegationAuthSig, null, 2));
    console.log('');
    console.log('💡 Next steps:');
    console.log('  1. Save the capacityTokenIdStr and capacityDelegationAuthSig');
    console.log('  2. Use these in your Vincent PKP wallet for vault creation');
    console.log('  3. The PKP can now make up to 10 requests without rate limiting');
  } catch (error) {
    console.error('❌ Error during capacity credits process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
