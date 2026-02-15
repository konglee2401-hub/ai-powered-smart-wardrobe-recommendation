import mongoose from 'mongoose';

const wearHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clothingItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClothingItem',
      required: true,
    },
    outfitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outfit',
    },
    wornDate: {
      type: Date,
      default: Date.now,
    },
    occasion: {
      type: String,
      default: 'casual',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('WearHistory', wearHistorySchema);

