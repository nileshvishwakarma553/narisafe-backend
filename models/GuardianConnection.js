import mongoose from 'mongoose';

const guardianConnectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  guardianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  invitationStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  permissions: {
    liveLocation: { type: Boolean, default: true },
    emergencyAlerts: { type: Boolean, default: true },
    routeMonitoring: { type: Boolean, default: true },
  },
  relationshipTag: {
    type: String,
    default: 'Guardian',
  }
}, {
  timestamps: true,
});

guardianConnectionSchema.index({ userId: 1, guardianId: 1 }, { unique: true });

const GuardianConnection = mongoose.models.GuardianConnection || mongoose.model('GuardianConnection', guardianConnectionSchema);
export default GuardianConnection;
