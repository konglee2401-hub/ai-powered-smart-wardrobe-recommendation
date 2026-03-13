import express from 'express';
import {
  getClothes,
  addClothing,
  updateClothing,
  deleteClothing,
} from '../controllers/clothingController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';

const router = express.Router();

router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));

router.route('/').get(getClothes).post(addClothing);

router.route('/:id').put(updateClothing).delete(deleteClothing);

export default router;
