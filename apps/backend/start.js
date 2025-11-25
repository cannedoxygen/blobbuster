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

    let keystoreKey = privateKey;

    // Walrus CLI requires base64 format in keystore
    // If the key is in bech32 format (suiprivkey1...), convert it to base64
    if (privateKey.startsWith('suiprivkey1')) {
      console.log('  Converting bech32 private key to base64 format...');
      try {
        // Import Sui SDK to decode bech32
        const { decodeSuiPrivateKey } = require('@mysten/sui.js/cryptography');

        // Decode bech32 to get raw bytes
        const decoded = decodeSuiPrivateKey(privateKey);

        // Sui keystore expects: [flag byte (1 byte) || private key (32 bytes)]
        // The decoded.secretKey is 32 bytes, we need to prepend the scheme flag
        const ED25519_FLAG = 0x00;
        const fullKey = Buffer.concat([
          Buffer.from([ED25519_FLAG]),
          Buffer.from(decoded.secretKey)
        ]);

        // Convert to base64
        keystoreKey = fullKey.toString('base64');
        console.log('  ✓ Converted bech32 to base64 format');
        console.log('    Base64 key length:', keystoreKey.length);
      } catch (conversionError) {
        console.error('  ✗ Failed to convert bech32 key:', conversionError.message);
        console.error('    Using original key format (will likely fail)');
      }
    } else {
      console.log('  Key is already in base64 format');
    }

    // Write keystore with base64 format
    const keystore = [keystoreKey];
    const formattedKeystore = JSON.stringify(keystore, null, 2);
    fs.writeFileSync(keystorePath, formattedKeystore, 'utf8');

    console.log('  ✓ Sui keystore created from SUI_PRIVATE_KEY');
    console.log('    Final keystore key format:', keystoreKey.startsWith('suiprivkey1') ? 'bech32' : 'base64');
    console.log('    Final keystore key length:', keystoreKey.length);

    // Validate the keystore was written correctly
    const writtenContent = fs.readFileSync(keystorePath, 'utf8');
    console.log('    Keystore file first 100 chars:', writtenContent.substring(0, 100));
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

// Test Walrus CLI with small file
console.log('=== WALRUS CLI TEST ===');
try {
  const { execSync } = require('child_process');
  const testFilePath = path.join(__dirname, 'walrus-test.txt');

  // Create a small test file
  fs.writeFileSync(testFilePath, 'Hello Walrus! This is a test upload.', 'utf8');
  console.log('  ✓ Created test file:', testFilePath);
  console.log('    File size:', fs.statSync(testFilePath).size, 'bytes');

  // Check if Walrus CLI exists
  const walrusCliPath = path.join(process.env.HOME || '/root', '.local', 'bin', 'walrus');
  if (fs.existsSync(walrusCliPath)) {
    console.log('  ✓ Walrus CLI found at:', walrusCliPath);
  } else {
    console.log('  ✗ Walrus CLI not found at:', walrusCliPath);
  }

  // Verify config files exist
  const walrusConfigPath = path.join(process.env.HOME || '/root', '.config', 'walrus', 'client_config.yaml');
  const suiConfigPath = path.join(process.env.HOME || '/root', '.sui', 'sui_config', 'client.yaml');
  const keystorePath = path.join(process.env.HOME || '/root', '.sui', 'sui_config', 'sui.keystore');

  console.log('  Config files:');
  console.log('    Walrus config:', fs.existsSync(walrusConfigPath) ? '✓' : '✗');
  console.log('    Sui config:', fs.existsSync(suiConfigPath) ? '✓' : '✗');
  console.log('    Keystore:', fs.existsSync(keystorePath) ? '✓' : '✗');

  // Read and display first 300 bytes of client.yaml
  if (fs.existsSync(suiConfigPath)) {
    const clientYaml = fs.readFileSync(suiConfigPath, 'utf8');
    console.log('  client.yaml first 300 chars:');
    console.log('    ' + JSON.stringify(clientYaml.substring(0, 300)));
  }

  // Read and display keystore
  if (fs.existsSync(keystorePath)) {
    const keystore = fs.readFileSync(keystorePath, 'utf8');
    console.log('  Keystore preview (first 60 chars):');
    console.log('    ' + JSON.stringify(keystore.substring(0, 60)));
  }

  console.log('');
  console.log('  Attempting Walrus CLI upload...');

  // Try to upload the test file with detailed error capture
  const walrusCmd = `${walrusCliPath} store --epochs 1 --json "${testFilePath}"`;
  console.log('  Command:', walrusCmd);

  try {
    const output = execSync(walrusCmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });
    console.log('  ✓ Walrus CLI upload successful!');
    console.log('  Output:', output);
  } catch (uploadError) {
    console.error('  ✗ Walrus CLI upload failed');
    console.error('  Error code:', uploadError.status);
    console.error('  stdout:', uploadError.stdout?.toString());
    console.error('  stderr:', uploadError.stderr?.toString());

    // Try to get more details about the YAML parsing error
    console.log('');
    console.log('  Debugging YAML structure:');
    if (fs.existsSync(suiConfigPath)) {
      const content = fs.readFileSync(suiConfigPath, 'utf8');
      const lines = content.split('\n');
      console.log('  Total lines:', lines.length);
      console.log('  Line 1:', JSON.stringify(lines[0]));
      console.log('  Line 2:', JSON.stringify(lines[1]));
      console.log('  Line 3:', JSON.stringify(lines[2]));

      // Check for non-printable characters
      console.log('  Checking for non-printable characters in line 2:');
      const line2Bytes = Buffer.from(lines[1], 'utf8');
      console.log('  Line 2 hex:', line2Bytes.toString('hex'));
      console.log('  Line 2 bytes:', Array.from(line2Bytes).map(b => b + ' (0x' + b.toString(16) + ')').join(', '));
    }
  }

  // Cleanup test file
  try {
    fs.unlinkSync(testFilePath);
    console.log('  ✓ Test file cleaned up');
  } catch (cleanupError) {
    console.log('  Note: Could not cleanup test file');
  }
} catch (testError) {
  console.error('  ✗ Walrus CLI test failed:', testError.message);
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
