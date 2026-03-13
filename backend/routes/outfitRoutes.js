import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';
import {
  getRecommendations,
  saveOutfit,
  getMyOutfits,
  wearOutfit,
  deleteOutfit,
  getWeather,
} from '../controllers/outfitController.js';

const router = express.Router();

router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));

router.get('/recommendations', getRecommendations);
router.get('/weather', getWeather);
router.get('/', getMyOutfits);
router.post('/', saveOutfit);
router.post('/:outfitId/wear', wearOutfit);
router.delete('/:id', deleteOutfit);

export default router;

