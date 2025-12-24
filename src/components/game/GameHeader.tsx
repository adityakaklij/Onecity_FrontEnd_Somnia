import { Player } from '@/types/game';
import { Wallet, Home, Building2, Factory, Sprout, Coins, Vote, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useEVMWallet } from '@/hooks/useEVMWallet';
import { useToast } from '@/hooks/use-toast';

interface GameHeaderProps {
  player: Player;
  showOwnedOnly: boolean;
  onToggleOwnedOnly: (show: boolean) => void;
  totalRTokens: number;
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export const GameHeader = ({ totalRTokens }: GameHeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { account, address, isConnected, connect: connectEVM, isConnecting } = useEVMWallet();
  const isWalletInstalled = typeof window !== 'undefined' && !!window.ethereum;

  const handleConnectWallet = async () => {
    try {
      await connectEVM();
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully.",
      });
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'linear-gradient(to bottom, rgba(14, 165, 233, 0.15), rgba(6, 182, 212, 0.1), rgba(20, 184, 166, 0.12))',
        borderRadius: '0 0 12px 12px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo and RTOKEN balance cluster */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/OneCity_logo.png" 
                alt="OneCity Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
            {isConnected && address && (
              <div 
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Coins className="w-4 h-4 text-yellow-300 transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(255,235,59,0.8)]" />
                <span className="text-sm font-semibold text-yellow-300">{totalRTokens.toLocaleString()} RTOKEN</span>
              </div>
            )}
          </div>
          
          {/* Center: Zone indicators cluster - hidden on small screens */}
          <div className="hidden lg:flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 group"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderLeft: '3px solid hsl(142 76% 36%)',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.15)'
              }}
            >
              <Home className="w-4 h-4 text-zone-residential transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              <span className="text-xs text-white/90">Residential</span>
            </div>
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 group"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderLeft: '3px solid hsl(217 91% 60%)',
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.15)'
              }}
            >
              <Building2 className="w-4 h-4 text-zone-commercial transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <span className="text-xs text-white/90">Commercial</span>
            </div>
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 group"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderLeft: '3px solid hsl(38 92% 50%)',
                boxShadow: '0 0 8px rgba(251, 146, 60, 0.15)'
              }}
            >
              <Factory className="w-4 h-4 text-zone-industrial transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
              <span className="text-xs text-white/90">Industrial</span>
            </div>
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 group"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderLeft: '3px solid hsl(84 81% 44%)',
                boxShadow: '0 0 8px rgba(163, 230, 53, 0.15)'
              }}
            >
              <Sprout className="w-4 h-4 text-zone-agricultural transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
              <span className="text-xs text-white/90">Agricultural</span>
            </div>
          </div>
          
          {/* Right: Navigation and wallet cluster */}
          <div className="flex items-center gap-2">
            {isConnected && address && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/voting')}
                  size="sm"
                  className="hidden sm:flex items-center gap-1.5 h-9 rounded-xl transition-all duration-200 hover:scale-105 group"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <Vote className="w-4 h-4 text-white/90 transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  <span className="text-sm text-white/90">Voting</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/marketplace')}
                  size="sm"
                  className="hidden sm:flex items-center gap-1.5 h-9 rounded-xl transition-all duration-200 hover:scale-105 group"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <ShoppingBag className="w-4 h-4 text-white/90 transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  <span className="text-sm text-white/90">Marketplace</span>
                </Button>
              </>
            )}
            {!isConnected ? (
              <div 
                className="rounded-xl transition-all duration-200 hover:scale-105 group"
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.2), inset 0 0 8px rgba(59, 130, 246, 0.1)',
                  padding: '2px'
                }}
              >
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{
                    background: 'rgba(16, 28, 40, 0.6)'
                  }}
                >
                  <Wallet className="w-4 h-4 text-blue-300 transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  {isWalletInstalled ? (
                    <Button 
                      onClick={handleConnectWallet}
                      disabled={isConnecting}
                      className="bg-transparent text-white border-0 shadow-none hover:bg-transparent text-sm px-2 py-1 h-auto disabled:opacity-50"
                    >
                      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                  ) : (
                    <span className="text-xs text-white/80">Install MetaMask</span>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="rounded-xl transition-all duration-200 hover:scale-105 group"
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  boxShadow: '0 0 12px rgba(34, 197, 94, 0.2), inset 0 0 8px rgba(34, 197, 94, 0.1)',
                  padding: '2px'
                }}
              >
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{
                    background: 'rgba(16, 28, 40, 0.6)'
                  }}
                >
                  <Wallet className="w-4 h-4 text-green-300 transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span className="text-xs text-white/90">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
