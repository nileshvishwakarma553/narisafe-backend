import express from 'express';
import {
  getDashboardStats,
  getIncidentsAdmin,
  updateIncidentStatusAdmin,
  getUsersAdmin,
  updateUserRoleAdmin,
  getHelplinesAdmin,
  saveHelplineAdmin,
  deleteHelplineAdmin,
  getAnalyticsAdmin,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/incidents', getIncidentsAdmin);
router.put('/incidents/:id/status', updateIncidentStatusAdmin);
router.get('/users', getUsersAdmin);
router.put('/users/:id/role', updateUserRoleAdmin);
router.get('/helplines', getHelplinesAdmin);
router.post('/helplines', saveHelplineAdmin);
router.delete('/helplines/:id', deleteHelplineAdmin);
router.get('/analytics', getAnalyticsAdmin);

export default router;
