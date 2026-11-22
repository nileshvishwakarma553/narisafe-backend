import Emergency from '../models/Emergency.js';
import User from '../models/User.js';
import EmergencyContact from '../models/EmergencyContact.js';
import GuardianConnection from '../models/GuardianConnection.js';
import Notification from '../models/Notification.js';
import { notifyGuardiansOfSOS } from '../services/socketService.js';

// @desc    Trigger One-Tap SOS Emergency
// @route   POST /api/emergency/sos
export const triggerSOS = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, locationName, notes } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Current GPS coordinates (latitude, longitude) are required to activate SOS.',
      });
    }

    // 1. Update user's safety status to 'emergency_active'
    const user = await User.findById(req.user._id);
    user.safetyStatus = 'emergency_active';
    user.lastKnownLocation = {
      latitude,
      longitude,
      address: locationName || 'Emergency GPS Coordinates',
      updatedAt: new Date(),
    };
    await user.save();

    // 2. Fetch emergency contacts
    const emergencyContacts = await EmergencyContact.find({ userId: req.user._id });

    // 3. Fetch accepted guardians
    const guardianConnections = await GuardianConnection.find({
      userId: req.user._id,
      invitationStatus: 'accepted',
    }).populate('guardianId', 'name email phone');

    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // 4. Create Emergency Record in MongoDB
    const emergency = await Emergency.create({
      userId: req.user._id,
      latitude,
      longitude,
      accuracy: accuracy || 0,
      locationName: locationName || 'Current GPS Location',
      mapsLink,
      status: 'active',
      notes: notes || 'Emergency SOS triggered from NariSafe One-Tap button.',
      guardiansNotified: guardianConnections.map((conn) => ({
        guardianId: conn.guardianId._id,
        name: conn.guardianId.name,
        notifiedAt: new Date(),
      })),
      emergencyContactsNotified: emergencyContacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
        notifiedAt: new Date(),
      })),
    });

    // 5. Send in-app notifications to connected guardians
    for (const conn of guardianConnections) {
      await Notification.create({
        userId: conn.guardianId._id,
        title: `🚨 EMERGENCY SOS: ${user.name} needs help!`,
        message: `${user.name} has activated emergency SOS at ${locationName || 'GPS Location'}. View live location immediately.`,
        type: 'sos',
        data: {
          emergencyId: emergency._id,
          userId: user._id,
          userName: user.name,
          latitude,
          longitude,
          mapsLink,
        },
      });
    }

    // 6. Broadcast real-time Socket.IO alert to guardian rooms
    notifyGuardiansOfSOS({
      emergencyId: emergency._id,
      userId: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        profileImage: user.profileImage,
      },
      latitude,
      longitude,
      accuracy,
      locationName: emergency.locationName,
      mapsLink,
      createdAt: emergency.createdAt,
      status: 'active',
    });

    // 7. Formulate quick dial & SMS links
    const primaryContact = emergencyContacts.find((c) => c.isPrimary) || emergencyContacts[0];
    const emergencyActionLinks = {
      policeCall: 'tel:112',
      womenHelplineCall: 'tel:1091',
      primaryContactCall: primaryContact ? `tel:${primaryContact.phone}` : 'tel:112',
      smsAlertLink: primaryContact
        ? `sms:${primaryContact.phone}?body=EMERGENCY! I need immediate help. My current location is: ${mapsLink}`
        : `sms:112?body=EMERGENCY! I need immediate help at ${mapsLink}`,
      googleMapsNavigation: mapsLink,
    };

    res.status(201).json({
      success: true,
      data: emergency,
      actionLinks: emergencyActionLinks,
      emergencyContacts,
      message: '🚨 Emergency SOS Activated! Guardians and emergency contacts have been notified.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user or guardian emergency history
// @route   GET /api/emergency/history
export const getEmergencyHistory = async (req, res) => {
  try {
    let query = { userId: req.user._id };

    if (req.user.role === 'admin') {
      query = {}; // Admin sees all
    } else if (req.user.role === 'guardian') {
      const connections = await GuardianConnection.find({
        guardianId: req.user._id,
        invitationStatus: 'accepted',
      });
      const wardIds = connections.map((c) => c.userId);
      query = { userId: { $in: [...wardIds, req.user._id] } };
    }

    const history = await Emergency.find(query)
      .populate('userId', 'name email phone profileImage')
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resolve or cancel an active emergency
// @route   PUT /api/emergency/:id/resolve
export const resolveEmergency = async (req, res) => {
  try {
    const emergency = await Emergency.findById(req.params.id);

    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency incident not found.' });
    }

    // Only victim or admin can mark resolved
    const isOwner = emergency.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the account owner or an authorized administrator can resolve this emergency.',
      });
    }

    emergency.status = 'resolved';
    emergency.resolvedAt = new Date();
    emergency.resolvedBy = req.user._id;
    if (req.body.notes) emergency.notes = req.body.notes;
    await emergency.save();

    // Reset user's safety status back to 'safe'
    const user = await User.findById(emergency.userId);
    if (user) {
      user.safetyStatus = 'safe';
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: emergency,
      message: 'Emergency incident marked as resolved. Safety status set back to Safe.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
