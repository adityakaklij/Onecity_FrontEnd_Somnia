import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useEVMWallet } from '@/hooks/useEVMWallet';
import { 
  loadAllListings, 
  updateListingStatus,
  updatePlotOwnership,
  getTotalRTokenBalance
} from '@/lib/database';
import { 
  createPurchaseListingTransaction, 
  waitForPurchaseListingTransaction 
} from '@/lib/marketplaceService';
import { 
  ShoppingBag, 
  MapPin, 
  Coins, 
  ArrowLeft,
  Loader2,
  Home,
  Building2,
  Factory,
  Sprout,
  Search
} from 'lucide-react';
import { ZoneType } from '@/types/game';
import { GameHeader } from '@/components/game/GameHeader';

const ZONE_IMAGES: Record<ZoneType, string> = {
  agricultural: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/Agirculture.jpg",
  residential: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/Residential.jpg",
  commercial: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/commericial.jpg",
  industrial: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/Industrial.jpg",
  billboard: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeihmcayqd2jqltlidtiwi73r2tgw35xu3fscx6ikbiarvlgwobaqva/Billboard.jpg",
  park: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeiagwlj4lq3zox2jwgarqll2epq6p2jolz7dug3oqsgepvn4qpfoea/Agriculture.png", // Default for park
  road: "https://purple-sheer-shrimp-152.mypinata.cloud/ipfs/bafybeiagwlj4lq3zox2jwgarqll2epq6p2jolz7dug3oqsgepvn4qpfoea/Agriculture.png", // Default for road

};

const ZONE_ICONS: Record<ZoneType, any> = {
  residential: Home,
  commercial: Building2,
  industrial: Factory,
  agricultural: Sprout,
  park: Sprout,
  road: Building2,
  billboard: Building2,
};

const ZONE_LABELS: Record<ZoneType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  agricultural: 'Agricultural',
  park: 'Park',
  road: 'Road',
  billboard: 'Billboard',
};

