/**
 * Service for permit-related blockchain transactions on EVM-compatible blockchain
 */

import { ethers } from 'ethers';
import { ContractAddress, ContractABI } from '../Constants/constants';

const PERMIT_FEE = 500; // 500 RTOKENs

export interface ApplyPermitResult {
  digest: string;
  permitId: string;
}

export interface VotePermitResult {
  digest: string;
}

export interface UpdatePermitResult {
  digest: string;
}

export interface StartConstructionResult {
  digest: string;
}

/**
 * Get provider and signer from window.ethereum
 */
const getProviderAndSigner = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or other Web3 provider not found. Please install MetaMask.');
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
};

/**
 * Create transaction for applying for a permit
 * apply_for_votes(uint256 landId, string description)
 */
export const createApplyPermitTransaction = async (
  description: string,
  landId: string | number
): Promise<any> => {
  const { signer } = await getProviderAndSigner();
  const contractInstance = new ethers.Contract(ContractAddress, ContractABI, signer);
  
  // Convert landId to BigInt (ethers v6 uses native BigInt)
  const landIdBN = BigInt(landId.toString());
  
  console.log("Applying for permit:", { landId: landIdBN.toString(), description });
  
  // Call apply_for_votes function
  const tx = await contractInstance.apply_for_votes(landIdBN, description);
  
  return tx;
};

/**
 * Create transaction for voting on a permit
 * make_vote(uint256 proposalId, bool support)
 * support: true = upvote, false = downvote
 */
export const createVotePermitTransaction = async (
  proposalId: string | number,
  vote: number // 1 for upvote, 0 for downvote
): Promise<any> => {
  const { signer } = await getProviderAndSigner();
  const contractInstance = new ethers.Contract(ContractAddress, ContractABI, signer);
  
  // Convert proposalId to BigInt (ethers v6 uses native BigInt)
  const proposalIdBN = BigInt(proposalId.toString());
  const support = vote === 1; // Convert 1/0 to true/false
  
  console.log("Voting on permit:", { proposalId: proposalIdBN.toString(), support });
  
  // Call make_vote function
  const tx = await contractInstance.make_vote(proposalIdBN, support);
  
  return tx;
};

/**
 * Create transaction for updating permit status
 * update_proposal_status(uint256 proposalId)
 */
export const createUpdatePermitTransaction = async (
  proposalId: string | number
): Promise<any> => {
  const { signer } = await getProviderAndSigner();
  const contractInstance = new ethers.Contract(ContractAddress, ContractABI, signer);
  
  // Convert proposalId to BigInt (ethers v6 uses native BigInt)
  const proposalIdBN = BigInt(proposalId.toString());
  
  console.log("Updating permit status:", { proposalId: proposalIdBN.toString() });
  
  // Call update_proposal_status function
  const tx = await contractInstance.update_proposal_status(proposalIdBN);
  
  return tx;
};

/**
 * Create transaction for starting construction
 * Note: This function may not exist in the EVM contract based on the ABI
 * Keeping it for compatibility but it may need to be implemented differently
 */
export const createStartConstructionTransaction = async (
  floors: number,
  permitId: string | number,
  landDataObjectId: string | number
): Promise<any> => {
  // This function may need to be implemented based on the actual contract
  // For now, we'll throw an error indicating it needs implementation
  throw new Error('start_construction function not available in EVM contract. Please check contract ABI.');
};

/**
 * Wait for transaction and extract permit ID
 */
export const waitForApplyPermitTransaction = async (tx: any): Promise<ApplyPermitResult | null> => {
  try {
    const { provider } = await getProviderAndSigner();
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log("Apply Permit Transaction Receipt:", receipt);

    // Extract permitId from ProposalCreated event (ethers v6 format)
    const contractInstance = new ethers.Contract(ContractAddress, ContractABI, provider);
    const iface = contractInstance.interface;
    
    let permitId: string | null = null;
    if (receipt.logs && receipt.logs.length > 0) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog(log);
          if (parsedLog && parsedLog.name === 'ProposalCreated') {
            permitId = parsedLog.args.proposalId?.toString() || null;
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }
    }

    if (!permitId) {
      // If we can't get permitId from event, we can query the contract for the latest proposalId
      try {
        const nextProposalId = await contractInstance.nextProposalId();
        // The created proposalId would be nextProposalId - 1 (since nextProposalId increments after creation)
        permitId = (nextProposalId - 1n).toString();
      } catch (error) {
        console.warn('Could not extract permit ID from transaction, will use transaction hash as reference');
        permitId = receipt.hash;
      }
    }

    return {
      digest: receipt.hash,
      permitId: permitId || receipt.hash,
    };
  } catch (error) {
    console.error("Error waiting for apply permit transaction:", error);
    return null;
  }
};

/**
 * Wait for vote transaction
 */
export const waitForVotePermitTransaction = async (tx: any): Promise<VotePermitResult | null> => {
  try {
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log("Vote Permit Transaction Receipt:", receipt);

    return { digest: receipt.hash };
  } catch (error) {
    console.error("Error waiting for vote permit transaction:", error);
    return null;
  }
};

/**
 * Wait for update permit transaction
 */
export const waitForUpdatePermitTransaction = async (tx: any): Promise<UpdatePermitResult | null> => {
  try {
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log("Update Permit Transaction Receipt:", receipt);

    return { digest: receipt.hash };
  } catch (error) {
    console.error("Error waiting for update permit transaction:", error);
    return null;
  }
};

/**
 * Wait for start construction transaction
 */
export const waitForStartConstructionTransaction = async (tx: any): Promise<StartConstructionResult | null> => {
  try {
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    console.log("Start Construction Transaction Receipt:", receipt);

    return { digest: receipt.hash };
  } catch (error) {
    console.error("Error waiting for start construction transaction:", error);
    return null;
  }
};
