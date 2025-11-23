#!/usr/bin/env node

/**
 * Database Wake-Up Script
 * This script pings the backend health endpoint to wake up the database
 *
 * Usage:
 *   node wake-db.js
 *   npm run wake-db
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://blockbuster.simp.wtf';

async function wakeDatabase() {
  console.log('🔄 Waking up database...\n');

  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();

    if (data.database === 'connected') {
      console.log('✅ Database is awake and connected!');
      console.log('');
      console.log('Status:', data.status);
      console.log('Database:', data.database);
      console.log('Timestamp:', data.timestamp);
      console.log('Uptime:', Math.floor(data.uptime), 'seconds');
    } else {
      console.log('⚠️  Database connection failed');
      console.log('');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Failed to wake database:', error.message);
    console.error('');
    console.error('Make sure the backend is running at:', BACKEND_URL);
  }

  console.log('');
  console.log('Backend URL:', `${BACKEND_URL}/health`);
}

wakeDatabase();
