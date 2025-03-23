import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config/environment';
import webhookRoutes from './webhook-routes';
import { userDetails } from './config/user-details';

// Create Express app
const app = express();
const PORT = process.env.PORT || config.port || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use(webhookRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
    🚀 Server is running on port ${PORT}
    🌎 Environment: ${config.nodeEnv}
    ⏱️  Started at: ${new Date().toISOString()}
    📝 Checking for PORT environment variable: ${process.env.PORT ? 'Found' : 'Not found'}
  `);
  
  // Log user details persistence information
  const USER_DETAILS_FILE = path.join(__dirname, './data/user-details.json');
  const fileExists = fs.existsSync(USER_DETAILS_FILE);
  
  console.log(`
    📋 User Authentication Details
    📱 Users in memory: ${Object.keys(userDetails).length}
    💾 Persistence file: ${fileExists ? 'Found' : 'Not found'}
    🔒 Auth tokens will ${fileExists ? 'persist' : 'not persist'} between restarts
    📁 Storage location: ${USER_DETAILS_FILE}
  `);
});

export default app;