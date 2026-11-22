import mongoose from 'mongoose';

const helplineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  number: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['Emergency', 'Police', 'Women Safety', 'Medical', 'Child', 'Cyber Crime', 'Mental Health', 'Legal Aid'],
    default: 'Women Safety',
  },
  description: {
    type: String,
    default: '',
  },
  state: {
    type: String,
    default: 'National',
  },
  isNational: {
    type: Boolean,
    default: true,
  },
  availableHours: {
    type: String,
    default: '24x7',
  },
  verified: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

const Helpline = mongoose.models.Helpline || mongoose.model('Helpline', helplineSchema);
export default Helpline;
