---
inclusion: fileMatch
fileMatchPattern: '**/lib/database.ts'
---

# Database Integration Guidelines

## Supabase Configuration

### Environment Variables
Store Supabase credentials in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

### Tables
1. **lands** - Stores minted land NFTs
   - id, owner_address, x, y, zone_type, image_url, rtoken_balance, created_at

2. **listings** - Marketplace listings
   - id, land_id, seller_address, price, status, created_at

3. **permits** - Construction permits
   - id, land_id, owner_address, description, status, upvotes, downvotes, created_at

4. **votes** - Permit votes
   - id, permit_id, voter_address, vote_type, created_at

5. **billboards** - Billboard advertising
   - id, land_id, owner_address, price, image_url, leased_by, created_at

## Data Synchronization

### Pattern: Blockchain → Database
1. Execute blockchain transaction
2. Wait for transaction confirmation
3. Extract relevant data (IDs, addresses, etc.)
4. Store in Supabase database
5. Update UI from database

### Example Flow
```typescript
// 1. Blockchain transaction
const tx = await mintLand(x, y);
await tx.wait();

// 2. Store in database
await supabase.from('lands').insert({
  owner_address: account,
  x: x,
  y: y,
  zone_type: zoneType,
  rtoken_balance: 5000
});

// 3. Update UI
fetchLands();
```

## Query Patterns

### Fetching User Data
```typescript
const { data, error } = await supabase
  .from('lands')
  .select('*')
  .eq('owner_address', account);
```

### Real-time Subscriptions
```typescript
const subscription = supabase
  .from('lands')
  .on('INSERT', payload => {
    // Handle new land
  })
  .subscribe();
```

## Best Practices
- Always handle database errors gracefully
- Use proper indexes for frequently queried fields
- Validate data before inserting
- Use transactions for related operations
- Cache frequently accessed data
- Implement pagination for large datasets
