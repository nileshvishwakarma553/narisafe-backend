import express from 'express';
import { getSaferRoutes } from '../controllers/saferRouteController.js';

const router = express.Router();

router.post('/safer-route', getSaferRoutes);

export default router;
