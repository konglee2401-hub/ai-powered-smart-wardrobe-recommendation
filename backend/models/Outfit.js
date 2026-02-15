import mongoose from 'mongoose';

const outfitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClothingItem',
        required: true,
      },
    ],
    occasion: {
      type: String,
      enum: ['casual', 'work', 'formal', 'date', 'sport', 'party', 'travel'],
      default: 'casual',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    wearCount: {
      type: Number,
      default: 0,
    },
    lastWorn: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Outfit', outfitSchema);

