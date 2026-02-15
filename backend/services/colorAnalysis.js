class ColorAnalysisService {
  constructor() {
    this.colorMap = {
      đen: '#000000',
      trắng: '#FFFFFF',
      xám: '#808080',
      đỏ: '#FF0000',
      'xanh dương': '#0000FF',
      'xanh navy': '#000080',
      'xanh lá': '#008000',
      vàng: '#FFD700',
      cam: '#FFA500',
      tím: '#800080',
      hồng: '#FFC0CB',
      nâu: '#8B4513',
      be: '#F5F5DC',
      kem: '#FFFDD0',
      'xanh olive': '#808000',
      burgundy: '#800020',
      'xanh mint': '#98FF98',
      coral: '#FF7F50',
      lavender: '#E6E6FA',
      khaki: '#C3B091',
    };

    this.compatibilityMatrix = {
      đen: { trắng: 10, đỏ: 9, xám: 8, vàng: 8, hồng: 8, 'xanh dương': 9, be: 9 },
      trắng: { đen: 10, 'xanh dương': 9, đỏ: 8, 'xanh navy': 9, xám: 8, nâu: 7, be: 6 },
      'xanh navy': { trắng: 9, be: 9, kem: 9, đỏ: 7, xám: 8, khaki: 9, hồng: 7 },
      xám: { đen: 8, trắng: 8, hồng: 8, 'xanh dương': 8, đỏ: 7, vàng: 7, tím: 8 },
      be: { đen: 9, 'xanh navy': 9, nâu: 9, trắng: 6, 'xanh olive': 8, burgundy: 8 },
      nâu: { be: 9, kem: 9, trắng: 7, 'xanh dương': 7, cam: 7, 'xanh olive': 8 },
      đỏ: { đen: 9, trắng: 8, 'xanh navy': 7, xám: 7, be: 6 },
      hồng: { xám: 8, đen: 8, 'xanh navy': 7, trắng: 7, be: 7 },
      'xanh dương': { trắng: 9, xám: 8, đen: 9, be: 8, nâu: 7, khaki: 8 },
      'xanh olive': { be: 8, nâu: 8, kem: 8, đen: 7, trắng: 7 },
      tím: { xám: 8, đen: 8, trắng: 7, lavender: 7, be: 6 },
      vàng: { đen: 8, 'xanh navy': 8, xám: 7, trắng: 6 },
    };
  }

  getCompatibilityScore(color1, color2) {
    if (!color1 || !color2) return 5;
    if (color1 === color2) return 7;

    const score =
      this.compatibilityMatrix[color1]?.[color2] ||
      this.compatibilityMatrix[color2]?.[color1];

    if (score) return score;

    const neutralColors = ['đen', 'trắng', 'xám', 'be', 'kem', 'khaki'];
    if (neutralColors.includes(color1) || neutralColors.includes(color2)) {
      return 7;
    }

    return 5;
  }

  calculateOutfitColorScore(colors) {
    const filtered = colors.filter(Boolean);
    if (filtered.length <= 1) return 10;

    let totalScore = 0;
    let pairs = 0;

    for (let i = 0; i < filtered.length; i += 1) {
      for (let j = i + 1; j < filtered.length; j += 1) {
        totalScore += this.getCompatibilityScore(filtered[i], filtered[j]);
        pairs += 1;
      }
    }

    const avgScore = totalScore / (pairs || 1);

    let colorCountModifier = 1;
    if (filtered.length === 2) colorCountModifier = 1.05;
    if (filtered.length === 3) colorCountModifier = 1.0;
    if (filtered.length === 4) colorCountModifier = 0.95;
    if (filtered.length >= 5) colorCountModifier = 0.85;

    const uniqueColors = [...new Set(filtered)];
    if (uniqueColors.length === 3) {
      const neutralColors = ['đen', 'trắng', 'xám', 'be', 'kem'];
      const hasNeutralBase = neutralColors.includes(uniqueColors[0]);
      if (hasNeutralBase) colorCountModifier *= 1.1;
    }

    return Math.min(10, Math.round(avgScore * colorCountModifier * 10) / 10);
  }
}

export default new ColorAnalysisService();

