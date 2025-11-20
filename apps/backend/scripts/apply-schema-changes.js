const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applySchemaChanges() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const sqlPath = path.join(__dirname, '../prisma/migrations/add_points_and_watches.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL...');
    await client.query(sql);
    console.log('✅ Schema changes applied successfully!');
    console.log('- Added points column to memberships table');
    console.log('- Created membership_watches table');
    console.log('- Created indexes');

  } catch (error) {
    console.error('❌ Error applying schema changes:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchemaChanges();
