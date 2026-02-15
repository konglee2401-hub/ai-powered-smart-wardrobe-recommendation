import ClothingItem from '../models/ClothingItem.js';
import WearHistory from '../models/WearHistory.js';
import colorAnalysis from './colorAnalysis.js';

class AIRecommendationService {
  async getOutfitRecommendations(userId, options = {}) {
    const { occasion = 'casual', weather = null, mood = 'neutral', limit = 5 } = options;

    const allClothes = await ClothingItem.find({
      userId,
    });

    if (!allClothes.length) {
      return { outfits: [], message: 'Tủ đồ trống. Hãy thêm quần áo!' };
    }

    const recentHistory = await WearHistory.find({ userId })
      .sort({ wornDate: -1 })
      .limit(30);

    const recentItemIds = new Set(
      recentHistory
        .filter((h) => this._isRecent(h.wornDate, 3))
        .map((h) => h.clothingItemId.toString())
    );

    const scoredItems = allClothes.map((item) => ({
      item,
      score: this._scoreItem(item, {
        occasion,
        weather,
        mood,
        recentItemIds,
        recentHistory,
      }),
    }));

    const outfits = this._generateOutfits(scoredItems, { occasion, weather, limit });

    const rankedOutfits = outfits
      .map((outfit) => ({
        ...outfit,
        totalScore: this._calculateOutfitScore(outfit, { occasion, weather }),
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);

    return {
      outfits: rankedOutfits,
      weather,
      occasion,
      generatedAt: new Date(),
    };
  }

  _scoreItem(item, context) {
    let score = 50;

    const occasionMatch = this._getOccasionScore(item, context.occasion);
    score += occasionMatch * 30;

    if (context.weather) {
      const weatherMatch = this._getWeatherScore(item, context.weather);
      score += weatherMatch * 25;
    }

    if (context.recentItemIds.has(item._id.toString())) {
      score -= 15;
    } else {
      score += 10;
    }

    const wearCount = context.recentHistory.filter(
      (h) => h.clothingItemId.toString() === item._id.toString()
    ).length;
    score += Math.max(0, 10 - wearCount);

    if (item.isFavorite) score += 5;

    if (!item.season || item.season.includes('all')) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  _getOccasionScore(item, occasion) {
    const occasionStyles = {
      casual: ['casual', 'streetwear', 'sporty'],
      work: ['formal', 'business-casual', 'smart-casual'],
      formal: ['formal', 'elegant', 'business'],
      date: ['smart-casual', 'elegant', 'trendy'],
      sport: ['sporty', 'athletic'],
      party: ['party', 'trendy', 'streetwear', 'elegant'],
      travel: ['casual', 'comfortable', 'sporty'],
    };

    const matchingStyles = occasionStyles[occasion] || occasionStyles.casual;

    if (matchingStyles.includes(item.style)) return 1;
    if (item.occasions?.includes(occasion)) return 0.9;

    const casualOccasions = ['casual', 'travel'];
    if (casualOccasions.includes(occasion) && item.style === 'casual') return 0.8;

    return 0.3;
  }

  _getWeatherScore(item, weather) {
    const temp = weather?.temperature;
    const condition = weather?.condition;

    const hotMaterials = ['cotton', 'linen', 'silk', 'chiffon'];
    const coldMaterials = ['wool', 'fleece', 'cashmere', 'denim dày'];
    const rainMaterials = ['polyester', 'nylon', 'gore-tex'];

    let score = 0.5;

    if (typeof temp === 'number') {
      if (temp >= 30) {
        if (item.material && hotMaterials.includes(item.material)) score += 0.3;
        if (['t-shirt', 'tank-top', 'shorts', 'skirt'].includes(item.subCategory)) score += 0.2;
        if (['jacket', 'coat', 'sweater'].includes(item.subCategory)) score -= 0.4;
      } else if (temp >= 20) {
        score += 0.2;
      } else if (temp < 15) {
        if (item.material && coldMaterials.includes(item.material)) score += 0.3;
        if (['jacket', 'coat', 'sweater', 'hoodie'].includes(item.subCategory)) score += 0.2;
        if (['tank-top', 'shorts'].includes(item.subCategory)) score -= 0.4;
      }
    }

    if (condition === 'rainy') {
      if (item.material && rainMaterials.includes(item.material)) score += 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  _generateOutfits(scoredItems, options) {
    const outfits = [];
    const { limit } = options;

    const topItems = (category, n) =>
      scoredItems
        .filter((si) => si.item.category === category)
        .sort((a, b) => b.score - a.score)
        .slice(0, n);

    const tops = topItems('top', 8);
    const bottoms = topItems('bottom', 8);
    const shoes = topItems('shoes', 5);

    if (!tops.length || !bottoms.length || !shoes.length) return [];

    for (const top of tops) {
      for (const bottom of bottoms) {
        const shoe = shoes[0];
        if (!shoe) continue;

        const outfit = {
          items: [top.item, bottom.item, shoe.item],
          categories: ['top', 'bottom', 'shoes'],
          colors: [top.item.color, bottom.item.color, shoe.item.color].filter(Boolean),
        };

        outfits.push(outfit);
        if (outfits.length >= limit * 3) break;
      }
      if (outfits.length >= limit * 3) break;
    }

    return outfits;
  }

  _calculateOutfitScore(outfit, context) {
    let score = 0;

    const itemScores = outfit.items.map((item) =>
      this._scoreItem(item, {
        ...context,
        recentItemIds: new Set(),
        recentHistory: [],
      })
    );
    const avgItemScore =
      itemScores.reduce((acc, val) => acc + val, 0) / (itemScores.length || 1);
    score += (avgItemScore / 100) * 40;

    if (outfit.colors?.length) {
      const colorScore = colorAnalysis.calculateOutfitColorScore(outfit.colors);
      score += (colorScore / 10) * 35;
    } else {
      score += 20;
    }

    const styles = outfit.items.map((i) => i.style).filter(Boolean);
    const uniqueStyles = [...new Set(styles)];
    const styleConsistency = uniqueStyles.length <= 2 ? 1 : 0.6;
    score += styleConsistency * 25;

    return Math.round(score * 10) / 10;
  }

  _isRecent(date, days) {
    const diff =
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= days;
  }
}

export default new AIRecommendationService();

