import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { config } from './config/environment';
import webhookRoutes from './webhook-routes';

// Create Express app
const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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
  `);
});

export default app;