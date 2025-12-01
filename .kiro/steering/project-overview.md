---
inclusion: always
---

# OneCity.space Project Overview

## Project Description
OneCity.space is a decentralized 3D city-building game built on Somnia blockchain. Players can mint land NFTs, trade properties, apply for construction permits, vote on governance proposals, and lease billboard advertising space.

## Core Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **3D Graphics**: Three.js + React Three Fiber
- **Blockchain**: Somnia (EVM-compatible)
- **Wallet**: MetaMask integration via Web3
- **Database**: Supabase (PostgreSQL)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS

## Key Features
1. **Land Minting**: Mint land NFTs at specific coordinates with RTOKEN rewards
2. **Marketplace**: Buy/sell land using RTOKENs
3. **Governance**: Apply for construction permits and vote on proposals
4. **Billboard Advertising**: Lease advertising space on billboards
5. **3D First-Person View**: Navigate and interact with the city in 3D

## Project Structure
- `src/components/game/` - 3D game components (CityCanvas, LandTile, etc.)
- `src/lib/` - Blockchain service layers (mintService, marketplaceService, etc.)
- `src/pages/` - Main pages (Index, Marketplace, Voting)
- `src/Constants/` - Contract addresses and configuration
- `src/types/` - TypeScript type definitions

## Important Notes
- All blockchain interactions use MetaMask wallet
- Wallet address is stored in component state for reuse
- Transactions require user approval via MetaMask popup
- RTOKENs are the in-game currency for trading and permits
