import { getSuiBlockchainService } from '../src/services/suiBlockchain.service';
import { prisma } from '../src/config/database';
import { v4 as uuidv4 } from 'uuid';

async function registerExistingMembership() {
  const nftId = '0x88a37791c417d183b5488e2b0342a12f863f9bb0459dc3254c589345e9e70d71';
  const walletAddress = '0xbabef45b0138d2fbde97cb9847372c25ba219e24242f36c67e02c540fa8d9301';

  try {
    console.log('🔍 Looking up user...');

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
    }

    console.log('✅ User ID:', user.id);

    // Check if membership already exists
    const existing = await prisma.memberships.findUnique({
      where: { nft_object_id: nftId }
    });

    if (existing) {
      console.log('✅ Membership already registered:', existing.id);
      console.log('   Member #:', existing.member_number);
      return;
    }

    console.log('🔍 Verifying NFT on blockchain...');

    // Verify NFT on blockchain
    const suiService = getSuiBlockchainService();
    const nftDetails = await suiService.verifyMembership(nftId);

    console.log('✅ NFT Details:');
    console.log('   Member Number:', nftDetails.memberNumber);
    console.log('   Owner:', nftDetails.owner);
    console.log('   Issued:', new Date(nftDetails.issuedAt).toLocaleString());
    console.log('   Expires:', new Date(nftDetails.expiresAt).toLocaleString());
    console.log('   Active:', nftDetails.isActive);

    console.log('💾 Registering in database...');

    // Register membership
    const membership = await prisma.memberships.create({
      data: {
        id: uuidv4(),
        user_id: user.id,
        nft_object_id: nftId,
        member_number: nftDetails.memberNumber,
        tier: 1,
        issued_at: new Date(nftDetails.issuedAt),
        expires_at: new Date(nftDetails.expiresAt),
        is_active: true,
      }
    });

    console.log('');
    console.log('🎉 SUCCESS! Membership registered!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Membership ID:', membership.id);
    console.log('Member Number:', `#${membership.member_number}`);
    console.log('Expires:', membership.expires_at.toLocaleString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('You can now use your membership! Refresh the frontend.');
  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

registerExistingMembership();
