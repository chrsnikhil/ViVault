#!/usr/bin/env node

/**
 * Generate a delegatee private key for Vincent PKP wallet authorization
 *
 * This script generates a new Ethereum wallet that will be used to authorize requests to your
 * Vincent PKP wallet. This wallet does NOT need any funds.
 *
 * Usage: node generate-delegatee-key.js
 */

const { ethers } = require('ethers');

console.log('🔑 Generating delegatee private key for Vincent PKP authorization...\n');

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log('✅ Delegatee wallet generated successfully!\n');
console.log('📋 Add these to your .env file:\n');
console.log(`VITE_DELEGATEE_PRIVATE_KEY=${wallet.privateKey}`);
console.log(`# Delegatee Address: ${wallet.address}\n`);

console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Keep this private key secure - treat it like any other private key');
console.log('2. Add .env to your .gitignore file to prevent committing secrets');
console.log('3. This wallet does NOT need any ETH or tokens');
console.log('4. It only authorizes requests to your Vincent PKP wallet');
console.log('5. You can use the same delegatee key for multiple transactions\n');

console.log('🔧 Next steps:');
console.log('1. Copy the VITE_DELEGATEE_PRIVATE_KEY to your .env file');
console.log('2. Restart your development server');
console.log('3. Your Vincent PKP wallet can now sign transactions!\n');
