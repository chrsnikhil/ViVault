const crypto = require('crypto');

// Generate a random private key
const privateKey = '0x' + crypto.randomBytes(32).toString('hex');

// Generate address from private key (simplified)
const { keccak256 } = require('ethers').utils;
const publicKey = crypto.createECDH('secp256k1').generateKeys();
const address = '0x' + keccak256(publicKey).slice(-20);

console.log('Private Key:', privateKey);
console.log('Address:', address);
console.log('\n⚠️  IMPORTANT: Save this private key securely!');
console.log('This will be your VINCENT_DELEGATEE_PRIVATE_KEY');
