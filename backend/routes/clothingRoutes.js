import express from 'express';
import {
  getClothes,
  addClothing,
  updateClothing,
  deleteClothing,
} from '../controllers/clothingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getClothes).post(addClothing);

router.route('/:id').put(updateClothing).delete(deleteClothing);

export default router;
