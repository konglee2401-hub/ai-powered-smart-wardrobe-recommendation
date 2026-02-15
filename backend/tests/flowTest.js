import request from 'supertest';
import app from '../server.js';
import mongoose from 'mongoose';
import GeneratedImage from '../models/GeneratedImage.js';
import GeneratedVideo from '../models/GeneratedVideo.js';

describe('Flow Implementation Test', () => {
  let testSessionId = 'test-session-' + Date.now();
  let testUserId = 'test-user-' + Date.now();

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await GeneratedImage.deleteMany({ sessionId: testSessionId });
    await GeneratedVideo.deleteMany({ sessionId: testSessionId });
    await mongoose.disconnect();
  });

  describe('GeneratedImage Model', () => {
    it('should create and save a generated image', async () => {
      const imageData = {
        userId: testUserId,
        sessionId: testSessionId,
        characterImageUrl: 'https://example.com/character.jpg',
        productImageUrl: 'https://example.com/product.jpg',
        characterAnalysis: 'Young female model with long hair',
        productAnalysis: 'Red dress with floral pattern',
        analysisMode: 'semi-auto',
        productFocus: 'full-outfit',
        analysisModel: 'auto',
        selectedOptions: {
          scene: 'outdoor park',
          lighting: 'natural daylight',
          mood: 'happy and relaxed',
          style: 'fashion photography',
          colorPalette: 'warm tones',
          useCase: 'social media post'
        },
        aiSuggestions: {
          scene: 'outdoor park',
          lighting: 'natural daylight',
          mood: 'happy and relaxed',
          style: 'fashion photography',
          colorPalette: 'warm tones'
        },
        fullPrompt: 'A young female model with long hair wearing a red dress with floral pattern in an outdoor park with natural daylight, happy and relaxed mood, fashion photography style with warm tones for a social media post',
        shortPrompt: 'Model in red floral dress in park',
        promptMode: 'full',
        imageUrl: 'https://example.com/generated-image.jpg',
        imageProvider: 'replicate',
        generationMethod: 'api',
        width: 1024,
        height: 1024,
        generationTime: 15.2,
        cost: 0.05
      };

      const image = new GeneratedImage(imageData);
      const savedImage = await image.save();

      expect(savedImage._id).toBeDefined();
      expect(savedImage.userId).toBe(testUserId);
      expect(savedImage.sessionId).toBe(testSessionId);
      expect(savedImage.analysisMode).toBe('semi-auto');
      expect(savedImage.productFocus).toBe('full-outfit');
      expect(savedImage.fullPrompt).toBeDefined();
    });
  });

  describe('GeneratedVideo Model', () => {
    it('should create and save a generated video', async () => {
      // First create an image to reference
      const imageData = {
        userId: testUserId,
        sessionId: testSessionId,
        characterImageUrl: 'https://example.com/character.jpg',
        productImageUrl: 'https://example.com/product.jpg',
        characterAnalysis: 'Model analysis',
        productAnalysis: 'Product analysis',
        analysisMode: 'full-auto',
        fullPrompt: 'Test prompt',
        imageUrl: 'https://example.com/image.jpg',
        imageProvider: 'replicate',
        generationMethod: 'api'
      };

      const image = new GeneratedImage(imageData);
      const savedImage = await image.save();

      const videoData = {
        userId: testUserId,
        sessionId: testSessionId,
        sourceImages: [savedImage._id],
        sourceImageUrls: ['https://example.com/image.jpg'],
        videoOptions: {
          duration: 10,
          cameraMovement: 'zoom-in',
          transitionStyle: 'fade',
          aspectRatio: '16:9',
          fps: 24
        },
        videoPrompt: 'Create a fashion video showing the model wearing the product with zoom-in effect',
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        videoProvider: 'google-labs',
        duration: 10.5,
        status: 'completed'
      };

      const video = new GeneratedVideo(videoData);
      const savedVideo = await video.save();

      expect(savedVideo._id).toBeDefined();
      expect(savedVideo.userId).toBe(testUserId);
      expect(savedVideo.sessionId).toBe(testSessionId);
      expect(savedVideo.videoOptions.duration).toBe(10);
      expect(savedVideo.videoProvider).toBe('google-labs');
      expect(savedVideo.status).toBe('completed');
    });
  });

  describe('History API Routes', () => {
    it('should save and retrieve generated images', async () => {
      const imageData = {
        userId: testUserId,
        sessionId: testSessionId,
        characterImageUrl: 'https://example.com/character.jpg',
        productImageUrl: 'https://example.com/product.jpg',
        characterAnalysis: 'Test character analysis',
        productAnalysis: 'Test product analysis',
        analysisMode: 'manual',
        fullPrompt: 'Test prompt for API',
        imageUrl: 'https://example.com/api-image.jpg',
        imageProvider: 'fireworks',
        generationMethod: 'api'
      };

      // Save image via API
      const saveResponse = await request(app)
        .post('/api/history/images')
        .send(imageData)
        .expect(201);

      expect(saveResponse.body.success).toBe(true);
      expect(saveResponse.body.data.imageUrl).toBe(imageData.imageUrl);

      // Retrieve images via API
      const getResponse = await request(app)
        .get(`/api/history/images?userId=${testUserId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.images.length).toBeGreaterThan(0);
      expect(getResponse.body.data.images[0].imageProvider).toBe('fireworks');
    });

    it('should retrieve session images', async () => {
      const response = await request(app)
        .get(`/api/history/images/session/${testSessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.images.length).toBeGreaterThan(0);
    });

    it('should update image favorite status', async () => {
      // Get first image from session
      const getResponse = await request(app)
        .get(`/api/history/images/session/${testSessionId}`)
        .expect(200);

      const imageId = getResponse.body.data.images[0]._id;

      // Update favorite status
      const updateResponse = await request(app)
        .patch(`/api/history/images/${imageId}`)
        .send({ isFavorite: true })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.isFavorite).toBe(true);
    });
  });
});

console.log('Running flow implementation tests...');