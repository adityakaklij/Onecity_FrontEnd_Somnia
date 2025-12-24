import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CityCanvas } from '@/components/game/CityCanvas';
import { GameHeader } from '@/components/game/GameHeader';
import { LandPanel } from '@/components/game/LandPanel';
import { Minimap } from '@/components/game/Minimap';
import { Land, Player, ZoneType, BuildingType, DevelopmentStage, Permit, Contractor, CropType } from '@/types/game';
import * as THREE from 'three';
import { useToast } from '@/hooks/use-toast';
import { PRICING, calculateLandPrice } from '@/config/pricing';
import { 
  loadGameState, 
  saveGameState, 
  autoSave, 
  savePlotPurchase, 
  loadPlotsByWallet, 
  getTotalRTokenBalance,
  savePermit, 
  updatePlotRTokenBalance,
  saveListing,
  loadListingByLandDataObjectId,
  loadPermitsByWallet,
  loadPlotByLandId,
  saveAdvertisingListing,
  loadAdvertisingByLandDataObjectId,
  updateAdvertisingStatus,
  getActiveAdvertising
} from '@/lib/database';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAccount, useSignAndExecuteTransaction, useCurrentWallet } from '@mysten/dapp-kit';
import { useEVMWallet } from '@/hooks/useEVMWallet';
import { createMintTransaction, waitForMintTransaction } from '@/lib/mintService';
import { prepareTransactionForEnoki } from '@/lib/enokiGasHelper';
import { isEpochExpirationError, getEpochExpirationMessage } from '@/lib/enokiSessionHelper';
import { isEnokiWallet } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: "https://rpc-testnet.onelabs.cc:443" });
import { 
  createApplyPermitTransaction, 
  waitForApplyPermitTransaction 
} from '@/lib/permitService';
import {
  createListForSaleTransaction,
  waitForListForSaleTransaction
} from '@/lib/marketplaceService';
import {
  createListForAdvertisingTransaction,
  createLeaseAdvertisingTransaction,
  waitForListForAdvertisingTransaction,
  waitForLeaseAdvertisingTransaction
} from '@/lib/advertisingService';

const GRID_SIZE = 30;

// Generate a realistic city layout with pre-defined zones
const generateInitialLands = (): Land[] => {
  const lands: Land[] = [];
  
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const id = `${x}-${y}`;
      let zone: ZoneType = 'residential';
      let building = null;
      
      // Main roads (every 6 blocks)
      if (x % 6 === 0 || y % 6 === 0) {
        zone = 'road';
      }
      // Parks (central and corners)
      else if ((x === 15 && y === 15) || (x < 3 && y < 3) || (x > 27 && y > 27)) {
        zone = 'park';
      }
      // Industrial zone (north section)
      else if (y < 8 && x % 6 !== 0) {
        zone = 'industrial';
        if (Math.random() > 0.90) {
          building = { type: 'factory' as BuildingType, stage: 'complete' as DevelopmentStage };
        }
      }
      // Commercial zone (city center)
      else if (x > 10 && x < 20 && y > 10 && y < 20) {
        zone = 'commercial';
        if (Math.random() > 0.80) {
          building = { type: 'shop' as BuildingType, stage: 'complete' as DevelopmentStage };
        }
      }
      // Agricultural (outskirts)
      else if (x < 5 || x > 25 || y > 20) {
        zone = 'agricultural';
        if (Math.random() > 0.90) {
          building = { type: 'farm' as BuildingType, stage: 'complete' as DevelopmentStage };
        }
      }
      // Residential (remaining areas)
      else {
        zone = 'residential';
        if (Math.random() > 0.90) {
          building = { type: 'house' as BuildingType, stage: 'complete' as DevelopmentStage };
        }
      }
      
      lands.push({
        id,
        x,
        y,
        zone,
        owner: null,
        price: calculateLandPrice(zone),
        building,
      });
    }
  }
  return lands;
};

