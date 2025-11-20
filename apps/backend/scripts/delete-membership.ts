import { prisma } from '../src/config/database';

async function deleteMembership() {
  const nftId = '0x88a37791c417d183b5488e2b0342a12f863f9bb0459dc3254c589345e9e70d71';

  try {
    console.log('🗑️  Deleting old membership...');
    console.log('NFT ID:', nftId);

    // Delete the membership
    const result = await prisma.memberships.deleteMany({
      where: {
        nft_object_id: nftId
      }
    });

    if (result.count > 0) {
      console.log('✅ Membership deleted successfully!');
      console.log('Deleted count:', result.count);
    } else {
      console.log('⚠️  No membership found with that NFT ID');
    }
  } catch (error) {
    console.error('❌ Failed to delete membership:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteMembership();
