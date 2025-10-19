// Capacity Credits Configuration
// Replace these values with your actual wallet details

export const config = {
  // 1. PRIVATE KEY: The private key of the wallet that has tstLPX tokens
  // This wallet will be used to mint the capacity credits NFT
  // Get tstLPX tokens from: https://faucet.litprotocol.com/
  ETHEREUM_PRIVATE_KEY: '4fc170047fa98089040a0153e8364877c77d4eab3870cde3b7a2634b08c5616b',

  // 2. PKP ADDRESS: Your Vincent PKP wallet address
  // This is where the capacity credits will be delegated to
  // You can find this in your Vincent authentication or PKP wallet
  PKP_ETH_ADDRESS: '0x6C9F98489B77a175B250C514a27D27642DaF8092',
};

// Instructions:
// 1. Replace ETHEREUM_PRIVATE_KEY with the private key of a wallet that has tstLPX tokens
// 2. Replace PKP_ETH_ADDRESS with your actual Vincent PKP wallet address
// 3. Get tstLPX tokens from https://faucet.litprotocol.com/ using the wallet address from step 1
// 4. Run: node mint-and-delegate-capacity-credits.js
