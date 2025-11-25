#!/usr/bin/env node

/**
 * Wake up the Supabase database by making a simple connection
 */

const { execSync } = require('child_process');
const { Client } = require('pg');

async function wakeDatabase() {
  console.log('Attempting to wake Supabase database...');

  try {
    // Get DATABASE_URL from Railway
    const databaseUrl = execSync('railway variables --json 2>/dev/null | grep -o \'"DATABASE_URL":"[^"]*"\' | cut -d\'"\' -f4', {
      encoding: 'utf8',
      timeout: 5000
    }).trim();

    if (!databaseUrl) {
      console.error('Could not find DATABASE_URL');
      process.exit(1);
    }

    console.log('Database URL found');
    console.log('Host:', databaseUrl.match(/aws-1-us-east-1\.pooler\.supabase\.com/)?.[0] || 'unknown');

    // Use node pg module to connect
    console.log('Attempting connection...');

    const client = new Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 30000,
    });

    await client.connect();
    console.log('✓ Connected to database');

    const res = await client.query('SELECT 1 as wake_up');
    await client.end();

    console.log('✓ Database is awake!');
    console.log('Result:', res.rows);
  } catch (error) {
    console.error('Failed to wake database:', error.message);
    process.exit(1);
  }
}

wakeDatabase();
