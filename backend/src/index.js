import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { config, validateEnv } from './config/index.js';
import logger from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import routes from './routes/index.js';

validateEnv();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(logger);

app.use('/', routes);

// Fallback error handler
app.use(errorHandler);

const server = app.listen(config.PORT, () => {
  console.log(`🚇 Underfoot backend running on :${config.PORT}`);
  console.log(`📍 Default search radius: ${config.DEFAULT_RADIUS_MILES} miles`);
  console.log(`💾 Cache TTL: ${config.CACHE_TTL_SECONDS} seconds`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
