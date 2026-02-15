import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import ClothingItem from '../models/ClothingItem.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const seed = async () => {
  try {
    await connectDB();

    await User.deleteMany();
    await ClothingItem.deleteMany();

    const user = await User.create({
      name: 'Demo User',
      email: 'demo@example.com',
      password: 'password123',
      preferences: {
        favoriteColors: ['blue', 'black'],
        favoriteStyles: ['casual'],
        bodyType: 'average',
      },
    });

    await ClothingItem.insertMany([
      {
        userId: user._id,
        name: 'White T-Shirt',
        category: 'top',
        color: 'white',
        brand: 'Basic',
        size: 'M',
        season: ['summer'],
        style: 'casual',
      },
      {
        userId: user._id,
        name: 'Blue Jeans',
        category: 'bottom',
        color: 'blue',
        brand: 'DenimCo',
        size: '32',
        season: ['spring', 'autumn', 'winter'],
        style: 'casual',
      },
    ]);

    console.log('✅ Seed data inserted successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();

