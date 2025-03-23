import { config } from './environment';

// Make token updatable
let currentAuthToken = config.api.authToken;

export const API_BASE_URL = config.api.baseUrl;

// Getter for the token
export const AUTH_TOKEN = () => currentAuthToken;

// Function to update the token with enhanced logging
export const updateAuthToken = (newToken: string): void => {
  currentAuthToken = newToken;
  
  // Log token receipt with partial display for security
  const tokenPreview = newToken.length > 15 
    ? `${newToken.substring(0, 6)}...${newToken.substring(newToken.length - 4)}`
    : '(short token)';
  
  console.log('=================================================');
  console.log('AUTH TOKEN RECEIVED AND UPDATED');
  console.log(`Token preview: ${tokenPreview}`);
  console.log(`Token length: ${newToken.length} characters`);
  console.log('=================================================');
};