const Index = () => {
  const { toast } = useToast();
  const suiAccount = useCurrentAccount(); // Keep for Sui-specific features (billboard)
  const wallet = useCurrentWallet();
  const { mutate: signAndExecute, isPending: isMintingSui, reset } = useSignAndExecuteTransaction();
  const { account, address: evmAddress, isConnected: isEVMConnected, connect: connectEVM } = useEVMWallet();
  const [isMinting, setIsMinting] = useState(false); // For EVM transactions
  
  // Use EVM wallet address for EVM transactions, fallback to Sui for compatibility
  const accountAddress = evmAddress || suiAccount?.address;
  const [lands, setLands] = useState<Land[]>([]);
  const [selectedLand, setSelectedLand] = useState<Land | null>(null);
  const [player, setPlayer] = useState<Player>({
    id: 'player',
    name: 'Player',
    balance: PRICING.player.initialBalance,
    ownedLands: [],
    leasedLands: [],
    monthlyIncome: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [totalRTokens, setTotalRTokens] = useState(0);
  const [ownedPlotIds, setOwnedPlotIds] = useState<Set<string>>(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  
  // Get camera reference from window
  useEffect(() => {
    const checkCamera = setInterval(() => {
      if ((window as any).__gameCamera) {
        setCamera((window as any).__gameCamera);
        clearInterval(checkCamera);
      }
    }, 100);
    
    return () => clearInterval(checkCamera);
  }, []);

  // Load game state on mount
  useEffect(() => {
    const loadGame = async () => {
      setIsLoading(true);
      const savedState = await loadGameState();
      if (savedState) {
        setLands(savedState.lands);
        setPlayer(savedState.player);
        toast({
          title: "Game Loaded",
          description: "Your saved game has been restored.",
        });
      } else {
        setLands(generateInitialLands());
      }
      setIsLoading(false);
    };
    loadGame();
  }, []);

  // Track last loaded account to prevent unnecessary reloads
  const [lastLoadedAccount, setLastLoadedAccount] = useState<string | null>(null);

  // Load all plots from database (not just owned ones) to get landDataObjectId for billboard listings
  useEffect(() => {
    // Only reload if account actually changed
    if (lastLoadedAccount === accountAddress) {
      return;
    }

    const loadAllPlots = async () => {
      try {
        // Load all plots from database to get landDataObjectId for billboard lands
        // We need this to load advertising listings even for plots owned by others
        // Use type assertion to bypass TypeScript strict checking
        // Note: We load all plots here, so no need for case-insensitive filtering
        const { data: allPlots, error } = await (supabase as any)
          .from('plots_2' as any)
          .select('land_id, land_data_object_id, owner_wallet_address, rtokens, transaction_digest');

        if (error) {
          console.error('Error loading all plots:', error);
          return;
        }

        if (allPlots && allPlots.length > 0) {
          // Update lands with database data (for all plots, not just owned)
          setLands(prevLands => {
            let hasChanges = false;
            const updatedLands = prevLands.map(land => {
              const plotData = allPlots.find((p: any) => p.land_id === land.id);
              if (plotData) {
                // Normalize addresses to lowercase for comparison
                const normalizedAccountAddress = accountAddress?.toLowerCase().trim() || '';
                const normalizedPlotAddress = (plotData.owner_wallet_address || '').toLowerCase().trim();
                const isOwnedByPlayer = normalizedAccountAddress && normalizedPlotAddress === normalizedAccountAddress;
                // Mark as owned if there's an owner (either by player or someone else)
                const isOwned = !!plotData.owner_wallet_address;
                const newOwner: 'player' | 'other' | null = isOwnedByPlayer ? 'player' : (isOwned ? 'other' : null);
                
                // Check if anything actually changed
                // Handle rtokens: use 0 as fallback if null/undefined, but ensure we update if it's actually 0
                const plotRtokens = plotData.rtokens !== null && plotData.rtokens !== undefined ? plotData.rtokens : 0;
                const currentRtokens = land.rtokens !== null && land.rtokens !== undefined ? land.rtokens : 0;
                
                // Normalize for comparison
                const normalizedLandAddress = (land.ownerWalletAddress || '').toLowerCase().trim();
                
                if (
                  land.owner !== newOwner ||
                  normalizedLandAddress !== normalizedPlotAddress ||
                  land.landDataObjectId !== plotData.land_data_object_id ||
                  currentRtokens !== plotRtokens
                ) {
                  hasChanges = true;
                  return {
                    ...land,
                    owner: newOwner,
                    ownerWalletAddress: plotData.owner_wallet_address,
                    landDataObjectId: plotData.land_data_object_id,
                    transactionDigest: plotData.transaction_digest,
                    rtokens: plotRtokens,
                  };
                }
              }
              return land;
            });
            
            // Only update state if something actually changed
            return hasChanges ? updatedLands : prevLands;
          });
        }
        
        setLastLoadedAccount(accountAddress || null);
      } catch (error) {
        console.error('Error loading all plots:', error);
      }
    };

    loadAllPlots();
  }, [accountAddress, lastLoadedAccount]); // Reload when account changes to update ownership

  // Load owned plots from database when wallet is connected
  useEffect(() => {
    const loadOwnedPlots = async () => {
      if (!accountAddress) {
        setOwnedPlotIds(new Set());
        setTotalRTokens(0);
        return;
      }

      try {
        // Load plots from database
        const plots = await loadPlotsByWallet(accountAddress);
        const plotIds = new Set(plots.map(plot => plot.landId));
        setOwnedPlotIds(plotIds);

        // Calculate total RTOKENs
        const total = await getTotalRTokenBalance(accountAddress);
        setTotalRTokens(total);

        // Update player owned lands
        setPlayer(prev => ({
          ...prev,
          ownedLands: Array.from(plotIds),
        }));
      } catch (error) {
        console.error('Error loading owned plots:', error);
      }
    };

    loadOwnedPlots();
  }, [accountAddress]);

  // Auto-save when lands or player changes (debounced to prevent excessive saves)
  useEffect(() => {
    if (!isLoading && lands.length > 0) {
      // Use a timeout to debounce auto-save
      const timeoutId = setTimeout(() => {
        autoSave(lands, player);
      }, 1000); // Wait 1 second after last change before saving

      return () => clearTimeout(timeoutId);
    }
  }, [lands, player, isLoading]);

  const handlePurchaseLand = async (land: Land) => {
    // Check if EVM wallet is connected
    if (!isEVMConnected || !evmAddress) {
      try {
        await connectEVM();
      } catch (error: any) {
        toast({
          title: "Wallet Not Connected",
          description: error.message || "Please connect your MetaMask wallet to purchase land.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if already owned (by anyone, not just the current player)
    if (land.owner || land.ownerWalletAddress) {
      toast({
        title: "Already Owned",
        description: "This plot is already owned by another user.",
        variant: "destructive",
      });
      return;
    }

    // Check if already minting
    if (isMinting) {
      toast({
        title: "Transaction Pending",
        description: "Please wait for the current transaction to complete.",
        variant: "destructive",
      });
      return;
    }

    // Show processing toast
    toast({
      title: "Processing Purchase",
      description: "Please approve the transaction in your wallet...",
    });

    try {
      setIsMinting(true);

      // Create and execute mint transaction (EVM - transaction is sent immediately)
      const tx = await createMintTransaction(land.x, land.y, land.zone);
      console.log("Transaction sent:", tx);

      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      // Wait for transaction to complete
      const mintResult = await waitForMintTransaction(tx);

      console.log('Mint result received:', mintResult);

      // Save to database with retry logic
      let saved = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!saved && retryCount < maxRetries) {
        try {
          console.log(`Attempting to save plot purchase to database (attempt ${retryCount + 1}/${maxRetries})...`);
          saved = await savePlotPurchase({
            landId: land.id,
            x: land.x,
            y: land.y,
            ownerWalletAddress: mintResult.ownerAddress,
            landDataObjectId: mintResult.landDataObjectId,
            transactionDigest: mintResult.digest,
            rtokens: mintResult.rtokens,
            zoneType: land.zone,
          });

          if (saved) {
            console.log('Plot purchase saved successfully to database');
          } else {
            console.warn(`Failed to save plot purchase to database (attempt ${retryCount + 1}/${maxRetries})`);
            retryCount++;
            if (retryCount < maxRetries) {
              // Wait 1 second before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (dbError: any) {
          console.error(`Error saving to database (attempt ${retryCount + 1}/${maxRetries}):`, dbError);
          retryCount++;
          if (retryCount < maxRetries) {
            // Wait 1 second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // Show error to user but don't fail the entire transaction
            toast({
              title: "Database Save Warning",
              description: "Transaction succeeded but failed to save to database. The plot is yours, but you may need to refresh the page.",
              variant: "destructive",
            });
          }
        }
      }

            if (!saved) {
              console.error('Failed to save plot purchase to database after all retries');
              // Still continue with local state update since transaction succeeded
            }

            // Reload plots from database to ensure UI is in sync
            // This ensures rtokens and other data are correctly loaded
            try {
              const { data: allPlots, error: reloadError } = await (supabase as any)
                .from('plots_2' as any)
                .select('land_id, land_data_object_id, owner_wallet_address, rtokens, transaction_digest')
                .eq('land_id', land.id)
                .single();
              
              if (!reloadError && allPlots) {
                console.log('Reloaded plot from database:', allPlots);
                // Use database values if available
                if (allPlots.rtokens !== null && allPlots.rtokens !== undefined) {
                  mintResult.rtokens = allPlots.rtokens;
                }
              }
            } catch (reloadError) {
              console.warn('Error reloading plot from database:', reloadError);
              // Continue with mintResult values
            }

            // Update local state
      const updatedLand: Land = {
        ...land,
        owner: 'player',
        ownerWalletAddress: mintResult.ownerAddress,
        landDataObjectId: mintResult.landDataObjectId,
        transactionDigest: mintResult.digest,
        rtokens: mintResult.rtokens,
        purchasedAt: new Date(),
      };

      setPlayer(prev => ({
        ...prev,
        ownedLands: [...prev.ownedLands, land.id],
      }));

      setLands(prev => prev.map(l => 
        l.id === land.id ? updatedLand : l
      ));

      // Update owned plot IDs
      setOwnedPlotIds(prev => new Set([...prev, land.id]));

      // Update total RTOKENs - reload from database to get accurate total
      const newTotalBalance = await getTotalRTokenBalance(accountAddress || '');
      setTotalRTokens(newTotalBalance);

      setSelectedLand(updatedLand);

      toast({
        title: "Land Purchased Successfully!",
        description: `You successfully purchased land #${land.id}. You received ${mintResult.rtokens} RTOKENs!`,
      });

      reset();
      setIsMinting(false);
    } catch (error: any) {
      console.error("Error processing mint transaction:", error);
      setIsMinting(false);
      
      // Provide more specific error messages
      let errorMessage = "Failed to purchase land. Please try again.";
      if (error.message) {
        if (error.message.includes('already be minted') || error.message.includes('already minted')) {
          errorMessage = "This land is already minted. Please select a different plot.";
        } else if (error.message.includes('revert')) {
          errorMessage = "Transaction failed. The land may already be minted or there may be insufficient funds.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
      reset();
    }
  };

  const handleApplyPermit = useCallback(async (land: Land, description: string) => {
    if (!isEVMConnected || !evmAddress) {
      try {
        await connectEVM();
      } catch (error: any) {
        toast({
          title: "Wallet Not Connected",
          description: error.message || "Please connect your MetaMask wallet to apply for a permit.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (!evmAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to apply for a permit.",
        variant: "destructive",
      });
      return;
    }

    if (!land.landDataObjectId) {
      toast({
        title: "Invalid Land",
        description: "This land does not have a valid blockchain record.",
        variant: "destructive",
      });
      return;
    }

    // Check RTOKEN balance for this specific plot (500 RTOKENs required)
    const PERMIT_FEE_RTOKEN = 500;
    
    // Get the plot's current rtokens from database
    const plotData = await loadPlotByLandId(land.id);
    const plotRtokens = plotData?.rtokens || 0;
    
    if (plotRtokens < PERMIT_FEE_RTOKEN) {
      toast({
        title: "Insufficient RTOKENs",
        description: `Permit fee is ${PERMIT_FEE_RTOKEN} RTOKENs. This plot has ${plotRtokens} RTOKENs.`,
        variant: "destructive",
      });
      return;
    }

    if (isMinting) {
      toast({
        title: "Transaction Pending",
        description: "Please wait for the current transaction to complete.",
        variant: "destructive",
      });
      return;
    }

    if (!description || description.trim() === '') {
      toast({
        title: "Invalid Description",
        description: "Please provide a description for your permit application.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Processing Permit Application",
      description: "Please approve the transaction in your wallet...",
    });

    try {
      // Create and execute permit application transaction (EVM - transaction is sent immediately)
      // Use the actual contract landId stored in landDataObjectId (this is the incremental ID from minting)
      const landId = land.landDataObjectId;
      if (!landId) {
        throw new Error('Land does not have a valid contract landId');
      }
      const tx = await createApplyPermitTransaction(description, landId);

      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      // Wait for transaction to complete
      const permitResult = await waitForApplyPermitTransaction(tx);

      if (!permitResult) {
        throw new Error('Failed to process permit transaction result');
      }

      // Get current plot's rtokens and deduct permit fee
      const plotData = await loadPlotByLandId(land.id);
      const currentPlotRtokens = plotData?.rtokens || 5000;
      const newPlotBalance = currentPlotRtokens - PERMIT_FEE_RTOKEN;
      
      if (newPlotBalance < 0) {
        throw new Error('Insufficient RTOKENs on this plot');
      }

      // Update RTOKEN balance for this specific plot
      const updateResult = await updatePlotRTokenBalance(land.landDataObjectId, newPlotBalance);
      
      if (!updateResult.success) {
        throw new Error('Failed to update RTOKEN balance in database');
      }

      // Reload plot from database to ensure we have the latest data
      const reloadedPlot = await loadPlotByLandId(land.id);
      
      // Update local state with new RTOKEN balance
      setLands(prev => prev.map(l => 
        l.id === land.id ? { 
          ...l, 
          rtokens: reloadedPlot?.rtokens ?? updateResult.updatedRtokens ?? newPlotBalance
        } : l
      ));
      
      // Recalculate total RTOKENs
      const newTotalBalance = await getTotalRTokenBalance(accountAddress);

      // Save permit to database (permit_id will be auto-generated sequentially starting from 1)
      const blockchainPermitId = permitResult.permitId || null; // Blockchain permit ID (proposalId)
      const permitResult_db = await savePermit({
        // permitId is not provided - database will auto-generate sequential ID
        blockchainPermitId: blockchainPermitId || undefined, // Store blockchain permit ID
        landId: land.id,
        landDataObjectId: land.landDataObjectId,
        ownerWalletAddress: accountAddress,
        description,
        buildingType: null, // No longer used, kept for database compatibility
        floors: 0, // No longer used, kept for database compatibility
        status: 'pending',
        permitFee: PERMIT_FEE_RTOKEN,
        upvotes: 0,
        downvotes: 0,
        minimumUpvotes: 2,
        transactionDigest: permitResult.digest,
      });

      // Get the sequential permit ID from database (first permit gets ID 1, second gets ID 2, etc.)
      const sequentialPermitId = permitResult_db?.permitId || 0;

      // Update local state
      const permit: Permit = {
        id: `permit-${Date.now()}`,
        permitId: sequentialPermitId.toString(), // Use sequential ID as the main identifier
        type: 'building',
        status: 'pending',
        fee: PERMIT_FEE_RTOKEN,
        submittedDate: new Date(),
        description,
        landDataObjectId: land.landDataObjectId,
        ownerWalletAddress: accountAddress,
        transactionDigest: permitResult.digest,
        upvotes: 0,
        downvotes: 0,
        minimumUpvotes: 2,
      };

      setLands(prev => prev.map(l => 
        l.id === land.id ? { 
          ...l, 
          building: { 
            type: null, // No longer used
            stage: 'empty',
            floors: 0, // No longer used
            permit,
            constructionProgress: 0,
          } 
        } : l
      ));

      // Update total RTOKENs
      setTotalRTokens(newTotalBalance);

      toast({
        title: "Permit Application Submitted!",
        description: `You've applied for a permit. ${PERMIT_FEE_RTOKEN} RTOKENs deducted. Visit the Voting page to see your permit.`,
      });

      reset();
    } catch (error: any) {
      console.error("Error processing permit application:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to apply for permit. Please try again.",
        variant: "destructive",
      });
      reset();
    }
  }, [evmAddress, isEVMConnected, totalRTokens, isMinting, reset, toast, connectEVM, accountAddress]);

  const handleHireContractor = (land: Land, contractor: Contractor) => {
    if (player.balance < contractor.cost) {
      toast({
        title: "Insufficient Funds",
        description: `Contractor fee is $${contractor.cost.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    setPlayer(prev => ({ ...prev, balance: prev.balance - contractor.cost }));
    
    setLands(prev => prev.map(l => 
      l.id === land.id ? {
        ...l,
        building: l.building ? {
          ...l.building,
          contractor,
          stage: 'foundation',
        } : null
      } : l
    ));

    toast({
      title: "Contractor Hired",
      description: `${contractor.name} has been hired. Construction will begin immediately.`,
    });

    // Simulate construction progress
    const progressInterval = setInterval(() => {
      setLands(prev => prev.map(l => {
        if (l.id === land.id && l.building && l.building.constructionProgress < 100) {
          const newProgress = Math.min(100, l.building.constructionProgress + (100 / contractor.speed));
          const newStage = newProgress < 33 ? 'foundation' : newProgress < 66 ? 'construction' : 'complete';
          
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            toast({
              title: "Construction Complete!",
              description: `Your ${l.building.type} is now complete and generating revenue.`,
            });
          }
          
            return {
              ...l,
              building: {
                ...l.building,
                constructionProgress: newProgress,
                stage: newStage,
                revenue: newStage === 'complete' ? PRICING.revenue.calculate(l.building.floors || 1, contractor.quality) : 0,
                employees: newStage === 'complete' ? PRICING.employees.calculate(l.building.floors || 1) : 0,
              }
            };
        }
        return l;
      }));
    }, 1000);
  };

  const handlePlantCrop = useCallback((land: Land, cropType: CropType) => {
    const cropCost = PRICING.crop.plantingCost;
    
    if (player.balance < cropCost) {
      toast({
        title: "Insufficient Funds",
        description: `Crop planting costs $${cropCost.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    setPlayer(prev => ({ ...prev, balance: prev.balance - cropCost }));

    const harvestDate = new Date();
    harvestDate.setDate(harvestDate.getDate() + PRICING.crop.growthDays);

    setLands(prev => prev.map(l => 
      l.id === land.id ? {
        ...l,
        building: {
          type: 'farm',
          stage: 'complete',
          constructionProgress: 100,
          crop: {
            type: cropType,
            planted: new Date(),
            growthStage: 0,
            harvestDate,
            marketPrice: PRICING.crop.baseMarketPrice + Math.random() * PRICING.crop.marketPriceRange,
          }
        }
      } : l
    ));

    toast({
      title: "Crop Planted",
      description: `${cropType} planted successfully. Ready to harvest in 7 days.`,
    });

    // Simulate crop growth
    const growthInterval = setInterval(() => {
      setLands(prev => prev.map(l => {
        if (l.id === land.id && l.building?.crop && l.building.crop.growthStage < 100) {
          const newGrowth = Math.min(100, l.building.crop.growthStage + (100 / PRICING.crop.growthDays));
          
          if (newGrowth >= 100) {
            clearInterval(growthInterval);
            toast({
              title: "Crop Ready!",
              description: `Your ${l.building.crop.type} is ready to harvest!`,
            });
          }
          
          return {
            ...l,
            building: l.building ? {
              ...l.building,
              crop: {
                ...l.building.crop,
                growthStage: newGrowth,
                yieldAmount: newGrowth >= 100 ? 100 + Math.floor(Math.random() * 50) : undefined,
              }
            } : null
          };
        }
        return l;
      }));
    }, 1000);
  }, [player.balance, toast]);

  const handleHarvestCrop = (land: Land) => {
    if (!land.building?.crop?.yieldAmount) return;

    const earnings = land.building.crop.marketPrice * (land.building.crop.yieldAmount / 100);
    
    setPlayer(prev => ({
      ...prev,
      balance: prev.balance + earnings,
      monthlyIncome: prev.monthlyIncome + earnings,
    }));

    setLands(prev => prev.map(l => 
      l.id === land.id ? {
        ...l,
        building: {
          ...l.building!,
          crop: undefined,
        }
      } : l
    ));

    toast({
      title: "Crop Harvested!",
      description: `Earned $${earnings.toLocaleString()} from your harvest.`,
    });
  };

  const handleListForLease = (land: Land, monthlyRent: number) => {
    setLands(prev => prev.map(l => 
      l.id === land.id ? {
        ...l,
        forLease: true,
        leasePrice: monthlyRent,
      } : l
    ));

    toast({
      title: "Listed for Lease",
      description: `Property listed for $${monthlyRent.toLocaleString()}/month.`,
    });
  };

  const handleTakeLease = (land: Land) => {
    if (!land.leasePrice) return;

    if (player.balance < land.leasePrice) {
      toast({
        title: "Insufficient Funds",
        description: `Monthly rent is $${land.leasePrice.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    setPlayer(prev => ({
      ...prev,
      balance: prev.balance - land.leasePrice,
      leasedLands: [...prev.leasedLands, land.id],
    }));

    setLands(prev => prev.map(l => 
      l.id === land.id ? {
        ...l,
        building: l.building ? {
          ...l.building,
          lease: {
            tenant: 'player',
            monthlyRent: land.leasePrice!,
            startDate: new Date(),
            terms: 'Standard lease agreement',
          }
        } : null
      } : l
    ));

    toast({
      title: "Lease Activated",
      description: `You are now leasing this property for $${land.leasePrice.toLocaleString()}/month.`,
    });
  };

  const handleSelectLand = (land: Land) => {
    setSelectedLand(land);
    // Open panel with smooth animation
    if (!isPanelOpen) {
      setIsPanelOpen(true);
    }
  };

  const handleListForSale = useCallback(async (land: Land, price: number) => {
    if (!isEVMConnected || !evmAddress) {
      try {
        await connectEVM();
      } catch (error: any) {
        toast({
          title: "Wallet Not Connected",
          description: error.message || "Please connect your MetaMask wallet to list for sale.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (!evmAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to list for sale.",
        variant: "destructive",
      });
      return;
    }

    if (!land.landDataObjectId) {
      toast({
        title: "Invalid Land",
        description: "This land does not have a valid blockchain record.",
        variant: "destructive",
      });
      return;
    }

    // Check if already listed
    const existingListing = await loadListingByLandDataObjectId(land.landDataObjectId);
    if (existingListing) {
      toast({
        title: "Already Listed",
        description: "This plot is already listed for sale.",
        variant: "destructive",
      });
      return;
    }

    // Check if plot has an active permit
    const permits = await loadPermitsByWallet(accountAddress);
    const activePermit = permits.find(
      (p: any) => 
        p.land_data_object_id === land.landDataObjectId && 
        (p.status === 'pending' || p.status === 'approved')
    );
    
    if (activePermit) {
      toast({
        title: "Cannot List",
        description: "This plot has an active permit application. Cannot list for sale.",
        variant: "destructive",
      });
      return;
    }

    if (isMinting) {
      toast({
        title: "Transaction Pending",
        description: "Please wait for the current transaction to complete.",
        variant: "destructive",
      });
      return;
    }

    if (price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Price must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Processing Listing",
      description: "Please approve the transaction in your wallet...",
    });

    try {
      // Create and execute list for sale transaction (EVM - transaction is sent immediately)
      // Use the actual contract landId stored in landDataObjectId (this is the incremental ID from minting)
      const landId = land.landDataObjectId;
      if (!landId) {
        throw new Error('Land does not have a valid contract landId');
      }
      const tx = await createListForSaleTransaction(landId, price);

      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      // Wait for transaction to complete
      const listingResult = await waitForListForSaleTransaction(tx);

      if (!listingResult) {
        throw new Error('Failed to process listing transaction result');
      }

      // Save listing to database
      const listingId = listingResult.listingId || `listing-${listingResult.digest}`;
      await saveListing({
        listingId,
        landId: land.id,
        landDataObjectId: land.landDataObjectId,
        sellerWalletAddress: evmAddress,
        price,
        x: land.x,
        y: land.y,
        zoneType: land.zone,
        transactionDigest: listingResult.digest,
      });

      toast({
        title: "Listed for Sale!",
        description: `Your plot has been listed for ${price} RTOKENs. Visit the Marketplace to see it.`,
      });

      reset();
    } catch (error: any) {
      console.error("Error processing listing:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to list for sale. Please try again.",
        variant: "destructive",
      });
      reset();
    }
  }, [evmAddress, isEVMConnected, isMinting, reset, toast, connectEVM, accountAddress]);

  // Billboard positions mapped to land IDs (approximate mapping based on 3D positions)
  // Billboard at [-4, 0, -4] -> land around (11, 11)
  // Billboard at [5, 0, 5] -> land around (20, 20)
  // Billboard at [-10, 0, 8] -> land around (5, 23)
  const BILLBOARD_LAND_IDS = ['11-11', '20-20', '5-23'];

  // Track which billboard lands have been loaded to prevent infinite loops (use ref to avoid dependency issues)
  const loadedBillboardIdsRef = useRef<Set<string>>(new Set());

  // Extract billboard land data for dependency tracking
  const billboardLandData = useMemo(() => {
    return BILLBOARD_LAND_IDS.map(landId => {
      const land = lands.find(l => l.id === landId);
      return {
        landId,
        landDataObjectId: land?.landDataObjectId || null
      };
    });
  }, [lands]);

  // Create a string key from billboard land data to track when we need to reload
  const billboardDataKey = useMemo(() => {
    return billboardLandData.map(({ landId, landDataObjectId }) => 
      `${landId}:${landDataObjectId || 'none'}`
    ).join('|');
  }, [billboardLandData]);

  // Load advertising data for billboard lands (for all users, not just owner)
  useEffect(() => {
    const loadAdvertisingData = async () => {
      const newLoadedIds = new Set<string>();

      for (const landId of BILLBOARD_LAND_IDS) {
        const land = lands.find(l => l.id === landId);
        
        // Mark as billboard if not already marked
        if (land && !land.hasBillboard) {
          setLands(prev => prev.map(l => {
            if (l.id === landId && !l.hasBillboard) {
              return { ...l, hasBillboard: true };
            }
            return l;
          }));
        }

        // Only load advertising if we have landDataObjectId and haven't loaded it yet
        if (land?.landDataObjectId) {
          const cacheKey = `${landId}-${land.landDataObjectId}`;
          
          // Skip if we've already loaded this specific combination
          if (loadedBillboardIdsRef.current.has(cacheKey)) {
            newLoadedIds.add(cacheKey);
            continue;
          }

          try {
            const advertising = await loadAdvertisingByLandDataObjectId(land.landDataObjectId);
            newLoadedIds.add(cacheKey);

            if (advertising) {
              setLands(prev => prev.map(l => {
                if (l.id === landId) {
                  // Only update if something actually changed
                  const currentImageUrl = l.advertisingImageUrl;
                  const currentListingId = l.advertisingListing?.listingId;
                  const newImageUrl = advertising.status === 'leased' ? advertising.image_url : undefined;
                  const newListingId = advertising.status === 'available' ? advertising.listing_id : undefined;
                  
                  if (currentImageUrl === newImageUrl && currentListingId === newListingId && l.hasBillboard) {
                    return l; // No change, return same object
                  }
                  
                  return {
                    ...l,
                    hasBillboard: true,
                    advertisingImageUrl: newImageUrl,
                    advertisingListing: advertising.status === 'available' ? {
                      listingId: advertising.listing_id,
                      price: advertising.price,
                      status: advertising.status,
                    } : undefined,
                  };
                }
                return l;
              }));
            }
          } catch (error) {
            console.error(`Error loading advertising for ${landId}:`, error);
            // Still mark as loaded to prevent retrying immediately
            newLoadedIds.add(cacheKey);
          }
        }
      }

      // Update loaded IDs only if there are new ones
      if (newLoadedIds.size > 0) {
        newLoadedIds.forEach(id => loadedBillboardIdsRef.current.add(id));
      }
    };

    loadAdvertisingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billboardDataKey]); // Only reload when billboard land data actually changes

  const handleListBillboard = useCallback(async (land: Land, price: number) => {
    if (!account?.address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to list billboard.",
        variant: "destructive",
      });
      return;
    }

    if (!land.landDataObjectId) {
      toast({
        title: "Invalid Land",
        description: "This land does not have a valid blockchain record.",
        variant: "destructive",
      });
      return;
    }

    if (!land.hasBillboard) {
      toast({
        title: "No Billboard",
        description: "This plot does not have a billboard.",
        variant: "destructive",
      });
      return;
    }

    // Check if already listed
    const existingListing = await loadAdvertisingByLandDataObjectId(land.landDataObjectId);
    if (existingListing && existingListing.status === 'available') {
      toast({
        title: "Already Listed",
        description: "This billboard is already listed for advertising.",
        variant: "destructive",
      });
      return;
    }

    if (isMinting) {
      toast({
        title: "Transaction Pending",
        description: "Please wait for the current transaction to complete.",
        variant: "destructive",
      });
      return;
    }

    if (price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Price must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Processing Listing",
      description: "Please approve the transaction in your wallet...",
    });

    try {
      const tx = createListForAdvertisingTransaction(land.landDataObjectId, price, account.address);

      // Prepare transaction for Enoki wallets (set OCT gas payment if needed)
      await prepareTransactionForEnoki(tx, suiClient, account.address, wallet?.currentWallet || null);

      signAndExecute(
        {
          transaction: tx as any,
        },
        {
          onError: (error) => {
            console.error("List Billboard Failed:", error);
            
            // Check if it's an epoch expiration error for Enoki wallets
            if (isEpochExpirationError(error) && wallet?.currentWallet && isEnokiWallet(wallet.currentWallet)) {
              const errorMessage = getEpochExpirationMessage(error);
              console.error("Enoki Session Expired:", errorMessage);
              toast({
                title: "Session Expired",
                description: errorMessage + " Please disconnect and reconnect your wallet to continue.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Transaction Failed",
                description: error.message || "Failed to list billboard. Please try again.",
                variant: "destructive",
              });
            }
            reset();
          },
        onSuccess: async ({ digest }) => {
          try {
            const listingResult = await waitForListForAdvertisingTransaction(digest);
            if (!listingResult) {
              throw new Error('Failed to process listing transaction result');
            }

            const listingId = listingResult.listingId || `advertising-${digest}`;
            await saveAdvertisingListing({
              listingId,
              landId: land.id,
              landDataObjectId: land.landDataObjectId,
              ownerWalletAddress: accountAddress,
              price,
              transactionDigest: digest,
            });

            // Update local state
            setLands(prev => prev.map(l => 
              l.id === land.id ? {
                ...l,
                advertisingListing: {
                  listingId,
                  price,
                  status: 'available' as const,
                }
              } : l
            ));

            toast({
              title: "Billboard Listed!",
              description: `Your billboard has been listed for ${price} RTOKENs.`,
            });

            reset();
          } catch (error: any) {
            console.error("Error processing listing:", error);
            toast({
              title: "Error Processing Listing",
              description: error.message || "Transaction completed but failed to update. Please refresh.",
              variant: "destructive",
            });
          }
        },
      }
    );
    } catch (error: any) {
      console.error("Error creating list transaction:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to create list transaction. Please try again.",
        variant: "destructive",
      });
      reset();
    }
  }, [account, wallet, isMinting, signAndExecute, reset, toast]);

  const handleLeaseBillboard = useCallback(async (land: Land, imageUrl: string) => {
    if (!account?.address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to lease billboard.",
        variant: "destructive",
      });
      return;
    }

    if (!land.landDataObjectId || !land.advertisingListing) {
      toast({
        title: "Invalid Listing",
        description: "This billboard is not available for advertising.",
        variant: "destructive",
      });
      return;
    }

    // Check RTOKEN balance from user's plots (not the billboard plot)
    const price = land.advertisingListing.price;
    const userPlots = await loadPlotsByWallet(accountAddress);
    const totalUserRtokens = userPlots.reduce((sum, plot) => sum + (plot.rtokens || 0), 0);
    
    if (totalUserRtokens < price) {
      toast({
        title: "Insufficient RTOKENs",
        description: `You need ${price} RTOKENs. You have ${totalUserRtokens} RTOKENs across all your plots.`,
        variant: "destructive",
      });
      return;
    }

    if (isMinting) {
      toast({
        title: "Transaction Pending",
        description: "Please wait for the current transaction to complete.",
        variant: "destructive",
      });
      return;
    }

    if (!imageUrl || imageUrl.trim() === '') {
      toast({
        title: "Invalid Image URL",
        description: "Please provide a valid image URL.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Processing Lease",
      description: "Please approve the transaction in your wallet...",
    });

    try {
      const tx = await createLeaseAdvertisingTransaction(land.landDataObjectId, imageUrl, account.address);

      // Prepare transaction for Enoki wallets (set OCT gas payment if needed)
      await prepareTransactionForEnoki(tx, suiClient, account.address, wallet?.currentWallet || null);

      signAndExecute(
        {
          transaction: tx as any,
        },
        {
          onError: (error) => {
            console.error("Lease Billboard Failed:", error);
            
            // Check if it's an epoch expiration error for Enoki wallets
            if (isEpochExpirationError(error) && wallet?.currentWallet && isEnokiWallet(wallet.currentWallet)) {
              const errorMessage = getEpochExpirationMessage(error);
              console.error("Enoki Session Expired:", errorMessage);
              toast({
                title: "Session Expired",
                description: errorMessage + " Please disconnect and reconnect your wallet to continue.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Transaction Failed",
                description: error.message || "Failed to lease billboard. Please try again.",
                variant: "destructive",
              });
            }
            reset();
          },
        onSuccess: async ({ digest }) => {
          try {
            const leaseResult = await waitForLeaseAdvertisingTransaction(digest);
            if (!leaseResult) {
              throw new Error('Failed to process lease transaction result');
            }

            // Update advertising status
            await updateAdvertisingStatus(
              land.advertisingListing!.listingId,
              'leased',
              account.address,
              imageUrl,
              digest
            );

            // Transfer RTOKENs: deduct from advertiser's plots, add to owner
            // Deduct from user's plots (distribute across plots if needed)
            let remainingToDeduct = price;
            const updatedUserPlots: { landId: string; newRtokens: number }[] = [];
            
            for (const plot of userPlots) {
              if (remainingToDeduct <= 0) break;
              const currentRtokens = plot.rtokens || 0;
              if (currentRtokens > 0) {
                const deduction = Math.min(remainingToDeduct, currentRtokens);
                const newBalance = currentRtokens - deduction;
                remainingToDeduct -= deduction;
                const updateResult = await updatePlotRTokenBalance(plot.landDataObjectId!, newBalance);
                if (updateResult.success) {
                  updatedUserPlots.push({
                    landId: plot.landId,
                    newRtokens: updateResult.updatedRtokens ?? newBalance,
                  });
                }
              }
            }

            // Add to owner's balance - use database function
            let ownerPlotUpdated = false;
            if (land.ownerWalletAddress) {
              // Get owner's plots and add to first one
              const ownerPlots = await loadPlotsByWallet(land.ownerWalletAddress);
              if (ownerPlots.length > 0) {
                const firstPlot = ownerPlots[0];
                const currentRtokens = firstPlot.rtokens || 0;
                const updateResult = await updatePlotRTokenBalance(firstPlot.landDataObjectId, currentRtokens + price);
                if (updateResult.success) {
                  ownerPlotUpdated = true;
                  // Update owner's plot in local state if it's visible
                  setLands(prev => prev.map(l => {
                    if (l.landDataObjectId === firstPlot.landDataObjectId) {
                      return {
                        ...l,
                        rtokens: updateResult.updatedRtokens ?? (currentRtokens + price),
                      };
                    }
                    return l;
                  }));
                }
              }
            }

            // Update local state for user's plots and billboard
            setLands(prev => prev.map(l => {
              // Update user's plots with new RTOKEN balances
              const userPlotUpdate = updatedUserPlots.find(up => up.landId === l.id);
              if (userPlotUpdate) {
                return {
                  ...l,
                  rtokens: userPlotUpdate.newRtokens,
                };
              }
              // Update billboard land
              if (l.id === land.id) {
                return {
                  ...l,
                  advertisingImageUrl: imageUrl,
                  advertisingListing: undefined,
                };
              }
              return l;
            }));

            // Update total RTOKENs
            const newTotal = await getTotalRTokenBalance(accountAddress);
            setTotalRTokens(newTotal);

            toast({
              title: "Billboard Leased!",
              description: `Your advertisement is now live on the billboard!`,
            });

            reset();
          } catch (error: any) {
            console.error("Error processing lease:", error);
            toast({
              title: "Error Processing Lease",
              description: error.message || "Transaction completed but failed to update. Please refresh.",
              variant: "destructive",
            });
          }
        },
      }
    );
    } catch (error: any) {
      console.error("Error creating lease transaction:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to create lease transaction. Please try again.",
        variant: "destructive",
      });
      reset();
    }
  }, [account, wallet, isMinting, signAndExecute, reset, toast]);

  // Sync selectedLand with lands updates, but only if something actually changed
  useEffect(() => {
    if (selectedLand) {
      const updatedLand = lands.find(l => l.id === selectedLand.id);
      if (updatedLand) {
        // Only update if something actually changed to prevent infinite loops
        const hasChanged = JSON.stringify(updatedLand) !== JSON.stringify(selectedLand);
        if (hasChanged) {
          setSelectedLand(updatedLand);
        }
      }
    }
  }, [lands, selectedLand?.id]);

  // Filter lands based on showOwnedOnly toggle - MUST be before any conditional returns
  const displayedLands = useMemo(() => {
    if (!showOwnedOnly || !account) {
      return lands;
    }
    return lands.filter(land => ownedPlotIds.has(land.id));
  }, [lands, showOwnedOnly, ownedPlotIds, account]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading game...</div>
          <div className="text-sm text-muted-foreground">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">

      <GameHeader 
        player={player} 
        showOwnedOnly={showOwnedOnly}
        onToggleOwnedOnly={setShowOwnedOnly}
        totalRTokens={totalRTokens}
      />
      
      {/* Minimap */}
      {camera && <Minimap lands={lands} camera={camera} size={200} panelOpen={isPanelOpen} />}
      
      {/* Instructions Overlay */}
      {showInstructions && (
        <div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 text-white p-6 rounded-lg max-w-md"
          style={{ pointerEvents: 'auto' }}
        >
          <h2 className="text-2xl font-bold mb-4">First-Person Controls</h2>
          <div className="space-y-2 text-sm">
            <p><strong>W/S</strong> - Move forward/backward</p>
            <p><strong>A/D</strong> - Rotate left/right</p>
            <p><strong>Left Click + Drag</strong> - Look around (continuous rotation)</p>
            <p><strong>Left Click</strong> - Select plots</p>
            <p><strong>Middle Mouse</strong> - Toggle pointer lock</p>
            <p><strong>Space</strong> - Jump</p>
            <p><strong>Q/E</strong> - Move camera up/down</p>
            <p><strong>T</strong> - Teleport (click on minimap)</p>
            <p className="mt-4 text-xs text-gray-400">
              Roads allow faster movement. Off-road is slower.
            </p>
          </div>
          <button
            onClick={() => setShowInstructions(false)}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Got it!
          </button>
        </div>
      )}
      
      <div className="pt-20 h-screen flex relative z-10">
        {/* Main 3D Canvas */}
        <div className="flex-1 relative">
          <CityCanvas 
            lands={displayedLands}
            selectedLand={selectedLand}
            onSelectLand={handleSelectLand}
            ownedPlotIds={ownedPlotIds}
          />
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="fixed z-40 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          style={{
            right: isPanelOpen ? '400px' : '20px',
            top: '100px',
            background: 'linear-gradient(135deg, rgba(26, 77, 77, 0.95) 0%, rgba(20, 60, 60, 0.95) 100%)',
            border: '1px solid rgba(125, 211, 192, 0.3)',
            color: '#7dd3c0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(125, 211, 192, 0.1)',
            transition: 'right 0.3s ease-in-out'
          }}
          aria-label={isPanelOpen ? 'Close panel' : 'Open panel'}
        >
          {isPanelOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>

        {/* Side Panel */}
        <div 
          className={`ui-panel fixed right-0 top-20 bottom-0 w-96 p-4 overflow-y-auto z-30`}
          style={{
            transform: isPanelOpen ? 'translateX(0)' : 'translateX(100%)',
            background: 'transparent',
            transition: 'transform 120ms cubic-bezier(0.4, 0, 0.2, 1), opacity 120ms ease-in-out',
            opacity: isPanelOpen ? 1 : 0,
            pointerEvents: isPanelOpen ? 'auto' : 'none'
          }}
          onMouseEnter={() => {
            // Unlock pointer when hovering over panel
            if (document.pointerLockElement) {
              document.exitPointerLock();
            }
          }}
        >
          <LandPanel 
            land={selectedLand}
            onPurchase={handlePurchaseLand}
            onApplyPermit={handleApplyPermit}
            onHireContractor={handleHireContractor}
            onPlantCrop={handlePlantCrop}
            onHarvestCrop={handleHarvestCrop}
            onListForLease={handleListForLease}
            onTakeLease={handleTakeLease}
            onListForSale={handleListForSale}
            onListBillboard={handleListBillboard}
            onLeaseBillboard={handleLeaseBillboard}
            player={player}
            isMinting={isMinting}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;


