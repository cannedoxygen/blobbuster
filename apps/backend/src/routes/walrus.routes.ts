import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getWalrusPricingService } from '../services/walrusPricing.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/walrus/pricing
 * Get current Walrus storage pricing from Sui blockchain
 */
router.get('/pricing', async (req: Request, res: Response) => {
  try {
    const pricingService = getWalrusPricingService();
    const forceRefresh = req.query.refresh === 'true';

    const pricing = await pricingService.getCurrentPricing(forceRefresh);

    res.json({
      success: true,
      pricing,
      note: 'Prices are fetched directly from the Walrus system object on Sui blockchain',
    });
  } catch (error) {
    logger.error('Get Walrus pricing error:', error);
    res.status(500).json({ error: 'Failed to fetch Walrus pricing' });
  }
});

/**
 * POST /api/walrus/estimate-cost
 * Estimate storage cost for a file
 */
router.post(
  '/estimate-cost',
  [
    body('fileSizeBytes').isInt({ min: 1 }).withMessage('File size must be a positive integer'),
    body('epochs').isInt({ min: 1, max: 730 }).withMessage('Epochs must be between 1 and 730'), // Max ~2 years
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fileSizeBytes, epochs } = req.body;
      const pricingService = getWalrusPricingService();

      // Use instant formula-based estimation (no CLI calls, no crashes!)
      const estimate = await pricingService.estimateStorageCost(fileSizeBytes, epochs);

      res.json({
        success: true,
        estimate,
        note: 'Instant estimate using standard Walrus pricing formula (calibrated from real quotes)',
        method: 'formula',
      });
    } catch (error) {
      logger.error('Estimate cost error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to estimate storage cost',
      });
    }
  }
);

/**
 * GET /api/walrus/info
 * Get general information about Walrus integration
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const pricingService = getWalrusPricingService();
    const pricing = await pricingService.getCurrentPricing();

    res.json({
      success: true,
      info: {
        network: process.env.SUI_NETWORK || 'testnet',
        currentEpoch: pricing.currentEpoch,
        epochDurationDays: pricing.epochDurationDays,
        capacity: {
          total: `${(parseInt(pricing.capacity.totalBytes) / (1024 ** 4)).toFixed(2)} TB`,
          used: `${(parseInt(pricing.capacity.usedBytes) / (1024 ** 4)).toFixed(2)} TB`,
          available: `${(parseInt(pricing.capacity.availableBytes) / (1024 ** 4)).toFixed(2)} TB`,
          utilization: `${pricing.capacity.utilizationPercent.toFixed(2)}%`,
        },
        pricing: {
          storagePerGB: `${pricing.storagePrice.perGBWAL.toFixed(4)} WAL per epoch`,
          uploadPerGB: `${pricing.writePrice.perGBWAL.toFixed(4)} WAL`,
        },
        features: {
          erasureCoding: '5x redundancy (vs 500x traditional)',
          permanentStorage: true,
          deletableStorage: true,
          maxBlobSize: '10 GB (typical)',
        },
        integration: {
          publisherUrl: process.env.WALRUS_PUBLISHER_URL,
          aggregatorUrl: process.env.WALRUS_AGGREGATOR_URL,
          defaultEpochs: parseInt(process.env.WALRUS_DEFAULT_EPOCHS || '12', 10),
        },
      },
    });
  } catch (error) {
    logger.error('Get Walrus info error:', error);
    res.status(500).json({ error: 'Failed to get Walrus info' });
  }
});

export default router;
