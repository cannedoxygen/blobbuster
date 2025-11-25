#!/usr/bin/env node

/**
 * Convert Sui private key from bech32 to base64 format
 * Usage: node convert-key.js suiprivkey1...
 */

const { decodeSuiPrivateKey } = require('@mysten/sui.js/cryptography');

const bech32Key = process.argv[2];

if (!bech32Key || !bech32Key.startsWith('suiprivkey1')) {
  console.error('Usage: node convert-key.js suiprivkey1...');
  console.error('Please provide a bech32-encoded Sui private key');
  process.exit(1);
}

try {
  // Decode bech32 to get raw bytes
  const decoded = decodeSuiPrivateKey(bech32Key);

  // Sui keystore expects: [flag byte (1 byte) || private key (32 bytes)]
  const ED25519_FLAG = 0x00;
  const fullKey = Buffer.concat([
    Buffer.from([ED25519_FLAG]),
    Buffer.from(decoded.secretKey)
  ]);

  // Convert to base64
  const base64Key = fullKey.toString('base64');

  console.log('\n✓ Conversion successful!\n');
  console.log('Bech32 format (input):');
  console.log(bech32Key);
  console.log('\nBase64 format (output):');
  console.log(base64Key);
  console.log('\nUpdate your Railway environment variable SUI_PRIVATE_KEY with the base64 value above.');
  console.log('');
} catch (error) {
  console.error('✗ Conversion failed:', error.message);
  process.exit(1);
}
