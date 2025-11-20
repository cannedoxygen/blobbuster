import { getSuiBlockchainService } from '../src/services/suiBlockchain.service';
import { prisma } from '../src/config/database';
import { v4 as uuidv4 } from 'uuid';

async function checkAndRegisterNFT() {
  const walletAddress = '0xbabef45b0138d2fbde97cb9847372c25ba219e24242f36c67e02c540fa8d9301';
  
  try {
    console.log('🔍 Checking for user and memberships...');
    
    // Get or create user
    let user = await prisma.users.findUnique({
      where: { wallet_address: walletAddress }
    });

    if (!user) {
      console.log('Creating user...');
      user = await prisma.users.create({
        data: {
          id: uuidv4(),
          wallet_address: walletAddress,
          username: null,
          email: null,
        }
      });
      console.log('✅ User created:', user.id);
    } else {
      console.log('✅ User exists:', user.id);
    }

    // Check existing memberships
    const memberships = await prisma.memberships.findMany({
      where: { user_id: user.id }
    });

    console.log(`Found ${memberships.length} memberships in database`);
    
    // Get NFTs from wallet
    const suiService = getSuiBlockchainService();
    console.log('\n🔍 Checking wallet for MembershipNFTs...');
    
    // We need to manually check the known NFT IDs
    // Based on the new package: 0x948626348d49f3e8dfe0da5aa928721deaccc830490cdd39083c393961600ef8
    
    const knownNFTs = [
      // Add any NFT IDs we find from the wallet
    ];

    console.log('\n📋 Current memberships in database:');
    for (const m of memberships) {
      console.log(`  - Member #${m.member_number}, NFT: ${m.nft_object_id}, Expires: ${m.expires_at}`);
    }

    console.log('\nℹ️  To find your NFT, run:');
    console.log('sui client objects YOUR_ADDRESS | grep -A 3 MembershipNFT');
    
  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndRegisterNFT();
