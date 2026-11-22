import express from 'express';
import {
  triggerSOS,
  getEmergencyHistory,
  resolveEmergency,
} from '../controllers/emergencyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/sos', triggerSOS);
router.get('/history', getEmergencyHistory);
router.put('/:id/resolve', resolveEmergency);

export default router;
