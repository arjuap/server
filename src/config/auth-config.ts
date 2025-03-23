import { config } from './environment';
import { storeUserDetails, getAuthTokenByPhone } from './user-details';

export const API_BASE_URL = config.api.baseUrl;

// Function to update the token with enhanced logging
export const updateAuthToken = (newToken: string, phoneNumber?: string): void => {
  // Store user details if phone number is provided
  if (phoneNumber) {
    storeUserDetails(phoneNumber, newToken);
  }
  
  // Log token receipt with partial display for security
  const tokenPreview = newToken.length > 15 
    ? `${newToken.substring(0, 6)}...${newToken.substring(newToken.length - 4)}`
    : '(short token)';
  
  console.log('=================================================');
  console.log('AUTH TOKEN RECEIVED AND UPDATED');
  console.log(`Token preview: ${tokenPreview}`);
  console.log(`Token length: ${newToken.length} characters`);
  if (phoneNumber) {
    console.log(`Associated phone number: ${phoneNumber}`);
  }
  console.log('=================================================');
};