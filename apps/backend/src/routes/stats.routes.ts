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
      contentCreators,
      earningsData
    ] = await Promise.all([
      // Count active memberships
      prisma.memberships.count({
        where: {
          is_active: true
        }
      }),

      // Count all content
      prisma.content.count(),

      // Count unique content creators (uploaders with at least 1 piece of content)
      prisma.uploader_profiles.count({
        where: {
          total_content_uploaded: {
            gt: 0
          }
        }
      }),

      // Sum total earnings across all creators
      prisma.uploader_profiles.aggregate({
        _sum: {
          total_earnings: true
        }
      })
    ]);

    // Convert BigInt to number and format earnings
    const totalEarningsMist = earningsData._sum.total_earnings || BigInt(0);
    const totalEarningsSUI = Number(totalEarningsMist) / 1_000_000_000; // Convert MIST to SUI
    const monthlyEarningsEstimate = Math.floor(totalEarningsSUI / 4); // Rough estimate

    res.json({
      activeMembers,
      totalContent,
      contentCreators,
      creatorEarnings: {
        totalSUI: totalEarningsSUI,
        monthlyEstimate: monthlyEarningsEstimate,
        formatted: `$${(monthlyEarningsEstimate * 2).toLocaleString()}/mo` // Assume ~$2 per SUI for display
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
