import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/stats/platform
 * Get platform-wide statistics
 */
router.get('/platform', async (req, res) => {
  try {
    // Run all queries in parallel
    const [
      activeMembers,
      totalContent,
      contentCreatorsData,
      earningsData,
      totalStreamsData
    ] = await Promise.all([
      // Count active memberships
      prisma.memberships.count({
        where: {
          is_active: true
        }
      }),

      // Count all content
      prisma.content.count(),

      // Count unique uploaders who have created content
      prisma.content.groupBy({
        by: ['uploader_id'],
        _count: {
          uploader_id: true
        }
      }),

      // Sum total earnings across all creators
      prisma.uploader_profiles.aggregate({
        _sum: {
          total_earnings: true
        }
      }),

      // Sum total streams for revenue calculation
      prisma.streams.count()
    ]);

    const contentCreators = contentCreatorsData.length;

    // Convert BigInt to number and format earnings
    const totalEarningsMist = earningsData._sum.total_earnings || BigInt(0);
    const totalEarningsSUI = Number(totalEarningsMist) / 1_000_000_000; // Convert MIST to SUI

    // Estimate monthly earnings based on total streams and average revenue per stream
    // Assume each stream generates ~0.1 SUI for creators
    const estimatedMonthlyStreams = Math.floor(totalStreamsData / 30); // Rough daily average
    const monthlyRevenue = estimatedMonthlyStreams * 0.1; // 0.1 SUI per stream
    const monthlyRevenueUSD = Math.floor(monthlyRevenue * 2); // ~$2 per SUI

    res.json({
      activeMembers,
      totalContent,
      contentCreators,
      creatorEarnings: {
        totalSUI: totalEarningsSUI,
        monthlyEstimate: monthlyRevenue,
        formatted: monthlyRevenueUSD > 0 ? `$${monthlyRevenueUSD.toLocaleString()}/mo` : '$0/mo'
      }
    });
  } catch (error) {
    logger.error('Error fetching platform stats:', error);
    res.status(500).json({
      error: 'Failed to fetch platform statistics'
    });
  }
});

export default router;
