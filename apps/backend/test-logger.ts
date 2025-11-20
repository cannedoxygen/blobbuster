import dotenv from 'dotenv';
dotenv.config();

console.log('TEST 1: Dotenv loaded');

import { logger } from './src/utils/logger';
console.log('TEST 2: Logger imported');

logger.info('TEST 3: Logger works');

console.log('TEST 4: Attempting to import app.ts...');
import { app } from './src/app';
console.log('TEST 5: app.ts imported successfully');

logger.info('TEST: All imports successful');
console.log('TEST 6: Script completed');
