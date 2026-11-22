import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Contact phone number is required'],
    trim: true,
  },
  relationship: {
    type: String,
    required: [true, 'Relationship is required (e.g. Parent, Sibling, Friend, Spouse)'],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const EmergencyContact = mongoose.models.EmergencyContact || mongoose.model('EmergencyContact', emergencyContactSchema);
export default EmergencyContact;
