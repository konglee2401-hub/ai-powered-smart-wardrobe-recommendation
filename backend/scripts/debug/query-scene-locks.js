#!/usr/bin/env node
/**
 * Query script to find all scenes and check scene-locking data
 */
import mongoose from 'mongoose';

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost/smart-wardrobe';

async function queryScenes() {
  try {
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    const collection = mongoose.connection.collection('promptoptions');
    
    const scenes = await collection
      .find(
        { category: 'scene' },
        {
          projection: {
            value: 1,
            sceneLockedImageUrl: 1,
            sceneLockedImageUrls: 1,
            sceneLockSamples: 1
          }
        }
      )
      .limit(10)
      .toArray();

    console.log('\n========== QUERY RESULTS ==========\n');
    console.log('Full JSON Output:');
    console.log(JSON.stringify(scenes, null, 2));

    console.log('\n\n========== DETAILED ANALYSIS ==========\n');

    if (!scenes || scenes.length === 0) {
      console.log('❌ No scenes found');
      return;
    }

    scenes.forEach((scene, idx) => {
      console.log(`\n📌 Scene ${idx + 1}:`);
      console.log(`   ID (value): ${scene.value}`);

      // sceneLockedImageUrl
      if (scene.sceneLockedImageUrl) {
        const preview = String(scene.sceneLockedImageUrl).substring(0, 100);
        console.log(`   ✅ sceneLockedImageUrl exists`);
        console.log(`      Value (first 100 chars): ${preview}${String(scene.sceneLockedImageUrl).length > 100 ? '...' : ''}`);
      } else {
        console.log(`   ❌ sceneLockedImageUrl does NOT exist`);
      }

      // sceneLockedImageUrls
      if (scene.sceneLockedImageUrls) {
        const isArray = Array.isArray(scene.sceneLockedImageUrls);
        console.log(`   ✅ sceneLockedImageUrls exists`);
        console.log(`      Type: ${isArray ? 'Array' : 'Object'}`);
        console.log(`      Content:`, JSON.stringify(scene.sceneLockedImageUrls, null, 6).replace(/\n/g, '\n      '));
      } else {
        console.log(`   ❌ sceneLockedImageUrls does NOT exist`);
      }

      // sceneLockSamples
      if (scene.sceneLockSamples && Array.isArray(scene.sceneLockSamples)) {
        console.log(`   ✅ sceneLockSamples exists`);
        console.log(`      Count: ${scene.sceneLockSamples.length} items`);
        if (scene.sceneLockSamples.length > 0) {
          console.log(`      Sample items (first 2):`);
          scene.sceneLockSamples.slice(0, 2).forEach((sample, sIdx) => {
            console.log(`        [${sIdx + 1}] ${JSON.stringify(sample).substring(0, 120)}${JSON.stringify(sample).length > 120 ? '...' : ''}`);
          });
          if (scene.sceneLockSamples.length > 2) {
            console.log(`        ... and ${scene.sceneLockSamples.length - 2} more`);
          }
        }
      } else if (scene.sceneLockSamples) {
        console.log(`   ⚠️  sceneLockSamples exists but is not an array`);
        console.log(`      Type: ${typeof scene.sceneLockSamples}`);
        console.log(`      Value:`, JSON.stringify(scene.sceneLockSamples));
      } else {
        console.log(`   ❌ sceneLockSamples does NOT exist`);
      }
    });

    console.log(`\n\n========== SUMMARY ==========`);
    console.log(`Total scenes found: ${scenes.length}`);
    
    const withLockedUrl = scenes.filter(s => s.sceneLockedImageUrl).length;
    const withLockedUrls = scenes.filter(s => s.sceneLockedImageUrls).length;
    const withSamples = scenes.filter(s => s.sceneLockSamples && s.sceneLockSamples.length > 0).length;
    
    console.log(`  - With sceneLockedImageUrl: ${withLockedUrl}`);
    console.log(`  - With sceneLockedImageUrls: ${withLockedUrls}`);
    console.log(`  - With sceneLockSamples: ${withSamples}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  MongoDB is not running at localhost:27017');
      console.error('   Try: mongod --dbpath <your-data-path>');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

queryScenes();