const Marketplace = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const suiAccount = useCurrentAccount(); // Keep for compatibility
  const { account, address: evmAddress, isConnected: isEVMConnected, connect: connectEVM } = useEVMWallet();
  const { mutate: signAndExecute, isPending: isPurchasingSui, reset } = useSignAndExecuteTransaction();
  
  // Use EVM wallet address for EVM transactions
  const accountAddress = evmAddress || suiAccount?.address;
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingListingId, setPurchasingListingId] = useState<string | null>(null);
  const [totalRTokens, setTotalRTokens] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);

  useEffect(() => {
    loadListings();
    if (accountAddress) {
      loadRTokenBalance();
    }
  }, [accountAddress]);

  const loadRTokenBalance = async () => {
    if (!accountAddress) return;
    const balance = await getTotalRTokenBalance(accountAddress);
    setTotalRTokens(balance);
  };

  const loadListings = async () => {
    setLoading(true);
    try {
      const allListings = await loadAllListings();
      setListings(allListings);
    } catch (error) {
      console.error('Error loading listings:', error);
      toast({
        title: "Error",
        description: "Failed to load listings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (listing: any) => {
    if (!isEVMConnected || !evmAddress) {
      try {
        await connectEVM();
      } catch (error: any) {
        toast({
          title: "Wallet Not Connected",
          description: error.message || "Please connect your MetaMask wallet to purchase.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (!evmAddress) {
      return;
    }

    // Check if user is the seller
    if (listing.seller_wallet_address === evmAddress) {
      toast({
        title: "Cannot Purchase",
        description: "You cannot purchase your own listing.",
        variant: "destructive",
      });
      return;
    }

    // Check RTOKEN balance
    if (totalRTokens < listing.price) {
      toast({
        title: "Insufficient RTOKENs",
        description: `You need ${listing.price} RTOKENs. You have ${totalRTokens} RTOKENs.`,
        variant: "destructive",
      });
      return;
    }

    setPurchasingListingId(listing.listing_id);

    toast({
      title: "Processing Purchase",
      description: "Please approve the transaction in your wallet...",
    });

    try {
      // Create and send transaction (EVM - transaction is sent immediately)
      // For EVM, landId should be a number
      const landId = typeof listing.listing_id === 'string' ? parseInt(listing.listing_id) : listing.listing_id;
      const tx = await createPurchaseListingTransaction(landId);

      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      const result = await waitForPurchaseListingTransaction(tx);
      if (!result) {
        throw new Error('Failed to process purchase transaction');
      }

      // Update listing status to sold
      await updateListingStatus(
        listing.listing_id,
        'sold',
        evmAddress,
        result.digest
      );

      // Update plot ownership and transfer RTOKENs
      await updatePlotOwnership(
        listing.land_data_object_id,
        evmAddress, // new owner (buyer)
        listing.seller_wallet_address, // old owner (seller)
        listing.price,
        result.digest
      );

            // Reload listings and balance
            await loadListings();
            await loadRTokenBalance();
            
            // Trigger a page reload to update ownership display
            window.location.reload();

            toast({
              title: "Purchase Successful!",
              description: `You successfully purchased the plot for ${listing.price} RTOKENs!`,
            });

      setPurchasingListingId(null);
      reset();
    } catch (error: any) {
      console.error("Error processing purchase:", error);
      setPurchasingListingId(null);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to purchase. Please try again.",
        variant: "destructive",
      });
      reset();
    }
  };

  const getZoneImage = (zoneType: string): string => {
    return ZONE_IMAGES[zoneType as ZoneType] || ZONE_IMAGES.agricultural;
  };

  const getZoneIcon = (zoneType: string) => {
    const Icon = ZONE_ICONS[zoneType as ZoneType] || Home;
    return Icon;
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = 
      listing.land_id?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.x_coordinate?.toString().includes(searchQuery) ||
      listing.y_coordinate?.toString().includes(searchQuery) ||
      ZONE_LABELS[listing.zone_type as ZoneType]?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || 
      ZONE_LABELS[listing.zone_type as ZoneType] === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Residential', 'Commercial', 'Industrial', 'Agricultural', 'Billbboard'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1f0a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 0.5px, transparent 0)`,
            backgroundSize: '30px 30px'
          }}></div>
        </div>
        <div className="text-center relative z-10">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white" />
          <div className="text-lg font-semibold mb-2 text-white">Loading marketplace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <GameHeader 
        player={{
          id: 'player',
          name: 'Player',
          balance: 0,
          ownedLands: [],
          leasedLands: [],
          monthlyIncome: 0,
        }}
        showOwnedOnly={showOwnedOnly}
        onToggleOwnedOnly={setShowOwnedOnly}
        totalRTokens={totalRTokens}
      />
      
      {/* Dark green base background */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-950 via-green-900 to-green-950"></div>
      
      {/* Subtle light speckles/confetti pattern - matching reference image */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0),
                           radial-gradient(circle at 8px 8px, rgba(255,255,255,0.12) 0.8px, transparent 0),
                           radial-gradient(circle at 15px 15px, rgba(255,255,255,0.18) 1px, transparent 0),
                           radial-gradient(circle at 22px 22px, rgba(255,255,255,0.1) 0.7px, transparent 0),
                           radial-gradient(circle at 30px 30px, rgba(255,255,255,0.14) 0.9px, transparent 0)`,
          backgroundSize: '40px 40px, 50px 50px, 35px 35px, 45px 45px, 38px 38px'
        }}></div>
      </div>
      
      {/* Additional glitter/confetti particles scattered across */}
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 10% 20%, rgba(255,255,255,0.2) 1.5px, transparent 1.5px),
                           radial-gradient(circle at 25% 35%, rgba(255,255,255,0.15) 1px, transparent 1px),
                           radial-gradient(circle at 45% 15%, rgba(255,255,255,0.18) 1.2px, transparent 1.2px),
                           radial-gradient(circle at 60% 50%, rgba(255,255,255,0.16) 1px, transparent 1px),
                           radial-gradient(circle at 75% 30%, rgba(255,255,255,0.2) 1.3px, transparent 1.3px),
                           radial-gradient(circle at 85% 65%, rgba(255,255,255,0.14) 1px, transparent 1px),
                           radial-gradient(circle at 30% 70%, rgba(255,255,255,0.17) 1.1px, transparent 1.1px),
                           radial-gradient(circle at 55% 85%, rgba(255,255,255,0.19) 1.4px, transparent 1.4px),
                           radial-gradient(circle at 15% 80%, rgba(255,255,255,0.13) 0.9px, transparent 0.9px),
                           radial-gradient(circle at 90% 25%, rgba(255,255,255,0.21) 1.5px, transparent 1.5px)`,
          backgroundSize: '200px 200px, 180px 180px, 220px 220px, 190px 190px, 210px 210px, 175px 175px, 195px 195px, 205px 205px, 185px 185px, 215px 215px',
          backgroundPosition: '0% 0%, 10% 20%, 20% 10%, 30% 40%, 40% 25%, 50% 55%, 60% 70%, 70% 80%, 80% 15%, 90% 30%'
        }}></div>
      </div>
      
      {/* Ethereal glow effect for digital feel */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-300/15 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 pt-24">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3">Marketplace</h1>
          <p className="text-white/80 text-lg">Browse and purchase listed plots with RTOKENS</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search plots, zones, or coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-6 text-lg rounded-xl bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/30"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className={`rounded-full px-6 py-2 ${
                selectedCategory === category
                  ? 'bg-green-700 hover:bg-green-600 text-white border-green-600'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/20'
              }`}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-white/60" />
              <p className="text-lg font-semibold mb-2 text-white">No Listings Available</p>
              <p className="text-white/60">
                There are no plots listed for sale at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {filteredListings.map((listing) => {
              const ZoneIcon = getZoneIcon(listing.zone_type);
              const isPurchasing = purchasingListingId === listing.listing_id;
              const canPurchase = accountAddress && 
                                 listing.seller_wallet_address !== accountAddress &&
                                 totalRTokens >= listing.price;

              return (
                <Card key={listing.id} className="bg-white/10 border-green-400/30 overflow-hidden hover:shadow-xl transition-all backdrop-blur-sm">
                  <div className="relative">
                    <img
                      src={getZoneImage(listing.zone_type)}
                      alt={listing.zone_type}
                      className="w-full h-56 object-cover"
                    />
                    <Badge className="absolute top-3 right-3 bg-green-800 text-white border-0">
                      {ZONE_LABELS[listing.zone_type as ZoneType]}
                    </Badge>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-xl font-bold text-white">Plot #{listing.land_id}</h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Location</span>
                        <span className="font-medium text-white">
                          ({listing.x_coordinate}, {listing.y_coordinate})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Price</span>
                        <span className="font-bold text-yellow-400 flex items-center gap-1">
                          {listing.price.toLocaleString()} RTOKEN
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/70">Listed</span>
                        <span className="font-medium text-white">
                          {new Date(listing.listed_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {!account ? (
                      <Button
                        variant="outline"
                        className="w-full mt-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        disabled
                      >
                        Connect Wallet to Purchase
                      </Button>
                    ) : listing.seller_wallet_address === accountAddress ? (
                      <Button
                        variant="outline"
                        className="w-full mt-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        disabled
                      >
                        Your Listing
                      </Button>
                    ) : totalRTokens < listing.price ? (
                      <Button
                        variant="outline"
                        className="w-full mt-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        disabled
                      >
                        Insufficient RTOKENs
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handlePurchase(listing)}
                        disabled={isPurchasing}
                        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isPurchasing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Purchase
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;

