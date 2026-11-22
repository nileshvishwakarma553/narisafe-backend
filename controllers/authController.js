import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import EmergencyContact from '../models/EmergencyContact.js';
import GuardianConnection from '../models/GuardianConnection.js';
import { notifySafetyStatusChange } from '../services/socketService.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'narisafe_jwt_secret_dev_2026', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, emergencyContact } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, password, and phone number.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: role && ['user', 'guardian', 'admin'].includes(role) ? role : 'user',
    });

    // Optionally create initial emergency contact if provided
    if (emergencyContact && emergencyContact.name && emergencyContact.phone) {
      await EmergencyContact.create({
        userId: user._id,
        name: emergencyContact.name,
        phone: emergencyContact.phone,
        relationship: emergencyContact.relationship || 'Emergency Contact',
        isPrimary: true,
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Account created successfully. Welcome to NariSafe.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user,
      message: `Welcome back, ${user.name}!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const contacts = await EmergencyContact.find({ userId: req.user._id }).sort({ isPrimary: -1, createdAt: 1 });
    
    // Find active guardian connections
    const guardianConnections = await GuardianConnection.find({
      $or: [{ userId: req.user._id }, { guardianId: req.user._id }],
      invitationStatus: 'accepted',
    }).populate('guardianId', 'name email phone safetyStatus profileImage')
      .populate('userId', 'name email phone safetyStatus profileImage lastKnownLocation');

    res.status(200).json({
      success: true,
      user,
      emergencyContacts: contacts,
      connections: guardianConnections,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, bloodGroup, medicalNotes, homeAddress, profileImage } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (bloodGroup !== undefined || medicalNotes !== undefined || homeAddress !== undefined) {
      user.emergencyInfo = {
        bloodGroup: bloodGroup !== undefined ? bloodGroup : user.emergencyInfo.bloodGroup,
        medicalNotes: medicalNotes !== undefined ? medicalNotes : user.emergencyInfo.medicalNotes,
        homeAddress: homeAddress !== undefined ? homeAddress : user.emergencyInfo.homeAddress,
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      user,
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user safety status manually
// @route   PUT /api/auth/safety-status
export const updateSafetyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['safe', 'monitoring_active', 'emergency_active'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "safe", "monitoring_active", or "emergency_active".',
      });
    }

    const user = await User.findById(req.user._id);
    user.safetyStatus = status;
    await user.save();

    // Broadcast to connected guardians
    notifySafetyStatusChange(user._id, status, {
      id: user._id,
      name: user.name,
      safetyStatus: user.safetyStatus,
      lastKnownLocation: user.lastKnownLocation,
    });

    res.status(200).json({
      success: true,
      safetyStatus: user.safetyStatus,
      message: `Safety status updated to ${status.replace('_', ' ').toUpperCase()}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot password - Request reset token
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email ? email.toLowerCase() : '' });

    if (!user) {
      // Return 200 to prevent user enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been dispatched.',
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      resetToken, // Provided for easy development / demo testing
      message: 'Password reset token generated successfully. Valid for 10 minutes.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password using token
// @route   PUT /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      message: 'Password reset successful. You are now logged in.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
