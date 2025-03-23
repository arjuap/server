import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    skipAuth: process.env.SKIP_TWILIO_AUTH === 'true'
  },
  
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://gl-api-mock.onrender.com',
    authToken: process.env.AUTH_TOKEN || ''
  },
  
  admin: {
    apiKey: process.env.ADMIN_API_KEY || ''
  }
};