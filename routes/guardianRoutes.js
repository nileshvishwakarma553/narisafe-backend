import express from 'express';
import {
  inviteGuardian,
  getConnections,
  respondInvitation,
  removeConnection,
  getMonitoredUsers,
} from '../controllers/guardianController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/invite', inviteGuardian);
router.get('/connections', getConnections);
router.post('/accept', respondInvitation);
router.delete('/connections/:id', removeConnection);
router.get('/monitored-users', getMonitoredUsers);

export default router;
