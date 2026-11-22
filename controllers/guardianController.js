import GuardianConnection from '../models/GuardianConnection.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// @desc    Invite a guardian by email or phone
// @route   POST /api/guardian/invite
export const inviteGuardian = async (req, res) => {
  try {
    const { guardianEmailOrPhone, relationshipTag } = req.body;

    if (!guardianEmailOrPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide guardian email or phone number.',
      });
    }

    // Find the guardian user
    const guardian = await User.findOne({
      $or: [
        { email: guardianEmailOrPhone.toLowerCase().trim() },
        { phone: guardianEmailOrPhone.trim() },
      ],
    });

    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: 'No registered user found with this email or phone. Please ensure your guardian has registered an account on NariSafe first.',
      });
    }

    if (guardian._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as your own guardian.',
      });
    }

    // Check existing connection
    const existing = await GuardianConnection.findOne({
      userId: req.user._id,
      guardianId: guardian._id,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A connection request to ${guardian.name} already exists (Status: ${existing.invitationStatus}).`,
      });
    }

    const connection = await GuardianConnection.create({
      userId: req.user._id,
      guardianId: guardian._id,
      invitationStatus: 'pending',
      relationshipTag: relationshipTag || 'Guardian',
      permissions: {
        liveLocation: true,
        emergencyAlerts: true,
        routeMonitoring: true,
      },
    });

    // Send in-app notification to the guardian
    await Notification.create({
      userId: guardian._id,
      title: 'New Guardian Invitation',
      message: `${req.user.name} has invited you to be their safety guardian on NariSafe.`,
      type: 'guardian',
      data: { connectionId: connection._id, invitedBy: req.user.name },
    });

    res.status(201).json({
      success: true,
      data: connection,
      message: `Invitation successfully sent to ${guardian.name}. They can now accept it from their Guardian Dashboard.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get guardian connections for current user
// @route   GET /api/guardian/connections
export const getConnections = async (req, res) => {
  try {
    const isGuardianRole = req.user.role === 'guardian';

    // Incoming requests for guardian, or outgoing requests from user
    const sentInvitations = await GuardianConnection.find({ userId: req.user._id })
      .populate('guardianId', 'name email phone safetyStatus profileImage');

    const receivedInvitations = await GuardianConnection.find({ guardianId: req.user._id })
      .populate('userId', 'name email phone safetyStatus profileImage lastKnownLocation');

    res.status(200).json({
      success: true,
      guardians: sentInvitations,
      wards: receivedInvitations,
      isGuardianRole,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept or reject a guardian invitation
// @route   POST /api/guardian/accept
export const respondInvitation = async (req, res) => {
  try {
    const { connectionId, status } = req.body; // status: 'accepted' | 'rejected'

    if (!connectionId || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Please provide valid connectionId and status (accepted/rejected).',
      });
    }

    const connection = await GuardianConnection.findOne({
      _id: connectionId,
      guardianId: req.user._id,
    }).populate('userId', 'name');

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Guardian invitation not found or you are not authorized to respond.',
      });
    }

    connection.invitationStatus = status;
    await connection.save();

    // Notify the user who sent the invite
    await Notification.create({
      userId: connection.userId._id,
      title: `Guardian Invitation ${status === 'accepted' ? 'Accepted' : 'Declined'}`,
      message: `${req.user.name} has ${status} your guardian invitation.`,
      type: 'guardian',
    });

    res.status(200).json({
      success: true,
      data: connection,
      message: `Invitation ${status} successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove guardian connection
// @route   DELETE /api/guardian/connections/:id
export const removeConnection = async (req, res) => {
  try {
    const connection = await GuardianConnection.findOne({
      _id: req.params.id,
      $or: [{ userId: req.user._id }, { guardianId: req.user._id }],
    });

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found.' });
    }

    await GuardianConnection.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Guardian connection revoked successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get list of monitored users for a Guardian
// @route   GET /api/guardian/monitored-users
export const getMonitoredUsers = async (req, res) => {
  try {
    const connections = await GuardianConnection.find({
      guardianId: req.user._id,
      invitationStatus: 'accepted',
    }).populate('userId', 'name email phone safetyStatus profileImage lastKnownLocation updatedAt');

    const users = connections.map((conn) => ({
      connectionId: conn._id,
      permissions: conn.permissions,
      relationshipTag: conn.relationshipTag,
      user: conn.userId,
    }));

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
