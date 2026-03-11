import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: '',
    trim: true,
  },
  message: {
    type: String,
    default: '',
    trim: true,
  },
  severity: {
    type: String,
    enum: ['success', 'info', 'warning', 'error'],
    default: 'info',
    index: true,
  },
  source: {
    type: String,
    default: 'backend',
    index: true,
  },
  queueId: {
    type: String,
    default: '',
    index: true,
  },
  jobId: {
    type: String,
    default: '',
  },
  meta: {
    type: Object,
    default: {},
  },
  readAt: {
    type: Date,
    default: null,
    index: true,
  },
}, { timestamps: true });

NotificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema, 'notifications');

export default Notification;
