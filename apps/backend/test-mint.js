const { SuiClient } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { decodeSuiPrivateKey } = require('@mysten/sui.js/cryptography');

async function testMint() {
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

  const privateKey = 'suiprivkey1qzecr3n6t6hjrdakn020e9phpry8dyp7lmvy50g3c7rzyv3gnkw76754g9u';
  const decoded = decodeSuiPrivateKey(privateKey);
  const keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
  const address = keypair.getPublicKey().toSuiAddress();

  console.log('Platform address:', address);

  const MEMBERSHIP_PACKAGE = '0x0eb4bf5b4fbef1f189ec205d9d78f6ef053332d677706e74b01437bccb1d41a2';
  const MEMBER_REGISTRY = '0xd3bad590ec0a2389c6ac6d0913b7d41331b6c084893457529745afc50216d921';

  const durationDays = 30;
  const price = 2_500_000_000; // 2.5 SUI in MIST

  const tx = new TransactionBlock();
  tx.setSender(address);

  // Split coins for payment
  const [coin] = tx.splitCoins(tx.gas, [price]);

  console.log('Coin object:', coin);
  console.log('Coin type:', typeof coin);

  // Call mint_membership
  tx.moveCall({
    target: `${MEMBERSHIP_PACKAGE}::membership::mint_membership`,
    arguments: [
      tx.object(MEMBER_REGISTRY),
      tx.pure.u64(durationDays),
      coin,
    ],
  });

  try {
    console.log('\nAttempting to build transaction...');
    const builtTx = await tx.build({ client });
    console.log('Transaction built successfully!');
    console.log('Transaction digest:', Buffer.from(builtTx).toString('base64').substring(0, 50) + '...');

    console.log('\nAttempting to execute transaction...');
    const result = await client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: keypair,
      options: { showEffects: true, showObjectChanges: true },
    });

    console.log('\nSuccess!');
    console.log('Transaction digest:', result.digest);
    console.log('Effects:', JSON.stringify(result.effects, null, 2));

  } catch (error) {
    console.error('\nError occurred:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

testMint().catch(console.error);
