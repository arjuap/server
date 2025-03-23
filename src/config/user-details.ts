import fs from 'fs';
import path from 'path';

interface UserDetails {
  [phoneNumber: string]: string; // phoneNumber -> authToken mapping
}

// File path for storing user details (inside src folder)
const USER_DETAILS_FILE = path.join(__dirname, '../data/user-details.json');

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(USER_DETAILS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Load user details from file
const loadUserDetails = (): UserDetails => {
  try {
    ensureDataDir();
    if (fs.existsSync(USER_DETAILS_FILE)) {
      const data = fs.readFileSync(USER_DETAILS_FILE, 'utf8');
      const loadedDetails = JSON.parse(data);
      console.log(`Loaded ${Object.keys(loadedDetails).length} user details from disk`);
      return loadedDetails;
    }
  } catch (error) {
    console.error('Error loading user details from file:', error);
  }
  return {};
};

// Save user details to file
const saveUserDetails = (details: UserDetails) => {
  try {
    ensureDataDir();
    fs.writeFileSync(USER_DETAILS_FILE, JSON.stringify(details, null, 2));
    console.log(`Saved ${Object.keys(details).length} user details to disk`);
  } catch (error) {
    console.error('Error saving user details to file:', error);
  }
};

// Store user details in memory
export const userDetails: UserDetails = loadUserDetails();

// Function to store user details
export const storeUserDetails = (phoneNumber: string, authToken: string) => {
  userDetails[phoneNumber] = authToken;
  
  console.log('=================================================');
  console.log('STORED USER DETAILS IN MEMORY');
  console.log(`Phone number: ${phoneNumber}`);
  console.log(`Auth token preview: ${authToken.substring(0, 6)}...${authToken.substring(authToken.length - 4)}`);
  console.log(`Total users in memory: ${Object.keys(userDetails).length}`);
  console.log('=================================================');
  
  // Save to persistent storage
  saveUserDetails(userDetails);
};

// Function to get auth token by phone number
export const getAuthTokenByPhone = (phoneNumber: string): string | undefined => {
  // Handle both formats: with or without 'whatsapp:' prefix
  const normalizedPhone = phoneNumber.replace('whatsapp:', '');
  const withWhatsApp = `whatsapp:${normalizedPhone}`;
  
  const token = userDetails[normalizedPhone] || userDetails[withWhatsApp];
  
  if (token) {
    console.log(`Found token for phone number: ${phoneNumber}`);
  } else {
    console.log(`No token found for phone number: ${phoneNumber}`);
  }
  
  return token;
}; 