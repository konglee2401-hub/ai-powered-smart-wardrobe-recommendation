import Outfit from '../models/Outfit.js';
import WearHistory from '../models/WearHistory.js';
import aiRecommendation from '../services/aiRecommendation.js';
import weatherService from '../services/weatherService.js';

export const getRecommendations = async (req, res) => {
  try {
    const { occasion, mood, lat, lon } = req.query;

    let weather = null;
    if (lat && lon) {
      weather = await weatherService.getCurrentWeather(
        parseFloat(lat),
        parseFloat(lon)
      );
    }

    const recommendations = await aiRecommendation.getOutfitRecommendations(
      req.user._id,
      {
        occasion,
        mood,
        weather,
      }
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveOutfit = async (req, res) => {
  try {
    const { name, items, occasion, notes } = req.body;

    const outfit = await Outfit.create({
      userId: req.user._id,
      name: name || `Outfit ${new Date().toLocaleDateString('vi-VN')}`,
      items,
      occasion,
      notes,
    });

    await outfit.populate('items');

    res.status(201).json({ success: true, data: outfit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOutfits = async (req, res) => {
  try {
    const { occasion, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };

    if (occasion) filter.occasion = occasion;

    const outfits = await Outfit.find(filter)
      .populate('items')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    const total = await Outfit.countDocuments(filter);

    res.json({
      success: true,
      data: outfits,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const wearOutfit = async (req, res) => {
  try {
    const { outfitId } = req.params;
    const { rating, notes } = req.body;

    const outfit = await Outfit.findOne({
      _id: outfitId,
      userId: req.user._id,
    });
    if (!outfit) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy outfit' });
    }

    const historyEntries = outfit.items.map((itemId) => ({
      userId: req.user._id,
      clothingItemId: itemId,
      outfitId: outfit._id,
      wornDate: new Date(),
      occasion: outfit.occasion,
      rating,
      notes,
    }));

    await WearHistory.insertMany(historyEntries);

    outfit.wearCount = (outfit.wearCount || 0) + 1;
    outfit.lastWorn = new Date();
    await outfit.save();

    res.json({ success: true, message: 'Đã ghi nhận!', data: outfit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOutfit = async (req, res) => {
  try {
    const outfit = await Outfit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!outfit) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy outfit' });
    }

    res.json({ success: true, message: 'Đã xóa outfit' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ success: false, message: 'Cần cung cấp tọa độ (lat, lon)' });
    }

    const [current, forecast] = await Promise.all([
      weatherService.getCurrentWeather(parseFloat(lat), parseFloat(lon)),
      weatherService.getForecast(parseFloat(lat), parseFloat(lon)),
    ]);

    const suggestions = weatherService.getClothingSuggestions(current);

    res.json({
      success: true,
      data: { current, forecast, suggestions },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

