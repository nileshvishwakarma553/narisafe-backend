import express from 'express';
import Helpline from '../models/Helpline.js';

const router = express.Router();

// @desc    Get all active helplines (public directory)
// @route   GET /api/helplines
router.get('/', async (req, res) => {
  try {
    const { category, state } = req.query;
    const query = { verified: true };
    if (category && category !== 'all') query.category = category;
    if (state && state !== 'all') query.state = state;

    const helplines = await Helpline.find(query).sort({ isNational: -1, name: 1 });
    res.status(200).json({ success: true, count: helplines.length, data: helplines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
