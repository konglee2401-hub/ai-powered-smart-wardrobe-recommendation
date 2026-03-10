export const DEFAULT_SCORING_CONFIG = {
  weights: {
    tag: 2,
    keyword: 3,
    focusBoost: 2,
    domainBoost: 3
  },
  boosts: [
    {
      id: 'kol',
      score: 3,
      match: (corpus) => corpus.includes('kol') || corpus.includes('persona') || corpus.includes('influencer')
    },
    {
      id: 'ai-tool',
      score: 3,
      match: (corpus) => corpus.includes('tool') || corpus.includes('saas') || corpus.includes('automation')
    },
    {
      id: 'fashion-movement',
      score: 2,
      match: (corpus) => corpus.includes('outfit') || corpus.includes('fashion') || corpus.includes('dress')
    },
    {
      id: 'deal-urgency',
      score: 2,
      match: (corpus) => corpus.includes('deal') || corpus.includes('sale') || corpus.includes('discount')
    }
  ],
  topCandidates: 3
};

export default DEFAULT_SCORING_CONFIG;
