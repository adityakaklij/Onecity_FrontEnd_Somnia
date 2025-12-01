/**
 * Helper utilities for handling Enoki zkLogin session expiration
 * 
 * zkLogin sessions have epoch-based expiration. When a session expires,
 * users need to reconnect their Enoki wallet to get a fresh session.
 */

/**
 * Check if an error is related to zkLogin epoch expiration
 */
export function isEpochExpirationError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const errorString = JSON.stringify(error);
  
  // Check for epoch-related error messages
  const epochErrorPatterns = [
    /max epoch/i,
    /epoch.*expired/i,
    /epoch.*invalid/i,
    /ZKLogin.*epoch/i,
    /epoch too large/i,
    /epoch too small/i,
  ];
  
  return epochErrorPatterns.some(pattern => 
    pattern.test(errorMessage) || pattern.test(errorString)
  );
}

/**
 * Extract epoch information from error message if available
 */
export function extractEpochInfo(error: any): {
  maxEpoch?: number;
  currentEpoch?: number;
  maxAccepted?: number;
} | null {
  if (!error) return null;
  
  const errorMessage = error.message || error.toString() || '';
  
  // Try to extract epoch numbers from error message
  // Example: "ZKLogin max epoch too large 930, current epoch 130, max accepted: 160"
  const epochMatch = errorMessage.match(/max epoch.*?(\d+).*?current epoch.*?(\d+).*?max accepted.*?(\d+)/i);
  
  if (epochMatch) {
    return {
      maxEpoch: parseInt(epochMatch[1], 10),
      currentEpoch: parseInt(epochMatch[2], 10),
      maxAccepted: parseInt(epochMatch[3], 10),
    };
  }
  
  return null;
}

/**
 * Get a user-friendly error message for epoch expiration
 */
export function getEpochExpirationMessage(error: any): string {
  const epochInfo = extractEpochInfo(error);
  
  if (epochInfo) {
    return `Your zkLogin session has expired (epoch mismatch). ` +
           `Please disconnect and reconnect your wallet to continue. ` +
           `Current epoch: ${epochInfo.currentEpoch}, ` +
           `Session epoch: ${epochInfo.maxEpoch}, ` +
           `Max accepted: ${epochInfo.maxAccepted}`;
  }
  
  return `Your zkLogin session has expired. ` +
         `Please disconnect and reconnect your wallet to get a fresh session.`;
}

