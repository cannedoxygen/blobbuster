import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteSuperMarioBros() {
  try {
    // Find all Super Mario Bros movies
    const marioMovies = await prisma.content.findMany({
      where: {
        title: {
          contains: 'Super Mario',
          mode: 'insensitive'
        }
      }
    });

    console.log(`Found ${marioMovies.length} Super Mario Bros movie(s)`);

    if (marioMovies.length === 0) {
      console.log('No Super Mario Bros movies found');
      return;
    }

    const movieIds = marioMovies.map(m => m.id);

    // First, delete related streams
    const deletedStreams = await prisma.streams.deleteMany({
      where: {
        content_id: {
          in: movieIds
        }
      }
    });
    console.log(`Deleted ${deletedStreams.count} related stream(s)`);

    // Now delete the movies
    const result = await prisma.content.deleteMany({
      where: {
        title: {
          contains: 'Super Mario',
          mode: 'insensitive'
        }
      }
    });

    console.log(`✅ Deleted ${result.count} Super Mario Bros movie(s)`);
  } catch (error) {
    console.error('Error deleting movies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSuperMarioBros();
