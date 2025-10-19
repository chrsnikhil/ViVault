# Vincent Contract Whitelist Configuration

## ⚠️ CRITICAL: Users Must Configure Contract Whitelist

Your ViVault app uses the Vincent EVM Transaction Signer Ability, which requires users to configure a Contract Whitelist Policy during the Vincent Connect flow.

**Without proper whitelist configuration, ALL transactions will be DENIED.**

## 📋 Whitelist Configuration Required

When users authenticate with your Vincent App, they MUST whitelist the following:

### Chain ID

```
84532
```

_(Base Sepolia Testnet)_

### VaultFactory Contract Address

```
0xC512f4A21882079C3598BDDBa994a173349123BA
```

### Function Selector for `createVault()`

```
0x5d12928b
```

**OR** use wildcard to allow all functions:

```
*
```

## 🔧 How Users Configure the Whitelist

### During Vincent Connect Flow

1. User clicks "Connect with Vincent" in your app
2. They are redirected to the Vincent Connect Page
3. They will see:
   - **Vincent Abilities** your app needs (EVM Transaction Signer)
   - **Vincent Policies** they need to configure (Contract Whitelist)
4. They must add to the whitelist:
   - **Chain ID**: `84532`
   - **Contract Address**: `0xC512f4A21882079C3598BDDBa994a173349123BA`
   - **Function**: `0x5d12928b` (or `*` for all functions)
5. After approval, they're redirected back with a JWT

### For Returning Users

If users are getting `DelegateeNotAssociatedWithApp` or policy denial errors:

1. They need to **update their whitelist** in the Vincent Dashboard
2. Or **re-authenticate** and properly configure the whitelist during Connect flow

## 🎯 What This Enables

Once properly whitelisted, users can:

- ✅ Call `createVault()` on the VaultFactory contract
- ✅ Create their personal vault on Base Sepolia
- ✅ Sign transactions securely through Vincent's PKP wallet

## 📝 Additional Functions (Future)

As you add more functionality, users will need to whitelist additional contracts and functions:

### UserVault Functions (for future use)

```javascript
// UserVault contract address (created dynamically per user)
// Functions that may need whitelisting:
deposit(address, uint256); // 0x47e7ef24
withdraw(address, uint256); // 0xf3fef3a3
withdrawAll(address); // 0x958e4b93
```

### ERC20 Token Approvals (for future use)

```javascript
// USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
// WETH on Base Sepolia: 0x4200000000000000000000000000000000000006

approve(address, uint256); // 0x095ea7b3
transfer(address, uint256); // 0xa9059cbb
```

## 🚨 Troubleshooting

### Error: "DelegateeNotAssociatedWithApp"

This often means the Contract Whitelist Policy is denying the transaction because:

- Contract address is not whitelisted
- Function selector is not whitelisted
- Chain ID is not whitelisted

**Solution**: Have users update their whitelist configuration.

### Error: "Policy denied"

The transaction was explicitly blocked by the whitelist policy.

**Solution**: Verify the correct chain ID, contract address, and function selector are whitelisted.

## 📚 Resources

- [Vincent Contract Whitelist Policy Documentation](https://docs.heyvincent.ai/policies/contract-whitelist)
- [Vincent Dashboard](https://dashboard.heyvincent.ai)
- [Base Sepolia Block Explorer](https://sepolia.basescan.org)

## 🔐 Security Note

The Contract Whitelist Policy is a **security feature** that ensures Vincent Apps can only interact with approved contracts. This protects users from malicious or unintended transactions.

Users have full control over what contracts and functions your app can access on their behalf.
