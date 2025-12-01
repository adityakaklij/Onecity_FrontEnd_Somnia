import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Shield, Clock, CreditCard, ArrowLeft, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/constant/Constants';
import {ethers} from 'ethers'

// Define Ethereum window type
declare global {
  interface Window {
    ethereum?: any;
  }
}

const DomainPurchase = () => {
  const { domainName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [signer, setSigner] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  
  // Get domain data from navigation state or set defaults
  const domainData = location.state?.domain || {
    name: domainName,
    available: true,
    price: 0.01 // VANA price
  };

  useEffect(() => {
    // Check if wallet is already connected
    checkIfWalletIsConnected();
  }, []);

  const checkIfWalletIsConnected = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          
          // Initialize provider and signer
          const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(web3Provider);
          const signerInstance = web3Provider.getSigner();
          setSigner(signerInstance);
        }
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const connectWallet = async () => {
    setIsProcessing(true);
    try {
      if (!window.ethereum) {
        toast({
          title: "Metamask not detected",
          description: "Please install Metamask to continue with the purchase",
          variant: "destructive"
        });
        setIsProcessing(false);
        return null;
      }
      
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);
      setWalletConnected(true);
      
      // Initialize provider and signer
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      const signerInstance = web3Provider.getSigner();
      setSigner(signerInstance);
      
      toast({
        title: "Wallet connected",
        description: "Your wallet has been connected successfully. You can now purchase the domain."
      });
      
      return accounts[0];
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const purchase_domain = async () => {
    try {
      if (!signer) {
        console.error("No signer available");
        return;
      }
      
      console.log("Purchase domain function called with domain:", domainData.name);
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contractInstance.register(domainData.name, {value: '10000000000000000'});
      // const tx = await contractInstance.register(domainData.name, {value: ethers.utils.parseEther('0.01')});
      await tx.wait();
      console.log("Domain purchased successfully");
      
      return tx;
    } catch (error: any) {
      console.error("Purchase domain error:", error);
      throw error; // Rethrow to be handled by the caller
    }
  };

  const handleWalletAction = async () => {
    // If wallet is not connected, connect it
    if (!walletConnected) {
      await connectWallet();
    } 
    // If wallet is already connected, proceed with purchase
    else {
      handlePurchase();
    }
  };

  const handlePurchase = async () => {
    // Only proceed if wallet is connected
    if (!walletConnected || !signer) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Call the purchase domain function
      await purchase_domain();
      
      toast({
        title: "Domain Purchased Successfully!",
        description: `${domainData.name} is now yours forever.`
      });
      
      navigate('/success', { 
        state: { 
          domain: domainData.name, 
          price: domainData.price,
          lifetime: true
        } 
      });
    } catch (error: any) {
      console.log(error);
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to complete purchase",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!domainData.available) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center bg-gradient-card shadow-card">
          <CardContent className="p-8">
            <div className="text-destructive mb-4">
              <Globe className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Domain Unavailable</h1>
            <p className="text-muted-foreground mb-6">
              Sorry, {domainName} is not available for purchase.
            </p>
            <Button onClick={() => navigate('/')} className="bg-primary">
              Search Another Domain
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Button 
          variant="link" 
          onClick={() => navigate('/')}
          className="mb-8 text-foreground flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Domain Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-success mr-3" />
                  <CardTitle className="text-2xl font-bold">
                    {domainData.name}
                  </CardTitle>
                  <Badge variant="outline" className="ml-auto bg-success/10 text-success border-success/20">
                    Available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center p-4 rounded-lg bg-primary/5">
                    <Shield className="h-10 w-10 text-primary mr-3 bg-primary/10 p-2 rounded-full" />
                    <div>
                      <p className="font-medium">Blockchain Secured</p>
                      <p className="text-sm text-muted-foreground">Vana Network</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 rounded-lg bg-primary/5">
                    <Clock className="h-10 w-10 text-primary mr-3 bg-primary/10 p-2 rounded-full" />
                    <div>
                      <p className="font-medium">Instant Setup</p>
                      <p className="text-sm text-muted-foreground">Ready in minutes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 rounded-lg bg-primary/5">
                    <Globe className="h-10 w-10 text-primary mr-3 bg-primary/10 p-2 rounded-full" />
                    <div>
                      <p className="font-medium">Web3 Compatible</p>
                      <p className="text-sm text-muted-foreground">Future-ready</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2">
                  <span>Domain</span>
                  <span className="font-medium">{domainData.name}</span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span>Registration Period</span>
                  <span>Lifetime</span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span>Price</span>
                  <span>0.01 VANA</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold text-primary">
                  <span>Total</span>
                  <span>0.01 VANA</span>
                </div>
                
                {walletConnected ? (
                  <div className="space-y-4">
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 transition-all duration-200 py-6 text-lg font-medium"
                      onClick={handlePurchase}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : 'Purchase Domain'}
                    </Button>
                    
                    <div className="text-xs text-center">
                      <p className="text-muted-foreground">Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</p>
                    </div>
                  </div>
                ) : (
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 transition-all duration-200 py-6 text-lg font-medium"
                    onClick={connectWallet}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting...
                      </>
                    ) : 'Connect Wallet'}
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground text-center">
                  Secure payment powered by VANA
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainPurchase;