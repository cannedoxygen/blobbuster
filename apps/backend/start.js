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

// Setup Walrus CLI configuration
console.log('=== WALRUS CLI SETUP ===');
try {
  const os = require('os');
  const homeDir = os.homedir();

  // Create Walrus config directory
  const walrusConfigDir = path.join(homeDir, '.config', 'walrus');
  const suiConfigDir = path.join(homeDir, '.sui', 'sui_config');

  if (!fs.existsSync(walrusConfigDir)) {
    fs.mkdirSync(walrusConfigDir, { recursive: true });
    console.log('  Created Walrus config directory');
  }

  if (!fs.existsSync(suiConfigDir)) {
    fs.mkdirSync(suiConfigDir, { recursive: true });
    console.log('  Created Sui config directory');
  }

  // Create Walrus client config
  const walrusConfig = `contexts:
  testnet:
    system_object: 0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af
    staking_object: 0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3
    exchange_objects:
      - 0xf4d164ea2def5fe07dc573992a029e010dba09b1a8dcbc44c5c2e79567f39073
      - 0x19825121c52080bb1073662231cfea5c0e4d905fd13e95f21e9a018f2ef41862
      - 0x83b454e524c71f30803f4d6c302a86fb6a39e96cdfb873c2d1e93bc1c26a3bc5
      - 0x8d63209cf8589ce7aef8f262437163c67577ed09f3e636a9d8e0813843fb8bf1
    wallet_config: ~/.sui/sui_config/client.yaml
  mainnet:
    system_object: 0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2
    staking_object: 0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904
    wallet_config: ~/.sui/sui_config/client.yaml
default_context: mainnet
`;

  const walrusConfigPath = path.join(walrusConfigDir, 'client_config.yaml');
  fs.writeFileSync(walrusConfigPath, walrusConfig);
  console.log('  ✓ Walrus config created at:', walrusConfigPath);

  // Create Sui wallet config
  // Use platform wallet address from environment
  const platformWallet = process.env.PLATFORM_WALLET || '0x0';
  const keystoreFilePath = path.join(suiConfigDir, 'sui.keystore');

  // Build YAML line by line with explicit newlines to avoid template literal issues
  const suiConfigLines = [
    '---',
    'keystore:',
    '  File: ' + keystoreFilePath,
    'envs:',
    '  - alias: mainnet',
    '    rpc: "https://fullnode.mainnet.sui.io:443"',
    '    ws: ~',
    '    basic_auth: ~',
    '  - alias: testnet',
    '    rpc: "https://fullnode.testnet.sui.io:443"',
    '    ws: ~',
    '    basic_auth: ~',
    'active_env: mainnet',
    'active_address: "' + platformWallet + '"',
    '' // trailing newline
  ];
  const suiConfig = suiConfigLines.join('\n');

  const suiConfigPath = path.join(suiConfigDir, 'client.yaml');
  fs.writeFileSync(suiConfigPath, suiConfig, 'utf8');
  console.log('  ✓ Sui wallet config created at:', suiConfigPath);
  console.log('    Keystore path:', keystoreFilePath);
  console.log('    Active address:', platformWallet);
  console.log('    File size:', suiConfig.length, 'bytes');
  console.log('    First 200 chars:');
  console.log(JSON.stringify(suiConfig.substring(0, 200)));

  // Create keystore if SUI_PRIVATE_KEY is provided
  const keystorePath = path.join(suiConfigDir, 'sui.keystore');
  if (process.env.SUI_PRIVATE_KEY) {
    const privateKey = process.env.SUI_PRIVATE_KEY.trim();

    // Write key directly to keystore (must be base64 format for Walrus CLI)
    const keystore = [privateKey];
    const formattedKeystore = JSON.stringify(keystore, null, 2);
    fs.writeFileSync(keystorePath, formattedKeystore, 'utf8');

    console.log('  ✓ Sui keystore created from SUI_PRIVATE_KEY');
    console.log('    Key length:', privateKey.length);
    console.log('    Keystore file size:', formattedKeystore.length, 'bytes');

    // Validate the keystore was written correctly
    const writtenContent = fs.readFileSync(keystorePath, 'utf8');
    console.log('    Keystore first 50 chars:', writtenContent.substring(0, 50));
  } else {
    // Create empty keystore
    fs.writeFileSync(keystorePath, '[\n\n]', 'utf8');
    console.log('  ⚠ Warning: No SUI_PRIVATE_KEY set, created empty keystore');
    console.log('    Walrus CLI uploads will fail without a valid wallet');
  }

  console.log('  ✓ Walrus CLI configuration complete');
} catch (error) {
  console.error('  ✗ Failed to setup Walrus config:', error.message);
  console.error('    Walrus CLI uploads may fail - continuing anyway...');
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
