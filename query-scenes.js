import mongoose from 'mongoose';

async function queryScenesData() {
  const mongoUrl = 'mongodb://localhost/smart-wardrobe';

  try {
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('promptoptions');

    const scenes = await collection.find(
      { category: 'scene' },
      { 
        projection: {
          value: 1,
          sceneLockedImageUrl: 1,
          sceneLockedImageUrls: 1,
          sceneLockSamples: 1
        }
      }
    ).limit(3).toArray();

    console.log('\n=== Scene Data from MongoDB ===\n');
    console.log(JSON.stringify(scenes, null, 2));

    // Also provide a detailed analysis
    console.log('\n=== Detailed Analysis ===\n');
    scenes.forEach((scene, index) => {
      console.log(`\nScene ${index + 1}:`);
      console.log(`  ID (value): ${scene.value}`);
      
      if (scene.sceneLockedImageUrl) {
        const preview = scene.sceneLockedImageUrl.substring(0, 100);
        console.log(`  sceneLockedImageUrl exists: YES`);
        console.log(`    Value (first 100 chars): ${preview}${scene.sceneLockedImageUrl.length > 100 ? '...' : ''}`);
      } else {
        console.log(`  sceneLockedImageUrl exists: NO`);
      }

      if (scene.sceneLockedImageUrls) {
        console.log(`  sceneLockedImageUrls exists: YES`);
        console.log(`    Type: ${Array.isArray(scene.sceneLockedImageUrls) ? 'Array' : typeof scene.sceneLockedImageUrls}`);
        if (Array.isArray(scene.sceneLockedImageUrls)) {
          console.log(`    Count: ${scene.sceneLockedImageUrls.length}`);
          console.log(`    Contents:`, JSON.stringify(scene.sceneLockedImageUrls, null, 4));
        } else {
          console.log(`    Value:`, JSON.stringify(scene.sceneLockedImageUrls, null, 4));
        }
      } else {
        console.log(`  sceneLockedImageUrls exists: NO`);
      }

      if (scene.sceneLockSamples) {
        console.log(`  sceneLockSamples exists: YES`);
        console.log(`    Type: ${Array.isArray(scene.sceneLockSamples) ? 'Array' : typeof scene.sceneLockSamples}`);
        if (Array.isArray(scene.sceneLockSamples)) {
          console.log(`    Item count: ${scene.sceneLockSamples.length}`);
          console.log(`    Contents:`, JSON.stringify(scene.sceneLockSamples, null, 4));
        } else {
          console.log(`    Value:`, JSON.stringify(scene.sceneLockSamples, null, 4));
        }
      } else {
        console.log(`  sceneLockSamples exists: NO`);
      }
    });

  } catch (error) {
    console.error('Error connecting or querying MongoDB:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB connection closed');
  }
}

queryScenesData();
