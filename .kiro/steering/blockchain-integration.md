---
inclusion: always
---

# Blockchain Integration Guidelines

## MetaMask Wallet Connection

### Standard Connection Pattern
```typescript
const [isWalletInstalled, setIsWalletInstalled] = useState(false);
const [account, setAccount] = useState<string | null>(null);

useEffect(() => {
  if (window.ethereum) {
    setIsWalletInstalled(true);
    connectWallet();
  }
}, []);

const connectWallet = async () => {
  window.ethereum
    .request({ method: "eth_requestAccounts" })
    .then((accounts: string[]) => {
      setAccount(accounts[0]);
    })
    .catch((e: any) => {
      alert(e);
    });
};
```

### Window Ethereum Type Declaration
Always declare the ethereum property on Window:
```typescript
declare global {
  interface Window {
    ethereum?: any;
  }
}
```

## Transaction Patterns

### 1. Always Check Wallet Connection
Before any transaction, verify the wallet is connected:
```typescript
if (!account) {
  alert("Please connect your wallet first");
  return;
}
```

### 2. Handle Transaction Errors
Wrap all blockchain calls in try-catch:
```typescript
try {
  const tx = await contract.method();
  await tx.wait();
  // Success handling
} catch (error) {
  console.error("Transaction failed:", error);
  alert("Transaction failed. Please try again.");
}
```

### 3. Provide User Feedback
- Show loading states during transactions
- Display success/error messages
- Update UI after transaction confirmation

## Smart Contract Interaction

### Contract Configuration
- Store contract addresses in `src/Constants/constants.js`
- Use environment variables for sensitive data
- Keep ABIs in separate files for maintainability

### Service Layer Pattern
Create service files in `src/lib/` for blockchain operations:
- `mintService.ts` - Land minting operations
- `marketplaceService.ts` - Trading operations
- `permitService.ts` - Governance operations
- `advertisingService.ts` - Billboard operations

## Best Practices
- Always validate user input before transactions
- Check token balances before operations
- Provide clear error messages to users
- Log transaction hashes for debugging
- Store wallet address in state for reuse across components
- Never store private keys or sensitive data in code
