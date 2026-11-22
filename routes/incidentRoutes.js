import express from 'express';
import {
  createIncident,
  getIncidents,
  getMyReports,
  getIncidentById,
  updateIncident,
} from '../controllers/incidentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getIncidents);
router.get('/my-reports', protect, getMyReports);
router.get('/:id', protect, getIncidentById);
router.post('/', protect, createIncident);
router.put('/:id', protect, updateIncident);

export default router;
