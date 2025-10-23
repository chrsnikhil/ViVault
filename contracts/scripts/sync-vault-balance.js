import { network } from 'hardhat';

async function main() {
  console.log("🔍 Syncing vault balance...");
  
  // Connect to network first (Hardhat 3 pattern)
  const connection = await network.connect();
  const { ethers } = connection;
  
  // Vault address from your logs
  const vaultAddress = "0x5A57559BA66e96fDef3292b2F8D1B63BcEEb5827";
  const wethAddress = "0x4200000000000000000000000000000000000006";
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Using account:", deployer.address);
  
  // Get the vault contract
  const UserVault = await ethers.getContractFactory("UserVault");
  const vault = UserVault.attach(vaultAddress);
  
  // Check current WETH balance in vault
  const wethContract = new ethers.Contract(wethAddress, [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ], deployer);
  const actualBalance = await wethContract.balanceOf(vaultAddress);
  console.log("🔍 Actual WETH balance in vault:", ethers.formatEther(actualBalance));
  
  // Check internal tracking
  const internalBalance = await vault.getBalance(wethAddress);
  console.log("🔍 Internal tracking balance:", ethers.formatEther(internalBalance));
  
  if (actualBalance.gt(0) && internalBalance.eq(0)) {
    console.log("🔧 WETH exists but not tracked internally. Need to sync...");
    
    // We need to call deposit with 0 amount to sync the balance
    // But first, we need to approve the vault to spend 0 WETH
    const approveTx = await wethContract.approve(vaultAddress, 0);
    await approveTx.wait();
    console.log("✅ Approved vault to spend 0 WETH");
    
    // Now deposit 0 WETH to sync the balance
    const depositTx = await vault.deposit(wethAddress, 0);
    await depositTx.wait();
    console.log("✅ Deposited 0 WETH to sync balance");
    
    // Check if it worked
    const newInternalBalance = await vault.getBalance(wethAddress);
    console.log("🔍 New internal tracking balance:", ethers.formatEther(newInternalBalance));
    
    if (newInternalBalance.gt(0)) {
      console.log("✅ Balance synced successfully!");
    } else {
      console.log("❌ Balance sync failed");
    }
  } else {
    console.log("ℹ️ Balance already synced or no WETH in vault");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
