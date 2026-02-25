/**
 * Comprehensive Options Seeder
 * Adds all missing category options including:
 * - Hair Accessories: hairpins, clips, headbands, scrunchies, etc.
 * - Hats & Headwear: beanies, baseball-caps, fedoras, etc.
 * - Necklaces: pendants, chains, chokers, etc.
 * - Earrings (expanded): drops, hoops, studs, chandelier, etc.
 * - Bracelets: bangles, cuffs, chains, beaded, etc.
 * - Scarves & Wraps: knit-scarves, silk-scarves, shawls, etc.
 * - Belts: leather-belts, chain-belts, fabric-belts, etc.
 * - Socks: crew-socks, ankle-socks, no-show, patterned, etc.
 * - Makeup (expanded): eyeshadow, blush, lipstick techniques, etc.
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import PromptOption model
const { default: PromptOption } = await import('./models/PromptOption.js');

// Connect to MongoDB with sensible defaults
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000
});

console.log(`✅ Connected to MongoDB: ${mongoUri}\n`);

// Comprehensive options to add
const optionsToAdd = {
  // New Categories - Hair & Heads
  'hairAccessories': [
    { value: 'hairpins', label: 'Hairpins', description: 'Decorative metal or pearl hairpins for elegant styling' },
    { value: 'butterfly-clips', label: 'Butterfly Clips', description: 'Vintage-inspired colorful butterfly hair clips' },
    { value: 'headband', label: 'Headband', description: 'Fabric or beaded headband for decorative hair styling' },
    { value: 'scrunchie', label: 'Scrunchie', description: 'Smooth fabric scrunchie in various colors and textures' },
    { value: 'claw-clip', label: 'Claw Clip', description: 'Trendy claw-shaped hair clip for secure hold' },
    { value: 'hair-stick', label: 'Hair Stick', description: 'Wooden or metal decorative hair stick for bun styling' },
    { value: 'hair-wrap', label: 'Hair Wrap', description: 'Decorative wrap or string for wrapping hair sections' },
    { value: 'barrette', label: 'Barrette', description: 'Classic metal barrette with decorative elements' }
  ],
  
  // Hats & Headwear
  'hats': [
    { value: 'beanie', label: 'Beanie', description: 'Knit wool beanie in neutral or colorful styles' },
    { value: 'baseball-cap', label: 'Baseball Cap', description: 'Classic cotton or canvas baseball cap' },
    { value: 'fedora', label: 'Fedora', description: 'Structured felt fedora with ribbon band' },
    { value: 'beret', label: 'Beret', description: 'Classic French beret in wool or felt' },
    { value: 'bucket-hat', label: 'Bucket Hat', description: 'Wide-brimmed casual bucket hat' },
    { value: 'wide-brim-hat', label: 'Wide Brim Hat', description: 'Elegant wide-brimmed sun hat' },
    { value: 'straw-hat', label: 'Straw Hat', description: 'Summer straw hat with decorative ribbon' },
    { value: 'sun-visor', label: 'Sun Visor', description: 'Adjustable sun visor for casual outdoor wear' }
  ],
  
  // Necklaces (expanded)
  'necklaces': [
    { value: 'pendant-necklace', label: 'Pendant Necklace', description: 'Single pendant on thin or thick chain' },
    { value: 'chain-necklace', label: 'Chain Necklace', description: 'Simple or layered chain necklace' },
    { value: 'choker', label: 'Choker', description: 'Close-fitting choker-style necklace' },
    { value: 'locket', label: 'Locket', description: 'Vintage-style locket pendant' },
    { value: 'layer-necklace', label: 'Layered Necklace', description: 'Multi-strand layered necklace' },
    { value: 'statement-necklace', label: 'Statement Necklace', description: 'Bold statement piece with chunky links or stones' },
    { value: 'pearl-necklace', label: 'Pearl Necklace', description: 'Classic pearl or beaded strand necklace' },
    { value: 'name-necklace', label: 'Name Necklace', description: 'Personalized name or initial necklace' },
    { value: 'zodiac-necklace', label: 'Zodiac Necklace', description: 'Astrological sign pendant' }
  ],
  
  // Earrings (expanded)
  'earrings': [
    { value: 'stud-earrings', label: 'Stud Earrings', description: 'Classic small stud earrings' },
    { value: 'hoop-earrings', label: 'Hoop Earrings', description: 'Round hoop earrings in various sizes' },
    { value: 'drop-earrings', label: 'Drop Earrings', description: 'Dangling drop-style earrings' },
    { value: 'chandelier-earrings', label: 'Chandelier Earrings', description: 'Elaborate chandelier-style earrings' },
    { value: 'huggie-earrings', label: 'Huggie Earrings', description: 'Small close-hugging hoop earrings' },
    { value: 'threader-earrings', label: 'Threader Earrings', description: 'Thread-through style earrings' },
    { value: 'cluster-earrings', label: 'Cluster Earrings', description: 'Multiple stones clustered together' },
    { value: 'tassel-earrings', label: 'Tassel Earrings', description: 'Decorative tassel or fringe earrings' }
  ],
  
  // Bracelets
  'bracelets': [
    { value: 'bangle-bracelet', label: 'Bangle Bracelet', description: 'Rigid circular bangle bracelet' },
    { value: 'cuff-bracelet', label: 'Cuff Bracelet', description: 'Wide open cuff-style bracelet' },
    { value: 'chain-bracelet', label: 'Chain Bracelet', description: 'Linked chain-style bracelet' },
    { value: 'beaded-bracelet', label: 'Beaded Bracelet', description: 'Beaded or pearl bracelet strand' },
    { value: 'tennis-bracelet', label: 'Tennis Bracelet', description: 'Delicate tennis bracelet with stones' },
    { value: 'charm-bracelet', label: 'Charm Bracelet', description: 'Bracelet with multiple hanging charms' },
    { value: 'wrap-bracelet', label: 'Wrap Bracelet', description: 'Multi-wrap leather or fabric bracelet' },
    { value: 'minimalist-bracelet', label: 'Minimalist Bracelet', description: 'Simple thin metal minimalist bracelet' }
  ],
  
  // Scarves & Wraps
  'scarves': [
    { value: 'knit-scarf', label: 'Knit Scarf', description: 'Cozy knit wool or cotton scarf' },
    { value: 'silk-scarf', label: 'Silk Scarf', description: 'Smooth silk scarf with various patterns' },
    { value: 'shawl', label: 'Shawl', description: 'Large wrap-style shawl or pashmina' },
    { value: 'infinity-scarf', label: 'Infinity Scarf', description: 'Loop-style infinity scarf' },
    { value: 'bandana', label: 'Bandana', description: 'Square bandana tied as scarf or headwrap' },
    { value: 'neck-tie', label: 'Neck Tie', description: 'Decorative neck tie or bow tie' },
    { value: 'collar-scarf', label: 'Collar Scarf', description: 'Small decorative collar-style scarf' }
  ],
  
  // Belts
  'belts': [
    { value: 'leather-belt', label: 'Leather Belt', description: 'Classic leather belt with metal buckle' },
    { value: 'chain-belt', label: 'Chain Belt', description: 'Decorative chain link belt' },
    { value: 'fabric-belt', label: 'Fabric Belt', description: 'Fabric webbing belt with buckle' },
    { value: 'corset-belt', label: 'Corset Belt', description: 'Structured corset-style wide belt' },
    { value: 'obi-belt', label: 'Obi Belt', description: 'Japanese-style obi wrap belt' },
    { value: 'elastic-belt', label: 'Elastic Belt', description: 'Stretchy elastic waist belt' },
    { value: 'cinch-belt', label: 'Cinch Belt', description: 'Cinching style metal or fabric belt' }
  ],
  
  // Socks
  'socks': [
    { value: 'crew-socks', label: 'Crew Socks', description: 'Classic crew-length cotton socks' },
    { value: 'ankle-socks', label: 'Ankle Socks', description: 'Short ankle-length socks' },
    { value: 'no-show-socks', label: 'No-Show Socks', description: 'Invisible no-show socks' },
    { value: 'knee-high-socks', label: 'Knee-High Socks', description: 'Tall knee-high socks or stockings' },
    { value: 'patterned-socks', label: 'Patterned Socks', description: 'Fun patterned or printed socks' },
    { value: 'fishnets', label: 'Fishnets', description: 'Fishnet-style hosiery' },
    { value: 'wool-socks', label: 'Wool Socks', description: 'Warm wool hiking or casual socks' },
    { value: 'sheer-socks', label: 'Sheer Socks', description: 'Thin sheer hosiery or socks' }
  ],
  
  // Makeup (expanded - techniques and looks)
  'makeup': [
    { value: 'natural-makeup', label: 'Natural Makeup', description: 'Minimal natural look emphasizing skin' },
    { value: 'light-makeup', label: 'Light Makeup', description: 'Light coverage with subtle colors' },
    { value: 'glowing-skin', label: 'Glowing Skin', description: 'Luminous dewy skin with highlights' },
    { value: 'smokey-eyes', label: 'Smokey Eyes', description: 'Blended smokey eye makeup look' },
    { value: 'bold-lips', label: 'Bold Lips', description: 'Statement bold lip color' },
    { value: 'winged-eyeliner', label: 'Winged Eyeliner', description: 'Classic winged eyeliner look' },
    { value: 'contoured', label: 'Contoured', description: 'Face contouring and highlighting technique' },
    { value: 'matte-finish', label: 'Matte Finish', description: 'Matte non-shiny makeup finish' },
    { value: 'glossy-lips', label: 'Glossy Lips', description: 'Shiny glossy lip look' },
    { value: 'bronzed', label: 'Bronzed', description: 'Warm bronzed makeup tones' },
    { value: 'dramatic', label: 'Dramatic', description: 'Bold dramatic makeup look' },
    { value: 'minimalist', label: 'Minimalist', description: 'Minimalist clean makeup look' }
  ]
};

// Process each category
let totalAdded = 0;
let totalSkipped = 0;

for (const [category, options] of Object.entries(optionsToAdd)) {
  console.log(`\n📁 Processing category: ${category}`);
  
  for (const { value, label, description } of options) {
    try {
      // Check if option already exists
      const existing = await PromptOption.findOne({ value, isActive: true });
      
      if (existing) {
        console.log(`   ⏭️  Skipped: ${value} (already exists)`);
        totalSkipped++;
        continue;
      }
      
      // Create new option
      const newOption = new PromptOption({
        category,
        value,
        label,
        description,
        keywords: [value, ...value.split('-'), category],
        technicalDetails: {
          source: 'manual_seeding',
          addedAt: new Date().toISOString()
        },
        isActive: true,
        sortOrder: 100
      });
      
      await newOption.save();
      console.log(`   ✅ Added: ${value}`);
      totalAdded++;
      
    } catch (err) {
      console.error(`   ❌ Error adding ${value}:`, err.message);
    }
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 SEEDING COMPLETE`);
console.log(`${'='.repeat(60)}`);
console.log(`✅ Options Added: ${totalAdded}`);
console.log(`⏭️  Options Skipped: ${totalSkipped}`);

// Verify final counts per category
console.log(`\n📈 Final Category Counts:`);
const categories = Object.keys(optionsToAdd);
for (const cat of categories) {
  const count = await PromptOption.countDocuments({ category: cat, isActive: true });
  console.log(`   ${cat}: ${count} options`);
}

// Close connection
await mongoose.connection.close();
console.log(`\n✅ Done!`);
