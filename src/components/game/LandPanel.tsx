import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Land, BuildingType, ZoneType, Contractor, CropType, Player } from "@/types/game";
import { useState } from "react";
import { getAllContractors, PRICING } from '@/config/pricing';
import { 
  Home, Building2, Factory, Sprout, 
  Store, Building, Warehouse, TreePine,
  Zap, ShoppingBag, HardHat, Users,
  TrendingUp, DollarSign, FileCheck, Clock,
  Hammer, Leaf, HandCoins, Key, Vote, ExternalLink, Coins,
  MapPin, Briefcase, Wrench, Crop, Factory as FactoryIcon
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface LandPanelProps {
  land: Land | null;
  onPurchase: (land: Land) => void;
  onApplyPermit: (land: Land, description: string) => void;
  onHireContractor: (land: Land, contractor: Contractor) => void;
  onPlantCrop: (land: Land, cropType: CropType) => void;
  onHarvestCrop: (land: Land) => void;
  onListForLease: (land: Land, monthlyRent: number) => void;
  onTakeLease: (land: Land) => void;
  onListForSale?: (land: Land, price: number) => void;
  onListBillboard?: (land: Land, price: number) => void;
  onLeaseBillboard?: (land: Land, imageUrl: string) => void;
  player: Player;
  isMinting?: boolean;
}

const ZONE_ICONS: Record<ZoneType, any> = {
  residential: Home,
  commercial: Store,
  industrial: Factory,
  agricultural: Sprout,
  park: TreePine,
  road: Building2,
  billboard: Building2,
};

const ZONE_LABELS: Record<ZoneType, string> = {
  residential: 'Residential Zone',
  commercial: 'Commercial Zone',
  industrial: 'Industrial Zone',
  agricultural: 'Agricultural Zone',
  park: 'Public Park',
  road: 'Road',
  billboard: 'Billboard Zone',
};

const BUILDING_OPTIONS: Record<ZoneType, { type: BuildingType; label: string; baseFloors: number; icon: any }[]> = {
  residential: [
    { type: 'house', label: 'Single Family House', baseFloors: 2, icon: Home },
    { type: 'apartment', label: 'Apartment Complex', baseFloors: 5, icon: Building2 },
    { type: 'skyscraper', label: 'Luxury Skyscraper', baseFloors: 25, icon: Building },
  ],
  commercial: [
    { type: 'shop', label: 'Retail Shop', baseFloors: 1, icon: Store },
    { type: 'mall', label: 'Shopping Mall', baseFloors: 3, icon: ShoppingBag },
    { type: 'office', label: 'Office Building', baseFloors: 15, icon: Building2 },
  ],
  industrial: [
    { type: 'factory', label: 'Manufacturing Factory', baseFloors: 2, icon: Factory },
    { type: 'warehouse', label: 'Storage Warehouse', baseFloors: 1, icon: Warehouse },
    { type: 'powerplant', label: 'Power Plant', baseFloors: 3, icon: Zap },
  ],
  agricultural: [
    { type: 'farm', label: 'Crop Farm', baseFloors: 1, icon: Sprout },
    { type: 'greenhouse', label: 'Greenhouse', baseFloors: 1, icon: TreePine },
    { type: 'silo', label: 'Grain Silo', baseFloors: 3, icon: Warehouse },
  ],
  park: [],
  road: [],
  billboard: [],
};

const CONTRACTORS: Contractor[] = getAllContractors();

const CROP_OPTIONS: CropType[] = ['wheat', 'corn', 'rice', 'vegetables', 'fruits'];

export const LandPanel = ({ 
  land, 
  onPurchase, 
  onApplyPermit, 
  onHireContractor, 
  onPlantCrop,
  onHarvestCrop,
  onListForLease,
  onTakeLease,
  onListForSale,
  onListBillboard,
  onLeaseBillboard,
  player,
  isMinting = false
}: LandPanelProps) => {
  const navigate = useNavigate();
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType>(null);
  const [floors, setFloors] = useState(1);
  const [permitDescription, setPermitDescription] = useState('');
  const [leaseAmount, setLeaseAmount] = useState(5000);
  const [salePrice, setSalePrice] = useState(1000);
  const [billboardPrice, setBillboardPrice] = useState(100);
  const [adImageUrl, setAdImageUrl] = useState('');

  if (!land) {
    return (
      <Card 
        className="border-0 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(26, 77, 77, 0.95) 0%, rgba(20, 60, 60, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(125, 211, 192, 0.2)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(125, 211, 192, 0.1)'
        }}
      >
        <CardHeader className="pb-4">
          <CardTitle 
            className="text-2xl font-bold"
            style={{ color: '#7dd3c0' }}
          >
            City Builder
          </CardTitle>
          <CardDescription 
            className="text-sm mt-2"
            style={{ color: '#a8e6d9' }}
          >
            Select a plot to view details and start development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm" style={{ color: '#a8e6d9' }}>
            <p className="mb-4 font-semibold flex items-center gap-2 text-base" style={{ color: '#7dd3c0' }}>
              <Building2 className="w-5 h-5" />
              Build your city empire:
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Home className="w-4 h-4" style={{ color: '#7dd3c0' }} strokeWidth={1.5} />
                <span>Purchase available land</span>
              </li>
              <li className="flex items-center gap-3">
                <FileCheck className="w-4 h-4" style={{ color: '#7dd3c0' }} strokeWidth={1.5} />
                <span>Apply for building permits</span>
              </li>
              <li className="flex items-center gap-3">
                <HardHat className="w-4 h-4" style={{ color: '#7dd3c0' }} strokeWidth={1.5} />
                <span>Hire contractors</span>
              </li>
              <li className="flex items-center gap-3">
                <Building className="w-4 h-4" style={{ color: '#7dd3c0' }} strokeWidth={1.5} />
                <span>Develop multi-story buildings</span>
              </li>
              <li className="flex items-center gap-3">
                <Sprout className="w-4 h-4" style={{ color: '#7dd3c0' }} strokeWidth={1.5} />
                <span>Grow and sell crops</span>
              </li>
              <li className="flex items-center gap-3">
                <Key className="w-4 h-4" style={{ color: '#7dd3c0' }} strokeWidth={1.5} />
                <span>Lease properties</span>
              </li>
              <li className="flex items-center gap-3">
                <FactoryIcon className="w-4 h-4" style={{ color: '#7dd3c0' }} strokeWidth={1.5} />
                <span>Run factories & industries</span>
              </li>
              <li className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4" style={{ color: '#7dd3c0' }} strokeWidth={1.5} />
                <span>Generate revenue</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (land.zone === 'road') {
    return (
      <Card 
        className="border-0 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(26, 77, 77, 0.95) 0%, rgba(20, 60, 60, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(125, 211, 192, 0.2)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(125, 211, 192, 0.1)'
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl" style={{ color: '#7dd3c0' }}>
            <Building2 className="w-5 h-5" />
            Public Road
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: '#a8e6d9' }}>
            This is public infrastructure maintained by the city government.
          </p>
        </CardContent>
      </Card>
    );
  }

  const ZoneIcon = ZONE_ICONS[land.zone];
  const isOwned = land.owner === 'player';
  const isOwnedByOther = land.owner === 'other' || (land.ownerWalletAddress && land.owner !== 'player');
  const isAvailable = !isOwned && !isOwnedByOther;
  const isLeased = player.leasedLands.includes(land.id);
  const canAfford = player.balance >= land.price;
  const buildingOptions = BUILDING_OPTIONS[land.zone] || [];

  // Zone-based glow colors
  const getZoneGlow = (zone: ZoneType) => {
    switch (zone) {
      case 'residential':
        return '0 0 20px rgba(34, 197, 94, 0.2)';
      case 'commercial':
        return '0 0 20px rgba(59, 130, 246, 0.2)';
      case 'industrial':
        return '0 0 20px rgba(251, 146, 60, 0.2)';
      case 'agricultural':
        return '0 0 20px rgba(163, 230, 53, 0.2)';
      default:
        return '0 0 20px rgba(59, 130, 246, 0.1)';
    }
  };

  return (
    <Card 
      className="border-0 shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(26, 77, 77, 0.95) 0%, rgba(20, 60, 60, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(125, 211, 192, 0.2)',
        borderRadius: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(125, 211, 192, 0.1)'
      }}
    >
      <CardHeader
        style={{
          boxShadow: getZoneGlow(land.zone),
          borderRadius: '24px 24px 0 0',
          padding: '1.5rem',
          borderBottom: '1px solid rgba(125, 211, 192, 0.15)',
          background: 'linear-gradient(135deg, rgba(26, 77, 77, 0.98) 0%, rgba(20, 60, 60, 0.98) 100%)'
        }}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-bold" style={{ color: '#7dd3c0' }}>
            <ZoneIcon className="w-6 h-6" strokeWidth={1.5} />
            Plot #{land.id}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {isOwned && (
              <Badge 
                style={{
                  background: 'rgba(125, 211, 192, 0.2)',
                  color: '#7dd3c0',
                  border: '1px solid rgba(125, 211, 192, 0.3)'
                }}
              >
                Owned
              </Badge>
            )}
            {isOwnedByOther && (
              <Badge 
                style={{
                  background: 'rgba(168, 230, 217, 0.15)',
                  color: '#a8e6d9',
                  border: '1px solid rgba(168, 230, 217, 0.25)'
                }}
              >
                Owned by Another
              </Badge>
            )}
            {isLeased && (
              <Badge 
                style={{
                  background: 'rgba(168, 230, 217, 0.15)',
                  color: '#a8e6d9',
                  border: '1px solid rgba(168, 230, 217, 0.25)'
                }}
              >
                Leased
              </Badge>
            )}
            {isAvailable && !isLeased && (
              <Badge 
                style={{
                  background: 'rgba(125, 211, 192, 0.1)',
                  color: '#a8e6d9',
                  border: '1px solid rgba(125, 211, 192, 0.2)'
                }}
              >
                Available
              </Badge>
            )}
            {land.forLease && (
              <Badge 
                style={{
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}
              >
                For Lease
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-sm mt-2" style={{ color: '#a8e6d9' }}>
          {ZONE_LABELS[land.zone]}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6" style={{ color: '#a8e6d9' }}>
        {/* Property Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p style={{ color: '#a8e6d9', opacity: 0.8 }}>Location</p>
            <p className="font-medium" style={{ color: '#7dd3c0' }}>X: {land.x}, Y: {land.y}</p>
          </div>
          <div>
            <p style={{ color: '#a8e6d9', opacity: 0.8 }}>Zone Type</p>
            <p className="font-medium" style={{ color: '#7dd3c0' }}>{ZONE_LABELS[land.zone]}</p>
          </div>
          <div>
            <p style={{ color: '#a8e6d9', opacity: 0.8 }}>Price</p>
            <p className="font-medium flex items-center gap-1" style={{ color: '#fbbf24' }}>
              <Coins className="w-4 h-4" />
              {/* 0.1 OCT */}
            </p>
          </div>
          <div>
            <p style={{ color: '#a8e6d9', opacity: 0.8 }}>Owner</p>
            <p className="font-medium" style={{ color: '#7dd3c0' }}>
              {isOwned ? 'You' : isOwnedByOther ? 'Another User' : 'Available'}
            </p>
          </div>
        </div>

        {/* Blockchain Details - Show when owned */}
        {isOwned && land.landDataObjectId && (
          <>
            <Separator style={{ borderColor: 'rgba(125, 211, 192, 0.15)' }} />
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2" style={{ color: '#7dd3c0' }}>
                <Key className="w-4 h-4" />
                Blockchain Details
              </h4>
              <div className="space-y-2 text-sm">
                {land.ownerWalletAddress && (
                  <div>
                    <p style={{ color: '#a8e6d9', opacity: 0.8 }}>Owner Wallet</p>
                    <p className="font-mono text-xs break-all" style={{ color: '#a8e6d9' }}>
                      {land.ownerWalletAddress}
                    </p>
                  </div>
                )}
                {/* {land.landDataObjectId && (
                  <div>
                    <p style={{ color: '#a8e6d9', opacity: 0.8 }}>LandData Object ID</p>
                    <p className="font-mono text-xs break-all" style={{ color: '#a8e6d9' }}>
                      {land.landDataObjectId}
                    </p>
                  </div>
                )} */}
                {/* {land.transactionDigest && (
                  <div>
                    <p style={{ color: '#a8e6d9', opacity: 0.8 }}>Transaction Digest</p>
                    <p className="font-mono text-xs break-all" style={{ color: '#a8e6d9' }}>
                      {land.transactionDigest}
                    </p>
                  </div>
                )} */}
                {land.rtokens !== undefined && (
                  <div>
                    <p style={{ color: '#a8e6d9', opacity: 0.8 }}>RTOKENs</p>
                    <p className="font-medium" style={{ color: '#fbbf24' }}>
                      {land.rtokens.toLocaleString()}
                    </p>
                  </div>
                )}
                {land.purchasedAt && (
                  <div>
                    <p style={{ color: '#a8e6d9', opacity: 0.8 }}>Purchased At</p>
                    <p className="font-medium" style={{ color: '#7dd3c0' }}>
                      {new Date(land.purchasedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator style={{ borderColor: 'rgba(125, 211, 192, 0.15)' }} />

        {/* Building Status */}
        {land.building && land.building.type && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2" style={{ color: '#7dd3c0' }}>
              <Building className="w-4 h-4" />
              Current Development
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#a8e6d9', opacity: 0.8 }}>Building Type</span>
                <span className="text-sm font-medium capitalize" style={{ color: '#7dd3c0' }}>
                  {land.building.type}
                </span>
              </div>
              {land.building.floors && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#a8e6d9', opacity: 0.8 }}>Floors</span>
                  <span className="text-sm font-medium" style={{ color: '#7dd3c0' }}>
                    {land.building.floors} floors
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#a8e6d9', opacity: 0.8 }}>Status</span>
                <Badge 
                  className="capitalize"
                  style={{
                    background: 'rgba(125, 211, 192, 0.2)',
                    color: '#7dd3c0',
                    border: '1px solid rgba(125, 211, 192, 0.3)'
                  }}
                >
                  {land.building.stage}
                </Badge>
              </div>
              
              {land.building.permit && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <FileCheck className="w-3 h-3" />
                      Building Permit
                    </span>
                    <Badge variant={land.building.permit.status === 'approved' ? "default" : "secondary"}>
                      {land.building.permit.status}
                    </Badge>
                  </div>
                  {land.building.permit.status === 'pending' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Upvotes:</span>
                        <span className="font-medium text-green-500">{land.building.permit.upvotes || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Downvotes:</span>
                        <span className="font-medium text-red-500">{land.building.permit.downvotes || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Needs:</span>
                        <span className="font-medium">{land.building.permit.minimumUpvotes || 2} upvotes</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate('/voting')}
                      >
                        <Vote className="w-3 h-3 mr-2" />
                        View on Voting Page
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {land.building.contractor && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <HardHat className="w-3 h-3" />
                      Contractor
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {land.building.contractor.name}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Construction Progress</span>
                      <span className="font-medium text-foreground">
                        {Math.floor(land.building.constructionProgress)}%
                      </span>
                    </div>
                    <Progress value={land.building.constructionProgress} className="h-2" />
                  </div>
                </>
              )}
              
              {land.building.stage === 'complete' && !land.building.crop && (
                <>
                  <Separator />
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Monthly Revenue
                      </span>
                      <span className="text-sm font-bold text-game-gold">
                        ${land.building.revenue?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Employees
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {land.building.employees || 0}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {land.building.crop && (
                <>
                  <Separator />
                  <div className="space-y-2 pt-2">
                    <h5 className="font-semibold text-sm flex items-center gap-1">
                      <Leaf className="w-4 h-4" />
                      Crop Information
                    </h5>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Crop Type</span>
                      <span className="text-sm font-medium text-foreground capitalize">
                        {land.building.crop.type}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Growth Stage</span>
                        <span className="font-medium text-foreground">
                          {Math.floor(land.building.crop.growthStage)}%
                        </span>
                      </div>
                      <Progress value={land.building.crop.growthStage} className="h-2" />
                    </div>
                    {land.building.crop.yieldAmount && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Yield</span>
                          <span className="text-sm font-medium text-foreground">
                            {land.building.crop.yieldAmount} units
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Market Price</span>
                          <span className="text-sm font-bold text-game-gold">
                            ${Math.floor(land.building.crop.marketPrice).toLocaleString()}/unit
                          </span>
                        </div>
                        <Button 
                          onClick={() => onHarvestCrop(land)}
                          className="w-full"
                          size="sm"
                        >
                          Harvest Crop
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}

              {land.building.lease && (
                <>
                  <Separator />
                  <div className="space-y-2 pt-2">
                    <h5 className="font-semibold text-sm flex items-center gap-1">
                      <Key className="w-4 h-4" />
                      Lease Information
                    </h5>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Rent</span>
                      <span className="text-sm font-bold text-game-gold">
                        ${land.building.lease.monthlyRent.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        {isAvailable && !isLeased && !land.forLease && (
          <Button 
            onClick={() => onPurchase(land)}
            disabled={isMinting}
            className="w-full"
            size="lg"
            style={{
              background: 'linear-gradient(135deg, rgba(125, 211, 192, 0.2) 0%, rgba(100, 180, 165, 0.2) 100%)',
              border: '1px solid rgba(125, 211, 192, 0.4)',
              color: '#7dd3c0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(125, 211, 192, 0.2)',
              fontWeight: 600
            }}
          >
            {isMinting 
              ? 'Processing Transaction...' 
              : `Purchase Plot`
            }
          </Button>
        )}

        {land.forLease && !isOwned && !isLeased && (
          <Button 
            onClick={() => onTakeLease(land)}
            disabled={player.balance < (land.leasePrice || 0)}
            className="w-full"
            size="lg"
            variant="secondary"
          >
            <Key className="w-4 h-4 mr-2" />
            Lease for ${land.leasePrice?.toLocaleString()}/month
          </Button>
        )}

        {(isOwned || isLeased) && land.zone === 'agricultural' && !land.building?.crop && (
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Plant Crops</h4>
            <div className="space-y-2">
              {CROP_OPTIONS.map((crop) => (
                <Button
                  key={crop}
                  onClick={() => onPlantCrop(land, crop)}
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                >
                  <Leaf className="w-4 h-4 mr-2" />
                  <span className="capitalize">{crop}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {isOwned && !land.building && buildingOptions.length > 0 && (
          <Tabs defaultValue="develop" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="develop">Develop</TabsTrigger>
              <TabsTrigger value="lease">Lease</TabsTrigger>
            </TabsList>
            
            <TabsContent value="develop" className="space-y-3">
              <h4 className="font-semibold text-foreground">Apply for Development Permit</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="permitDescription">Description</Label>
                  <Input
                    id="permitDescription"
                    type="text"
                    placeholder="Describe your development project..."
                    value={permitDescription}
                    onChange={(e) => setPermitDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide a detailed description of your development project
                  </p>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Permit Fee:</span>
                    <span className="font-medium text-game-gold">
                      500 RTOKEN
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After applying, visit the Voting page for community approval
                  </p>
                </div>
                <Button 
                  onClick={() => onApplyPermit(land, permitDescription)}
                  className="w-full"
                  disabled={isMinting || !permitDescription.trim()}
                  style={{
                    background: 'linear-gradient(135deg, rgba(125, 211, 192, 0.2) 0%, rgba(100, 180, 165, 0.2) 100%)',
                    border: '1px solid rgba(125, 211, 192, 0.4)',
                    color: '#7dd3c0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(125, 211, 192, 0.2)',
                    fontWeight: 600
                  }}
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  {isMinting ? 'Processing...' : 'Apply for Building Permit'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="lease" className="space-y-3">
              <h4 className="font-semibold text-foreground">List for Lease</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="lease">Monthly Rent ($)</Label>
                  <Input
                    id="lease"
                    type="number"
                    min="1000"
                    value={leaseAmount}
                    onChange={(e) => setLeaseAmount(Math.max(1000, parseInt(e.target.value) || 1000))}
                  />
                </div>
                <Button 
                  onClick={() => onListForLease(land, leaseAmount)}
                  className="w-full"
                  variant="secondary"
                >
                  <HandCoins className="w-4 h-4 mr-2" />
                  List Property for Lease
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {isOwned && onListForSale && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              List for Sale
            </h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="salePrice">Price (RTOKEN)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min="1"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground">
                  Set the price in RTOKENs for your plot
                </p>
              </div>
              <Button 
                onClick={() => onListForSale(land, salePrice)}
                className="w-full"
                variant="outline"
                disabled={isMinting}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {isMinting ? 'Processing...' : 'List for Sale'}
              </Button>
            </div>
          </div>
        )}

        {/* Billboard Advertising Section */}
        {land.hasBillboard && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Billboard Advertising
            </h4>
            
            {land.advertisingImageUrl ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Advertisement:</p>
                <img 
                  src={land.advertisingImageUrl} 
                  alt="Billboard Ad" 
                  className="w-full h-32 object-cover rounded border border-border"
                />
                <p className="text-xs text-muted-foreground">
                  This billboard is currently leased
                </p>
              </div>
            ) : isOwned && onListBillboard && !land.advertisingListing ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="billboardPrice">Price per Lease (RTOKEN)</Label>
                  <Input
                    id="billboardPrice"
                    type="number"
                    min="1"
                    value={billboardPrice}
                    onChange={(e) => setBillboardPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set the price for advertising on this billboard
                  </p>
                </div>
                <Button 
                  onClick={() => onListBillboard(land, billboardPrice)}
                  className="w-full"
                  variant="outline"
                  disabled={isMinting}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  {isMinting ? 'Processing...' : 'List Billboard for Advertising'}
                </Button>
              </div>
            ) : land.advertisingListing && land.advertisingListing.status === 'available' && onLeaseBillboard ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Available for Advertising</span>
                    <Badge variant="secondary">Available</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="w-4 h-4 text-game-gold" />
                    <span className="font-semibold text-game-gold">
                      {land.advertisingListing.price} RTOKEN
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adImageUrl">Advertisement Image URL</Label>
                  <Input
                    id="adImageUrl"
                    type="url"
                    placeholder="https://example.com/image.png"
                    value={adImageUrl}
                    onChange={(e) => setAdImageUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the URL of the image to display on the billboard
                  </p>
                </div>
                <Button 
                  onClick={() => onLeaseBillboard(land, adImageUrl)}
                  className="w-full"
                  disabled={isMinting || !adImageUrl.trim()}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  {isMinting ? 'Processing...' : 'Lease Billboard'}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {isOwned && land.building?.permit?.status === 'approved' && !land.building.contractor && (
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Hammer className="w-4 h-4" />
              Hire Contractor
            </h4>
            <div className="space-y-2">
              {CONTRACTORS.map((contractor) => (
                <Button
                  key={contractor.id}
                  onClick={() => onHireContractor(land, contractor)}
                  disabled={player.balance < contractor.cost}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                >
                  <div className="flex items-center gap-3 w-full">
                    <HardHat className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{contractor.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{contractor.tier}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {contractor.speed}d
                        </span>
                        <span>•</span>
                        <span className="text-game-gold">${contractor.cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
