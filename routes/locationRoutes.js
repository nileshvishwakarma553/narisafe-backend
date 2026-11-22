import express from 'express';
import {
  updateLocation,
  startSharing,
  stopSharing,
  getUserLocation,
} from '../controllers/locationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/update', updateLocation);
router.post('/start-sharing', startSharing);
router.post('/stop-sharing', stopSharing);
router.get('/:userId', getUserLocation);

export default router;
