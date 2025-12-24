import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useEVMWallet } from '@/hooks/useEVMWallet';
import { 
  loadAllPermits, 
  savePermitVote, 
  getUserVote, 
  updatePermitStatus,
  loadPermitById 
} from '@/lib/database';
import { 
  createVotePermitTransaction, 
  createUpdatePermitTransaction,
  waitForVotePermitTransaction,
  waitForUpdatePermitTransaction 
} from '@/lib/permitService';
import { 
  ThumbsUp, 
  ThumbsDown, 
  FileCheck, 
  MapPin, 
  Building2, 
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  Coins,
  User
} from 'lucide-react';
import { ZoneType } from '@/types/game';
import { GameHeader } from '@/components/game/GameHeader';
import { getTotalRTokenBalance } from '@/lib/database';

const Voting = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const suiAccount = useCurrentAccount(); // Keep for compatibility
  const { account, address: evmAddress, isConnected: isEVMConnected, connect: connectEVM } = useEVMWallet();
  const { mutate: signAndExecute, isPending: isVotingSui, reset } = useSignAndExecuteTransaction();
  const [isVoting, setIsVoting] = useState(false); // For EVM transactions
  
  // Use EVM wallet address for EVM transactions
  const accountAddress = evmAddress || suiAccount?.address;
  const [permits, setPermits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<Record<string, 'upvote' | 'downvote' | null>>({});
  const [updatingPermits, setUpdatingPermits] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({});
  const [totalRTokens, setTotalRTokens] = useState(0);
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);

  // Zone type labels
  const ZONE_LABELS: Record<string, string> = {
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
    agricultural: 'Agricultural',
    park: 'Park',
    road: 'Road',
    billboard: 'Billboard',
  };

  useEffect(() => {
    loadPermits();
    if (accountAddress) {
      loadRTokenBalance();
    }
  }, [accountAddress]);

  const loadRTokenBalance = async () => {
    if (!accountAddress) return;
    const balance = await getTotalRTokenBalance(accountAddress);
    setTotalRTokens(balance);
  };

  // Countdown timer effect
  useEffect(() => {
    const updateCountdowns = () => {
      const newTimeRemaining: Record<string, string> = {};
      permits.forEach((permit) => {
        if (permit.submitted_at && permit.status === 'pending') {
          const submittedAt = new Date(permit.submitted_at);
          const votingEndsAt = new Date(submittedAt.getTime() + 48 * 60 * 60 * 1000); // +48 hours
          const now = new Date();
          const diff = votingEndsAt.getTime() - now.getTime();

          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            newTimeRemaining[permit.permit_id] = `${days}d ${hours}h ${minutes}m ${seconds}s`;
          } else {
            newTimeRemaining[permit.permit_id] = 'Expired';
          }
        }
      });
      setTimeRemaining(newTimeRemaining);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [permits]);

  const loadPermits = async () => {
    setLoading(true);
    try {
      const allPermits = await loadAllPermits();
      setPermits(allPermits);

      // Load user votes if wallet is connected
      if (accountAddress) {
        const votes: Record<string, 'upvote' | 'downvote' | null> = {};
        for (const permit of allPermits) {
          const vote = await getUserVote(permit.permit_id, account.address);
          votes[permit.permit_id] = vote;
        }
        setUserVotes(votes);
      }
    } catch (error) {
      console.error('Error loading permits:', error);
      toast({
        title: "Error",
        description: "Failed to load permits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (permit: any, voteType: 'upvote' | 'downvote') => {
    if (!isEVMConnected || !evmAddress) {
      try {
        await connectEVM();
      } catch (error: any) {
        toast({
          title: "Wallet Not Connected",
          description: error.message || "Please connect your MetaMask wallet to vote.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (!evmAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to vote.",
        variant: "destructive",
      });
      return;
    }

    // Check if user already voted
    if (userVotes[permit.permit_id]) {
      toast({
        title: "Already Voted",
        description: "You have already voted on this permit.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is the owner
    // Normalize addresses to lowercase for comparison
    const normalizedPermitAddress = (permit.owner_wallet_address || '').toLowerCase().trim();
    const normalizedAccountAddress = (accountAddress || '').toLowerCase().trim();
    if (normalizedPermitAddress === normalizedAccountAddress) {
      toast({
        title: "Cannot Vote",
        description: "You cannot vote on your own permit.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Processing Vote",
      description: "Please approve the transaction in your wallet...",
    });

    try {
      const voteValue = voteType === 'upvote' ? 1 : 0;
      // Use blockchain_permit_id for blockchain transactions (permit.permit_id is the sequential database ID)
      // For EVM, proposalId should be a number
      const blockchainPermitId = permit.blockchain_permit_id || permit.permit_id;
      const proposalId = typeof blockchainPermitId === 'string' ? parseInt(blockchainPermitId) : blockchainPermitId;
      
      // Create and send transaction (EVM - transaction is sent immediately)
      const tx = await createVotePermitTransaction(proposalId, voteValue);

      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      const result = await waitForVotePermitTransaction(tx);
      if (!result) {
        throw new Error('Failed to process vote transaction');
      }

      // Save vote to database
      const saved = await savePermitVote(
        permit.permit_id,
        evmAddress,
        voteType,
        result.digest
      );

      if (!saved) {
        console.warn('Failed to save vote to database, but transaction succeeded');
      }

      // Reload permits to get updated vote counts
      await loadPermits();

      toast({
        title: "Vote Recorded!",
              description: `Your ${voteType} has been recorded.`,
            });

      reset();
    } catch (error: any) {
      console.error("Error processing vote:", error);
      setIsVoting(false);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to vote. Please try again.",
        variant: "destructive",
      });
      reset();
    }
  };

  const handleUpdatePermit = async (permit: any) => {
    if (!isEVMConnected || !evmAddress) {
      try {
        await connectEVM();
      } catch (error: any) {
        toast({
          title: "Wallet Not Connected",
          description: error.message || "Please connect your MetaMask wallet to update permit.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (!evmAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet.",
        variant: "destructive",
      });
      return;
    }

    // Check if permit is already approved
    if (permit.status === 'approved') {
      toast({
        title: "Already Approved",
        description: "This permit is already approved.",
        variant: "destructive",
      });
      return;
    }

    // Check if minimum upvotes are met
    if (permit.upvotes < permit.minimum_upvotes) {
      toast({
        title: "Not Enough Votes",
        description: `This permit needs at least ${permit.minimum_upvotes} upvotes. Currently has ${permit.upvotes}.`,
        variant: "destructive",
      });
      return;
    }

    setUpdatingPermits(prev => new Set(prev).add(permit.permit_id));

    toast({
      title: "Updating Permit",
      description: "Please approve the transaction in your wallet...",
    });

    try {
      // Use blockchain_permit_id for blockchain transactions (permit.permit_id is the sequential database ID)
      // For EVM, proposalId should be a number
      const blockchainPermitId = permit.blockchain_permit_id || permit.permit_id;
      const proposalId = typeof blockchainPermitId === 'string' ? parseInt(blockchainPermitId) : blockchainPermitId;
      
      // Create and send transaction (EVM - transaction is sent immediately)
      const tx = await createUpdatePermitTransaction(proposalId);

      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      const result = await waitForUpdatePermitTransaction(tx);
      if (!result) {
        throw new Error('Failed to process update transaction');
      }

      // Update permit status in database
      const updated = await updatePermitStatus(permit.permit_id, 'approved', result.digest);

            if (!updated) {
              console.warn('Failed to update permit status in database, but transaction succeeded');
            }

      // Reload permits
      await loadPermits();

      toast({
        title: "Permit Approved!",
        description: "The permit has been approved and construction can begin.",
      });

      setUpdatingPermits(prev => {
        const next = new Set(prev);
        next.delete(permit.permit_id);
        return next;
      });

      reset();
    } catch (error: any) {
      console.error("Error updating permit:", error);
      setUpdatingPermits(prev => {
        const next = new Set(prev);
        next.delete(permit.permit_id);
        return next;
      });
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to update permit. Please try again.",
        variant: "destructive",
      });
      reset();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white border-0 rounded-full px-4 py-1"><CheckCircle2 className="w-4 h-4 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white border-0 rounded-full px-4 py-1"><XCircle className="w-4 h-4 mr-1" />Rejected</Badge>;
      case 'construction_started':
        return <Badge className="bg-blue-600 text-white border-0 rounded-full px-4 py-1"><Building2 className="w-4 h-4 mr-1" />Construction Started</Badge>;
      default:
        return <Badge className="bg-green-600 text-white border-0 rounded-full px-4 py-1"><Clock className="w-4 h-4 mr-1" />Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateApprovalRate = (upvotes: number, downvotes: number) => {
    const total = upvotes + downvotes;
    if (total === 0) return 0;
    return Math.round((upvotes / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-200/40 via-green-300/30 to-green-600/40 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white" />
          <div className="text-lg font-semibold mb-2 text-white">Loading permits...</div>
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
      
      {/* Ghibli-style deep blue/navy gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-blue-900 to-slate-950"></div>
      
      {/* Moonlit glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl"></div>
      
      {/* Faint clouds */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-32 bg-white/10 rounded-full blur-2xl" 
             style={{ transform: 'rotate(-10deg)' }}></div>
        <div className="absolute top-40 right-20 w-80 h-40 bg-white/8 rounded-full blur-2xl" 
             style={{ transform: 'rotate(15deg)' }}></div>
        <div className="absolute bottom-40 left-1/4 w-72 h-36 bg-white/6 rounded-full blur-2xl" 
             style={{ transform: 'rotate(-5deg)' }}></div>
      </div>
      
      {/* Light particle dust */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 15% 25%, rgba(255,255,255,0.4) 0.5px, transparent 0.5px),
                           radial-gradient(circle at 70% 45%, rgba(255,255,255,0.3) 0.5px, transparent 0.5px),
                           radial-gradient(circle at 45% 75%, rgba(255,255,255,0.35) 0.5px, transparent 0.5px),
                           radial-gradient(circle at 85% 65%, rgba(255,255,255,0.3) 0.5px, transparent 0.5px)`,
          backgroundSize: '150px 150px, 200px 200px, 180px 180px, 220px 220px',
          backgroundPosition: '0% 0%, 100% 50%, 50% 100%, 0% 100%'
        }}></div>
      </div>
      
      {/* Gentle vignette edges */}
      <div className="absolute inset-0 pointer-events-none" 
           style={{
             boxShadow: 'inset 0 0 200px rgba(0,0,0,0.3), inset 0 0 100px rgba(0,0,0,0.2)'
           }}></div>
      
      {/* Soft watercolor texture */}
      <div className="absolute inset-0 opacity-8 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
        backgroundSize: '150px 150px'
      }}></div>
      
      <div className="container mx-auto px-4 py-6 max-w-3xl relative z-10 pt-24">
        {/* Back Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white/90 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white mb-3">Permit Voting</h1>
          <p className="text-white/90 text-lg">Vote on permit applications (min 2 upvotes to approve)</p>
        </div>

        {permits.length === 0 ? (
          <Card className="bg-white/20 backdrop-blur-md border-white/30">
            <CardContent className="py-12 text-center">
              <FileCheck className="w-12 h-12 mx-auto mb-4 text-white/60" />
              <p className="text-lg font-semibold mb-2 text-white">No Permits Available</p>
              <p className="text-white/70">
                There are no permit applications to vote on at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {permits.map((permit) => {
              const userVote = userVotes[permit.permit_id];
              const canVote = accountAddress && 
                             !userVote && 
                             (permit.owner_wallet_address || '').toLowerCase().trim() !== (accountAddress || '').toLowerCase().trim() &&
                             permit.status === 'pending';
              const canApprove = permit.status === 'pending' && 
                                permit.upvotes >= permit.minimum_upvotes;

              return (
                <Card 
                  key={permit.id} 
                  className="bg-green-500/20 backdrop-blur-md border-green-400/30 shadow-lg"
                >
                  <CardContent className="p-5">
                    {/* Header with Permit ID and Status */}
                    <div className="flex items-start justify-between mb-3">
                      <h2 className="text-xl font-bold text-white">Permit #{permit.land_id}</h2>
                      {getStatusBadge(permit.status)}
                    </div>

                    {/* Description */}
                    <p className="text-white/90 mb-4 text-base">
                      {permit.description}
                    </p>

                    {/* Key Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-white/20">
                      <div>
                        <p className="text-white/70 text-xs mb-1">Zone Type</p>
                        <p className="font-bold text-white capitalize">{permit.zone_type ? ZONE_LABELS[permit.zone_type] || permit.zone_type : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs mb-1">Fee</p>
                        <p className="font-bold text-yellow-300 flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {permit.permit_fee} RTOKEN
                        </p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs mb-1">Created At</p>
                        <p className="font-bold text-white text-sm">{permit.created_at ? formatDate(permit.created_at) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs mb-1">Submitted By</p>
                        <p className="font-bold text-white text-sm flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {permit.owner_wallet_address ? `${permit.owner_wallet_address.slice(0, 6)}...${permit.owner_wallet_address.slice(-4)}` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Voting Stats */}
                    <div className="mb-4 pb-4 border-b border-white/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4 text-green-400" />
                            <span className="text-white font-semibold">{permit.upvotes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsDown className="w-4 h-4 text-red-400" />
                            <span className="text-white font-semibold">{permit.downvotes || 0}</span>
                          </div>
                        </div>
                        <div className="text-white/70 text-sm">
                          Approval Rate: <span className="font-bold text-white">{calculateApprovalRate(permit.upvotes || 0, permit.downvotes || 0)}%</span>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={calculateApprovalRate(permit.upvotes || 0, permit.downvotes || 0)} 
                          className="h-2 bg-white/20 [&>div]:bg-green-500"
                        />
                      </div>
                    </div>

                    {/* Voting Ends Countdown */}
                    {permit.status === 'pending' && permit.submitted_at && (
                      <div className="mb-4 pb-4 border-b border-white/20">
                        <div className="flex items-center justify-between">
                          <p className="text-white/70 text-xs">Voting Ends</p>
                          <p className="text-white font-semibold text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeRemaining[permit.permit_id] || 'Calculating...'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Voting Buttons */}
                    {canVote ? (
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          onClick={() => handleVote(permit, 'upvote')}
                          disabled={isVoting}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white border-0 rounded-md shadow-md hover:shadow-lg transition-all font-semibold"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleVote(permit, 'downvote')}
                          disabled={isVoting}
                          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white border-0 rounded-md shadow-md hover:shadow-lg transition-all font-semibold"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : userVote ? (
                      <div className="text-center">
                        <Badge className="bg-white/20 text-white border-white/30 px-3 py-1.5 text-sm">
                          {userVote === 'upvote' ? 'You voted up' : 'You voted down'}
                        </Badge>
                      </div>
                    ) : canApprove ? (
                      <div className="text-center">
                        <Button
                          onClick={() => handleUpdatePermit(permit)}
                          disabled={isVoting || updatingPermits.has(permit.permit_id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                        >
                          {updatingPermits.has(permit.permit_id) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve Permit
                            </>
                          )}
                        </Button>
                      </div>
                    ) : permit.status !== 'pending' ? (
                      <div className="text-center text-white/70 text-sm">
                        This permit is {permit.status}
                      </div>
                    ) : null}
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

export default Voting;

