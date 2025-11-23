#!/usr/bin/env node

/**
 * Railway Startup Wrapper
 * Catches module loading errors and provides diagnostic output
 */

console.log('=== RAILWAY STARTUP DIAGNOSTICS ===');
console.log('Working Directory:', process.cwd());
console.log('Node Version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Memory:', Math.round(process.memoryUsage().heapTotal / 1024 / 1024), 'MB');
console.log('');

// Check critical environment variables
console.log('Environment Variables Check:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  PORT:', process.env.PORT || 'not set');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ set' : '✗ MISSING');
console.log('');

// Check file system
const fs = require('fs');
const path = require('path');

console.log('File System Check:');
const distPath = path.join(__dirname, 'dist', 'index.js');
console.log('  dist/index.js exists:', fs.existsSync(distPath) ? '✓' : '✗ MISSING');

const nodeModulesPath = path.join(__dirname, '../../node_modules');
console.log('  node_modules (root):', fs.existsSync(nodeModulesPath) ? '✓' : '✗');

const prismaPath = path.join(__dirname, '../../node_modules/.prisma/client');
console.log('  .prisma/client:', fs.existsSync(prismaPath) ? '✓' : '✗ MISSING');
console.log('');

// Check critical dependencies
console.log('Dependency Load Test:');
const criticalDeps = [
  '@prisma/client',
  'express',
  'bcrypt',
  'sharp',
  'dotenv'
];

for (const dep of criticalDeps) {
  try {
    require.resolve(dep, { paths: [nodeModulesPath] });
    console.log(`  ${dep}: ✓`);
  } catch (err) {
    console.error(`  ${dep}: ✗ FAILED -`, err.message);
  }
}
console.log('');

// Attempt to load the main application
console.log('=== LOADING APPLICATION ===');
console.log('');

try {
  // Change to backend directory for proper path resolution
  process.chdir(__dirname);
  console.log('Changed working directory to:', process.cwd());

  // Load the compiled application
  require('./dist/index.js');
} catch (error) {
  console.error('');
  console.error('╔═══════════════════════════════════════════════════════════════╗');
  console.error('║                 MODULE LOADING FAILED                         ║');
  console.error('╚═══════════════════════════════════════════════════════════════╝');
  console.error('');
  console.error('Error Type:', error.constructor.name);
  console.error('Error Message:', error.message);
  console.error('');

  if (error.code) {
    console.error('Error Code:', error.code);
  }

  if (error.stack) {
    console.error('Stack Trace:');
    console.error(error.stack);
  }

  console.error('');
  console.error('Common Causes:');
  console.error('  1. Missing Prisma client - run "prisma generate"');
  console.error('  2. Native dependency build failure (bcrypt, sharp)');
  console.error('  3. Missing environment variables');
  console.error('  4. Import path resolution issues');
  console.error('');

  process.exit(1);
}
