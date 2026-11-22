import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide full name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide email address'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'guardian', 'admin'],
    default: 'user',
  },
  profileImage: {
    type: String,
    default: '',
  },
  safetyStatus: {
    type: String,
    enum: ['safe', 'monitoring_active', 'emergency_active'],
    default: 'safe',
  },
  emergencyInfo: {
    bloodGroup: { type: String, default: '' },
    medicalNotes: { type: String, default: '' },
    homeAddress: { type: String, default: '' },
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastKnownLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    updatedAt: Date,
  }
}, {
  timestamps: true,
});

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
