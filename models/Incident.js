import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  incidentType: {
    type: String,
    required: [true, 'Incident type is required'],
    enum: [
      'Harassment',
      'Stalking',
      'Unsafe Public Area',
      'Theft',
      'Assault',
      'Suspicious Activity',
      'Poor Lighting',
      'Eve Teasing',
      'Other'
    ],
  },
  description: {
    type: String,
    required: [true, 'Incident description is required'],
    trim: true,
  },
  locationName: {
    type: String,
    required: [true, 'Location name or landmark is required'],
    trim: true,
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required'],
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required'],
  },
  incidentTime: {
    type: Date,
    default: Date.now,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'verified', 'resolved', 'rejected'],
    default: 'submitted',
  },
  anonymous: {
    type: Boolean,
    default: false,
  },
  attachmentUrl: {
    type: String,
    default: '',
  },
  adminNotes: {
    type: String,
    default: '',
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }
}, {
  timestamps: true,
});

incidentSchema.index({ latitude: 1, longitude: 1 });
incidentSchema.index({ status: 1 });
incidentSchema.index({ createdAt: -1 });

const Incident = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);
export default Incident;
