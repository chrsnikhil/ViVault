# Capacity Credits Setup Guide

This guide will help you set up Lit Protocol Capacity Credits to avoid rate limiting when using your Vincent PKP wallet.

## Prerequisites

1. **Vincent PKP Wallet**: You need a Vincent PKP wallet address
2. **tstLPX Tokens**: You need Lit test tokens on Chronicle Yellowstone
3. **Delegatee Wallet**: A wallet with tstLPX tokens to mint capacity credits

## Step 1: Get tstLPX Test Tokens

1. **Go to the Lit Protocol Faucet**: https://faucet.litprotocol.com/
2. **Enter your wallet address** (the one with the private key in your .env file)
3. **Request tstLPX tokens**
4. **Wait for the transaction to confirm**

## Step 2: Update Your Configuration

Make sure your `.env` file has:

```bash
# Your delegatee wallet private key (the one with tstLPX tokens)
VITE_DELEGATEE_PRIVATE_KEY=your_private_key_here

# Your Vincent PKP wallet address (optional, can be set in script)
PKP_ETH_ADDRESS=0xYourVincentPKPAddress
```

## Step 3: Run the Capacity Credits Script

```bash
# Navigate to the project root
cd ViVault

# Run the minting and delegation script
node mint-and-delegate-capacity-credits.js
```

## Step 4: What the Script Does

1. **Connects to Chronicle Yellowstone** using your delegatee wallet
2. **Checks your tstLPX balance**
3. **Mints a Capacity Credits NFT** (costs ~0.045 tstLPX)
4. **Delegates the capacity** to your Vincent PKP wallet
5. **Saves the results** to `capacity-credits-result.json`

## Step 5: Expected Output

```
🚀 Starting Capacity Credits minting and delegation process...
📋 Configuration:
  - dApp Owner Wallet: 0xYourWalletAddress
  - PKP Address: 0xYourVincentPKPAddress
  - Network: Chronicle Yellowstone (DatilTest)
  - Currency: tstLPX (Lit Test Tokens)

✅ dApp owner wallet initialized: 0xYourWalletAddress
💰 Wallet balance: 1.0 tstLPX
✅ Lit Contracts client connected to Chronicle Yellowstone
🔍 Minting Capacity Credits NFT...
✅ Minted Capacity Credit NFT:
  - Transaction Hash: 0x...
  - Token ID (Number): 123
  - Token ID (String): 123
✅ Lit Node Client connected
🔍 Delegating capacity to Vincent PKP...
✅ Capacity delegated to Vincent PKP: 0xYourVincentPKPAddress

🎉 SUCCESS! Capacity Credits minted and delegated:
📊 Results:
  - Capacity Token ID: 123
  - Transaction Hash: 0x...
  - Delegated to PKP: 0xYourVincentPKPAddress
  - Uses remaining: 10
  - Expires in: 7 days
  - Network: Chronicle Yellowstone
```

## Step 6: Test Vault Creation

1. **Start your development server**: `npm run dev`
2. **Connect your Vincent PKP wallet**
3. **Try creating a vault** - it should work without rate limiting errors!

## Troubleshooting

### "Insufficient funds" Error

If you get an insufficient funds error:

1. **Check your tstLPX balance** at the faucet
2. **Request more tokens** if needed
3. **Wait for confirmation** before running the script again

### "Network error" Issues

1. **Check your internet connection**
2. **Verify the Lit Protocol network status**
3. **Try again in a few minutes**

### "PKP not found" Error

1. **Verify your Vincent PKP address** is correct
2. **Make sure your Vincent PKP wallet is properly set up**
3. **Check that the address matches your Vincent authentication**

## Understanding the Results

The script creates a `capacity-credits-result.json` file with:

```json
{
  "capacityTokenId": 123,
  "capacityTokenIdStr": "123",
  "rliTxHash": "0x...",
  "pkpAddress": "0xYourVincentPKPAddress",
  "delegationAuthSig": { ... },
  "network": "Chronicle Yellowstone (DatilTest)",
  "currency": "tstLPX",
  "uses": 10,
  "expirationDays": 7,
  "timestamp": "2025-10-17T..."
}
```

## Cost Breakdown

- **Capacity Credits NFT**: ~0.045 tstLPX
- **Gas fees**: ~0.005 tstLPX
- **Total cost**: ~0.05 tstLPX per minting

## Next Steps

After successful setup:

1. **Your Vincent PKP wallet** can now make requests without rate limiting
2. **Vault creation** should work smoothly
3. **Capacity credits expire** after 7 days (configurable)
4. **You can mint more credits** when needed

## Support

If you encounter issues:

1. **Check the console logs** for detailed error messages
2. **Verify your wallet has sufficient tstLPX tokens**
3. **Ensure your Vincent PKP address is correct**
4. **Check the Lit Protocol documentation** for updates
