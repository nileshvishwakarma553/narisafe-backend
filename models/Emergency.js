import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  accuracy: {
    type: Number,
    default: 0,
  },
  locationName: {
    type: String,
    default: 'Current GPS Coordinates',
  },
  mapsLink: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active',
  },
  guardiansNotified: [{
    guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    notifiedAt: { type: Date, default: Date.now },
  }],
  emergencyContactsNotified: [{
    name: String,
    phone: String,
    relationship: String,
    notifiedAt: { type: Date, default: Date.now },
  }],
  notes: {
    type: String,
    default: '',
  },
  audioRecordingUrl: {
    type: String,
    default: '',
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }
}, {
  timestamps: true,
});

emergencySchema.index({ status: 1, createdAt: -1 });

const Emergency = mongoose.models.Emergency || mongoose.model('Emergency', emergencySchema);
export default Emergency;
