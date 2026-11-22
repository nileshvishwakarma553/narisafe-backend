import express from 'express';
import { getNearbySafePlaces } from '../controllers/safePlacesController.js';

const router = express.Router();

router.get('/nearby', getNearbySafePlaces);

export default router;
