---
inclusion: manual
---

# Testing and Debugging Guidelines

## Development Workflow

### Running the Project
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup
1. Install MetaMask browser extension
2. Configure Somnia testnet in MetaMask
3. Get testnet tokens from faucet
4. Set up Supabase database credentials in `.env`

## Debugging Blockchain Interactions

### MetaMask Connection Issues
- Check browser console for errors
- Verify `window.ethereum` is available
- Ensure MetaMask is unlocked
- Confirm correct network is selected

### Transaction Debugging
```typescript
// Add detailed logging
console.log("Account:", account);
console.log("Transaction params:", params);
console.log("Transaction hash:", txHash);
```

### Common Issues
1. **"Please Install MetaMask"**: User doesn't have MetaMask installed
2. **Transaction rejected**: User cancelled in MetaMask popup
3. **Insufficient funds**: Not enough tokens for gas or operation
4. **Wrong network**: User connected to different network

## Testing Checklist

### Wallet Connection
- [ ] MetaMask installs and connects properly
- [ ] Wallet address displays correctly
- [ ] Connection persists on page refresh
- [ ] Handles wallet disconnection gracefully

### Land Minting
- [ ] Can select unowned plots
- [ ] Transaction prompts MetaMask approval
- [ ] NFT mints successfully
- [ ] UI updates after minting
- [ ] RTOKEN balance increases

### Marketplace
- [ ] Can list land for sale
- [ ] Listings display correctly
- [ ] Can purchase listed land
- [ ] Ownership transfers properly
- [ ] RTOKENs transfer correctly

### Governance
- [ ] Can apply for permits
- [ ] Permit costs 500 RTOKENs
- [ ] Can vote on permits
- [ ] Vote counts update correctly
- [ ] Permit status updates after approval

## Performance Monitoring
- Monitor 3D rendering performance
- Check for memory leaks in Three.js
- Optimize database queries
- Minimize unnecessary re-renders

## Error Handling
- Always wrap async operations in try-catch
- Provide user-friendly error messages
- Log errors for debugging
- Handle network failures gracefully
