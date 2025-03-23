interface UserDetails {
  [phoneNumber: string]: string; // phoneNumber -> authToken mapping
}

// Store user details in memory
export const userDetails: UserDetails = {};

// Function to store user details
export const storeUserDetails = (phoneNumber: string, authToken: string) => {
  userDetails[phoneNumber] = authToken;
  
  console.log('=================================================');
  console.log('STORED USER DETAILS IN MEMORY');
  console.log(`Phone number: ${phoneNumber}`);
  console.log(`Auth token preview: ${authToken.substring(0, 6)}...${authToken.substring(authToken.length - 4)}`);
  console.log(`Total users in memory: ${Object.keys(userDetails).length}`);
  console.log('=================================================');
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