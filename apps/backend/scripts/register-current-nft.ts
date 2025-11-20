import { getSuiBlockchainService } from '../src/services/suiBlockchain.service';
import { prisma } from '../src/config/database';
import { v4 as uuidv4 } from 'uuid';

async function registerCurrentNFT() {
  const nftId = '0x0d71d8cca24089eea62233fbe84fb4653a39afe0eaeae2718eb081685bdc399f';
  const walletAddress = '0xbabef45b0138d2fbde97cb9847372c25ba219e24242f36c67e02c540fa8d9301';

  try {
    console.log('🔍 Checking for user...');

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

    console.log('\n🔍 Verifying NFT on blockchain...');
    const suiService = getSuiBlockchainService();
    const nftDetails = await suiService.verifyMembership(nftId);

    console.log('✅ NFT verified on chain:');
    console.log(`  - Member #${nftDetails.memberNumber}`);
    console.log(`  - Issued: ${new Date(nftDetails.issuedAt).toLocaleString()}`);
    console.log(`  - Expires: ${new Date(nftDetails.expiresAt).toLocaleString()}`);
    console.log(`  - Active: ${nftDetails.isActive}`);

    // Check if already registered
    const existing = await prisma.memberships.findFirst({
      where: { nft_object_id: nftId }
    });

    if (existing) {
      console.log('\n⚠️  NFT already registered in database');
      return;
    }

    console.log('\n💾 Registering NFT in database...');
    const membership = await prisma.memberships.create({
      data: {
        id: uuidv4(),
        user_id: user.id,
        nft_object_id: nftId,
        member_number: nftDetails.memberNumber,
        tier: 1,
        issued_at: new Date(nftDetails.issuedAt),
        expires_at: new Date(nftDetails.expiresAt),
        is_active: nftDetails.isActive,
      }
    });

    console.log('🎉 SUCCESS! Membership registered!');
    console.log(`  - Database ID: ${membership.id}`);
    console.log(`  - Member #${membership.member_number}`);
    console.log('\n✅ You can now refresh the membership page to see your membership details!');

  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

registerCurrentNFT();
