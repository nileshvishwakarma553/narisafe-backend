import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
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
  heading: {
    type: Number,
    default: null,
  },
  speed: {
    type: Number,
    default: null,
  },
  address: {
    type: String,
    default: '',
  },
  sharingStatus: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

locationSchema.index({ userId: 1, timestamp: -1 });

const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
export default Location;
