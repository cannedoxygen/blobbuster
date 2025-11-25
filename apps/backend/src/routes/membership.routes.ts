import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getSuiBlockchainService } from '../services/suiBlockchain.service';
import { NFTCardService } from '../services/nftCard.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const suiService = getSuiBlockchainService();
const nftCardService = new NFTCardService();

// Initialize NFT card service
nftCardService.init().catch(err => {
  logger.error('Failed to initialize NFT card service', { error: err });
});

/**
 * GET /api/membership/info
 * Get membership information
 */
router.get('/info', async (req, res) => {
  res.json({
    membership: {
      name: 'Blockbuster Membership',
      priceUSD: 5,
      priceSUI: 2.5,
      billingPeriod: 'monthly',
      features: [
        'Unlimited streaming access',
        'Support content creators',
        'Retro Blockbuster card NFT',
        'Dynamic card that changes when expired',
        'Unique member number',
      ],
      description: 'Simple monthly membership - Just like the good old days, but better.',
    },
  });
});

/**
 * POST /api/membership/prepare
 * Generate personalized NFT cards before minting
 * Returns the image URL to use when minting the NFT
 * Requires: Authentication
 */
router.post('/prepare', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    logger.info('Preparing membership cards', { userId });

    // Get user's wallet address
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { wallet_address: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get the next member number from blockchain registry
    const registryInfo = await suiService.getMemberRegistryInfo();
    const nextMemberNumber = registryInfo.totalMembers + 1;

    logger.info('Generating cards for new member', {
      userId,
      memberNumber: nextMemberNumber,
      walletAddress: user.wallet_address,
    });

    // Generate both ACTIVE and EXPIRED cards
    const cardResult = await nftCardService.generateMembershipCards(
      nextMemberNumber,
      user.wallet_address
    );

    logger.info('Cards generated and uploaded to IPFS', {
      userId,
      memberNumber: nextMemberNumber,
      activeCardUrl: cardResult.activeCardUrl,
      expiredCardUrl: cardResult.expiredCardUrl,
    });

    res.json({
      success: true,
      memberNumber: nextMemberNumber,
      activeCardUrl: cardResult.activeCardUrl,
      expiredCardUrl: cardResult.expiredCardUrl,
      activeCardBlobId: cardResult.activeCardCID,
      expiredCardBlobId: cardResult.expiredCardCID,
      message: `Cards generated for Member #${String(nextMemberNumber).padStart(6, '0')}`,
    });
  } catch (error) {
    logger.error('Card preparation failed', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to prepare membership cards',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/membership/confirm
 * Confirm membership purchase after user has paid with their wallet
 * Body: { txDigest: string, nftId: string, durationDays: number, activeCardUrl: string, expiredCardUrl: string }
 * Requires: Authentication
 */
router.post('/confirm', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { txDigest, nftId, durationDays, activeCardUrl, expiredCardUrl, activeCardCID, expiredCardCID, referralCode } = req.body;

    if (!txDigest || !nftId) {
      return res.status(400).json({
        success: false,
        error: 'Missing transaction digest or NFT ID',
      });
    }

    if (!activeCardUrl || !expiredCardUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing card URLs - please call /prepare first',
      });
    }

    logger.info('Confirming membership purchase', { userId, txDigest, nftId, referralCode });

    // Check if user already has an active membership
    const existingMembership = await prisma.memberships.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: {
          gte: new Date(),
        },
      },
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active membership',
        code: 'ALREADY_HAS_MEMBERSHIP',
      });
    }

    // Verify NFT exists and get details from blockchain
    const nftDetails = await suiService.verifyMembership(nftId);

    logger.info('NFT verified on blockchain', {
      userId,
      nftId,
      memberNumber: nftDetails.memberNumber,
      expiresAt: nftDetails.expiresAt,
    });

    // Save membership to database
    const issuedAt = new Date();
    const expiresAt = new Date(nftDetails.expiresAt);

    // If referral code provided, validate and increment provider's count
    let normalizedReferralCode: string | null = null;
    if (referralCode && typeof referralCode === 'string') {
      normalizedReferralCode = referralCode.toUpperCase().trim();

      if (normalizedReferralCode.length === 5) {
        try {
          // Increment provider's referral count atomically
          await prisma.uploader_profiles.updateMany({
            where: { referral_code: normalizedReferralCode },
            data: {
              referral_count: {
                increment: 1,
              },
            },
          });
          logger.info('Referral tracked', { referralCode: normalizedReferralCode, userId });
        } catch (error) {
          logger.warn('Failed to track referral', { referralCode: normalizedReferralCode, error });
          // Don't fail the whole request if referral tracking fails
        }
      }
    }

    const membership = await prisma.memberships.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        nft_object_id: nftId,
        member_number: nftDetails.memberNumber,
        tier: 1, // Single tier
        issued_at: issuedAt,
        expires_at: expiresAt,
        is_active: true,
        active_card_url: activeCardUrl,
        expired_card_url: expiredCardUrl,
        active_card_cid: activeCardCID,
        expired_card_cid: expiredCardCID,
        referred_by_code: normalizedReferralCode,
      },
    });

    logger.info('Membership saved to database', {
      userId,
      membershipId: membership.id,
      memberNumber: nftDetails.memberNumber,
      txDigest,
      referredBy: normalizedReferralCode,
    });

    res.json({
      success: true,
      membership: {
        id: membership.id,
        nftId,
        memberNumber: nftDetails.memberNumber,
        issuedAt,
        expiresAt,
        txDigest,
      },
      message: `Welcome, Member #${nftDetails.memberNumber}!`,
    });
  } catch (error) {
    logger.error('Membership confirmation failed', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to confirm membership',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/membership/:nftId
 * Get membership details by NFT ID
 */
router.get('/:nftId', async (req: Request, res: Response) => {
  try {
    const { nftId } = req.params;

    // Get from database
    const membership = await prisma.memberships.findUnique({
      where: { nft_object_id: nftId },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            wallet_address: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: 'Membership not found',
      });
    }

    // Verify on blockchain
    const nftDetails = await suiService.verifyMembership(nftId);

    res.json({
      success: true,
      membership: {
        id: membership.id,
        nftId: membership.nft_object_id,
        memberNumber: membership.member_number,
        isActive: nftDetails.isActive,
        issuedAt: membership.issued_at,
        expiresAt: membership.expires_at,
        owner: {
          id: membership.users.id,
          username: membership.users.username,
          walletAddress: nftDetails.owner,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get membership', {
      nftId: req.params.nftId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve membership',
    });
  }
});

/**
 * GET /api/membership/user/me
 * Get current user's membership
 * Requires: Authentication
 */
router.get('/user/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const membership = await prisma.memberships.findFirst({
      where: {
        user_id: userId,
        is_active: true,
      },
      orderBy: {
        expires_at: 'desc',
      },
    });

    if (!membership) {
      return res.json({
        success: true,
        hasMembership: false,
      });
    }

    // Check if still active on blockchain
    const nftDetails = await suiService.verifyMembership(membership.nft_object_id);

    res.json({
      success: true,
      hasMembership: true,
      membership: {
        id: membership.id,
        nftId: membership.nft_object_id,
        memberNumber: membership.member_number,
        isActive: nftDetails.isActive,
        issuedAt: membership.issued_at,
        expiresAt: membership.expires_at,
        activeCardUrl: membership.active_card_url,
        expiredCardUrl: membership.expired_card_url,
        activeCardCid: membership.active_card_cid,
        expiredCardCid: membership.expired_card_cid,
      },
    });
  } catch (error) {
    logger.error('Failed to get user membership', {
      userId: req.user!.userId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve membership',
    });
  }
});

export default router;
