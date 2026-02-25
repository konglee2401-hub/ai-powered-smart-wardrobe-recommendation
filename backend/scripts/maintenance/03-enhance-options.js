#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

(async () => {
  try {
    await mongoose.connect(mongoURI);
    const db = mongoose.connection.db;
    const col = db.collection('promptoptions');
    
    const additionalOptions = [
      { category: 'makeup', value: 'natural', label: 'Natural', description: 'Minimal, natural makeup' },
      { category: 'makeup', value: 'bold-lips', label: 'Bold Lips', description: 'Bold lipstick with natural eyes' },
      { category: 'makeup', value: 'smokey-eyes', label: 'Smokey Eyes', description: 'Smokey eye makeup' },
      { category: 'accessories', value: 'necklace', label: 'Necklace', description: 'Add a necklace' },
      { category: 'accessories', value: 'earrings', label: 'Earrings', description: 'Add earrings' },
      { category: 'bottoms', value: 'jeans', label: 'Jeans', description: 'Blue jeans' },
      { category: 'bottoms', value: 'skirt', label: 'Skirt', description: 'Skirt' },
      { category: 'shoes', value: 'heels', label: 'Heels', description: 'High heels' },
      { category: 'shoes', value: 'sneakers', label: 'Sneakers', description: 'Casual sneakers' },
      { category: 'outerwear', value: 'jacket', label: 'Jacket', description: 'Jacket' },
    ];
    
    let added = 0;
    for (const opt of additionalOptions) {
      const exists = await col.findOne({ category: opt.category, value: opt.value });
      if (!exists) {
        await col.insertOne({
          ...opt,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Added:', opt.category, '-', opt.value);
        added++;
      }
    }
    
    console.log(`\n✅ Added ${added} new options to database`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
