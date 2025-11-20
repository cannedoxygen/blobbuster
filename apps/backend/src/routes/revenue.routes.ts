import { Router } from 'express';

const router = Router();

router.get('/pool', async (req, res) => {
  // TODO: Implement revenue pool stats
  res.json({ success: true, pool: {} });
});

router.get('/earnings', async (req, res) => {
  // TODO: Implement earnings retrieval
  res.json({ success: true, earnings: {} });
});

router.post('/claim', async (req, res) => {
  // TODO: Implement earnings claim
  res.json({ success: true, txDigest: '' });
});

export default router;
