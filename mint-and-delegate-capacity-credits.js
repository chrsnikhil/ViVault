import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_RPC } from '@lit-protocol/constants';
import fs from 'fs';
import { config } from './capacity-credits-config.js';

dotenv.config();

// Configuration - Update these values in capacity-credits-config.js
const ETHEREUM_PRIVATE_KEY = process.env.VITE_DELEGATEE_PRIVATE_KEY || config.ETHEREUM_PRIVATE_KEY;
const PKP_ETH_ADDRESS = process.env.PKP_ETH_ADDRESS || config.PKP_ETH_ADDRESS;

async function main() {
  try {
    console.log('🚀 Starting Capacity Credits minting and delegation process...');
    console.log('📋 Configuration:');
    console.log('  - dApp Owner Wallet:', new ethers.Wallet(ETHEREUM_PRIVATE_KEY).address);
    console.log('  - PKP Address:', PKP_ETH_ADDRESS);
    console.log('  - Network: Chronicle Yellowstone (DatilTest)');
    console.log('  - Currency: tstLPX (Lit Test Tokens)');
    console.log('');

    // 1. Set up your signer for Chronicle Yellowstone
    const dAppOwnerWallet = new ethers.Wallet(
      ETHEREUM_PRIVATE_KEY,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );
    console.log('✅ dApp owner wallet initialized:', dAppOwnerWallet.address);

    // 2. Check wallet balance
    const balance = await dAppOwnerWallet.getBalance();
    console.log('💰 Wallet balance:', ethers.utils.formatEther(balance), 'tstLPX');

    if (balance.lt(ethers.utils.parseEther('0.1'))) {
      console.log('⚠️  Warning: Low balance. You may need more tstLPX tokens.');
      console.log('💡 Get test tokens from: https://faucet.litprotocol.com/');
    }

    // 3. Connect to Lit Contracts on Chronicle Yellowstone
    const contractClient = new LitContracts({
      signer: dAppOwnerWallet,
      network: LIT_NETWORK.DatilTest, // Chronicle Yellowstone
    });
    await contractClient.connect();
    console.log('✅ Lit Contracts client connected to Chronicle Yellowstone');

    // 4. Mint the Capacity Credits NFT
    console.log('🔍 Minting Capacity Credits NFT...');
    const capacityCreditInfo = await contractClient.mintCapacityCreditsNFT({
      requestsPerKilosecond: 80, // 80 requests per kilosecond
      daysUntilUTCMidnightExpiration: 7, // 7 days until expiration
    });

    console.log('✅ Minted Capacity Credit NFT:');
    console.log('  - Transaction Hash:', capacityCreditInfo.rliTxHash);
    console.log('  - Token ID (Number):', capacityCreditInfo.capacityTokenId);
    console.log('  - Token ID (String):', capacityCreditInfo.capacityTokenIdStr);

    // 5. Connect to Lit Node Client
    const litNodeClient = new LitNodeClient({
      litNetwork: LIT_NETWORK.DatilTest,
      debug: true,
    });
    await litNodeClient.connect();
    console.log('✅ Lit Node Client connected');

    // 6. Delegate the NFT to your Vincent PKP
    console.log('🔍 Delegating capacity to Vincent PKP...');
    const { capacityDelegationAuthSig } = await litNodeClient.createCapacityDelegationAuthSig({
      uses: '10', // Number of times the delegation can be used
      dAppOwnerWallet: dAppOwnerWallet,
      capacityTokenId: capacityCreditInfo.capacityTokenIdStr,
      delegateeAddresses: [PKP_ETH_ADDRESS],
    });
    console.log('✅ Capacity delegated to Vincent PKP:', PKP_ETH_ADDRESS);

    // 7. Output results
    console.log('');
    console.log('🎉 SUCCESS! Capacity Credits minted and delegated:');
    console.log('📊 Results:');
    console.log('  - Capacity Token ID:', capacityCreditInfo.capacityTokenIdStr);
    console.log('  - Transaction Hash:', capacityCreditInfo.rliTxHash);
    console.log('  - Delegated to PKP:', PKP_ETH_ADDRESS);
    console.log('  - Uses remaining: 10');
    console.log('  - Expires in: 7 days');
    console.log('  - Network: Chronicle Yellowstone');
    console.log('');
    console.log('🔑 Delegation AuthSig (save this):');
    console.log(JSON.stringify(capacityDelegationAuthSig, null, 2));
    console.log('');
    console.log('💡 Next steps:');
    console.log('  1. Save the capacityTokenIdStr and capacityDelegationAuthSig');
    console.log('  2. Update your .env file with these values if needed');
    console.log('  3. Your Vincent PKP can now make up to 10 requests without rate limiting');
    console.log('  4. Try creating a vault - it should work without rate limiting errors!');

    // 8. Save to file for easy access
    const result = {
      capacityTokenId: capacityCreditInfo.capacityTokenId,
      capacityTokenIdStr: capacityCreditInfo.capacityTokenIdStr,
      rliTxHash: capacityCreditInfo.rliTxHash,
      pkpAddress: PKP_ETH_ADDRESS,
      delegationAuthSig: capacityDelegationAuthSig,
      network: 'Chronicle Yellowstone (DatilTest)',
      currency: 'tstLPX',
      uses: 10,
      expirationDays: 7,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync('capacity-credits-result.json', JSON.stringify(result, null, 2));
    console.log('💾 Results saved to: capacity-credits-result.json');
  } catch (error) {
    console.error('❌ Error during capacity credits process:', error);

    if (error.message.includes('insufficient funds')) {
      console.log('');
      console.log('💡 SOLUTION: You need more tstLPX tokens!');
      console.log('  1. Go to: https://faucet.litprotocol.com/');
      console.log(
        '  2. Enter your wallet address:',
        new ethers.Wallet(ETHEREUM_PRIVATE_KEY).address
      );
      console.log('  3. Request tstLPX tokens');
      console.log('  4. Wait for the transaction to confirm');
      console.log('  5. Run this script again');
    }

    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
