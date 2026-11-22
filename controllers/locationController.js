import Location from '../models/Location.js';
import User from '../models/User.js';
import GuardianConnection from '../models/GuardianConnection.js';
import { broadcastLocationUpdate } from '../services/socketService.js';

// @desc    Update and record user location
// @route   POST /api/location/update
export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, heading, speed, address } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Update user's last known location
    user.lastKnownLocation = {
      latitude,
      longitude,
      address: address || '',
      updatedAt: new Date(),
    };
    await user.save();

    // Create a new location ping in history
    const loc = await Location.create({
      userId: req.user._id,
      latitude,
      longitude,
      accuracy: accuracy || 0,
      heading: heading || null,
      speed: speed || null,
      address: address || '',
      sharingStatus: user.safetyStatus === 'monitoring_active' ? 'active' : 'inactive',
      timestamp: new Date(),
    });

    // Broadcast to authorized guardians via Socket.IO
    broadcastLocationUpdate(req.user._id, {
      latitude,
      longitude,
      accuracy,
      address,
      user: {
        _id: user._id,
        name: user.name,
        safetyStatus: user.safetyStatus,
      },
    });

    res.status(200).json({
      success: true,
      data: loc,
      message: 'Location synchronized successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start live location sharing
// @route   POST /api/location/start-sharing
export const startSharing = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.safetyStatus = 'monitoring_active';
    await user.save();

    res.status(200).json({
      success: true,
      safetyStatus: user.safetyStatus,
      message: 'Live location monitoring started. Authorized guardians are now receiving real-time updates.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Stop live location sharing
// @route   POST /api/location/stop-sharing
export const stopSharing = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.safetyStatus = 'safe';
    await user.save();

    res.status(200).json({
      success: true,
      safetyStatus: user.safetyStatus,
      message: 'Live location monitoring stopped.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user location by ID (requires authorization)
// @route   GET /api/location/:userId
export const getUserLocation = async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    // Check if requester is self or admin
    const isSelf = req.user._id.toString() === targetUserId;
    const isAdmin = req.user.role === 'admin';

    // Check if requester is an accepted guardian
    const isAuthorizedGuardian = await GuardianConnection.exists({
      userId: targetUserId,
      guardianId: req.user._id,
      invitationStatus: 'accepted',
      'permissions.liveLocation': true,
    });

    if (!isSelf && !isAdmin && !isAuthorizedGuardian) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this user\'s location.',
      });
    }

    const user = await User.findById(targetUserId).select('name safetyStatus lastKnownLocation');
    const recentLocations = await Location.find({ userId: targetUserId })
      .sort({ timestamp: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      user,
      currentLocation: user ? user.lastKnownLocation : null,
      history: recentLocations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
