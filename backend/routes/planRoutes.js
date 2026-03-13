import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { listPlans, createPlan, updatePlan, deletePlan } from '../controllers/planController.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

router.get('/', listPlans);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

export default router;
