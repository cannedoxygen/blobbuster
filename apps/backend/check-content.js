const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkContent() {
  try {
    const content = await prisma.content.findMany({
      where: {
        walrus_blob_ids: {
          contains: 'CWy85IWXfbDiGxqyGVaNR228P07YADLStWT789toYKg'
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 1
    });

    if (content.length > 0) {
      console.log('Content found:');
      console.log(JSON.stringify(content[0], null, 2));
      console.log('\n=== VIEWING LINK ===');
      console.log(`http://localhost:3000/watch/${content[0].id}`);
    } else {
      console.log('No content found with this blob ID');
      
      // Try getting the latest Fight Club upload
      const latestFightClub = await prisma.content.findMany({
        where: {
          title: {
            contains: 'Fight Club'
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 1
      });
      
      if (latestFightClub.length > 0) {
        console.log('\nLatest Fight Club upload:');
        console.log(JSON.stringify(latestFightClub[0], null, 2));
        console.log('\n=== VIEWING LINK ===');
        console.log(`http://localhost:3000/watch/${latestFightClub[0].id}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkContent();
