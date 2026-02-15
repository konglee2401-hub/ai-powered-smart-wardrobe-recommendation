import mongoose from 'mongoose';

const clothingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    color: { type: String, required: true },
    brand: String,
    size: String,
    season: [String],
    style: String,
    imageUrl: String,
    isFavorite: { type: Boolean, default: false },
    purchaseDate: Date,
    price: Number,
  },
  { timestamps: true }
);

export default mongoose.model('ClothingItem', clothingSchema);
