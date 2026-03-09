export const IMAGE_USE_CASE_MATRIX = [
  {
    value: 'change-clothes',
    label: 'Change Clothes',
    labelKey: 'changeClothes',
    description: 'Virtual try-on thay đồ lên nhân vật',
    category: 'sales-core',
    baseMode: 'wearing',
    overlay: 'conversion',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['TikTok Shop', 'Shopee', 'Catalog'],
    inputRequirement: 'Character body coverage must match the garment zone being replaced',
    uploadInstruction: {
      character: 'Person to try on clothes. Use full body for full outfit, lower-body visibility for bottoms/shoes, torso visibility for tops.',
      product: 'Clothing or fashion item to place onto the character.',
      hint: 'Best for virtual try-on. Character image should cover the body area where the product will appear.'
    }
  },
  {
    value: 'character-holding-product',
    label: 'Holding Product',
    labelKey: 'characterHoldingProduct',
    description: 'Nhân vật cầm hoặc giới thiệu sản phẩm',
    category: 'sales-core',
    baseMode: 'holding',
    overlay: 'conversion',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['TikTok Shop', 'Reels', 'Affiliate Landing'],
    inputRequirement: 'Character should have arm or hand framing compatible with product presentation',
    uploadInstruction: {
      character: 'Presenter, KOL, or seller image with enough upper body or hand context for holding poses.',
      product: 'Product to hold, point at, or present to camera.',
      hint: 'Best for affiliate thumbnails and presenter-led product visuals.'
    }
  },
  {
    value: 'affiliate-video-tiktok',
    label: 'Tiktok Affiliate',
    labelKey: 'affiliateVideoTikTok',
    description: 'Luồng affiliate TikTok riêng, phân tích rồi generate wearing + holding',
    category: 'specialized-flow',
    baseMode: 'workflow-affiliate',
    overlay: 'affiliate',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['TikTok Affiliate'],
    inputRequirement: 'Optimized for creator-driven affiliate workflow',
    uploadInstruction: {
      character: 'KOL or creator image, ideally half-body or full-body depending on product focus.',
      product: 'Product used in TikTok affiliate content.',
      hint: 'Runs the dedicated affiliate pipeline and should stay separate from generic image use cases.'
    }
  },
  {
    value: 'ecommerce-product',
    label: 'E-commerce',
    labelKey: 'ecommerce',
    description: 'Ảnh sản phẩm bán hàng sạch, rõ, tối ưu chuyển đổi',
    category: 'sales-core',
    baseMode: 'product-only',
    overlay: 'ecommerce',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'optional', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['Shopee', 'Lazada', 'Website PDP'],
    inputRequirement: 'Character is optional. Product clarity is primary.',
    uploadInstruction: {
      character: 'Optional character only for scale or styling support.',
      product: 'Cleanly Product for PDP, catalog, or listing imagery.',
      hint: 'Use when product must dominate and background/styling should stay commercially clean.'
    }
  },
  {
    value: 'social-media',
    label: 'Social Media',
    labelKey: 'socialMedia',
    description: 'Ảnh hook mạnh cho feed, reels, thumbnail, post bán hàng',
    category: 'marketing',
    baseMode: 'wearing',
    overlay: 'social',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['Instagram', 'Facebook', 'TikTok', 'YouTube Shorts'],
    inputRequirement: 'Character should be readable and product still visible enough for social conversion.',
    uploadInstruction: {
      character: 'Creator, model, or seller image for attention-grabbing social content.',
      product: 'Product to wear or feature prominently in a social-first visual.',
      hint: 'Best for hook images, thumbnails, social posts, and organic content.'
    }
  },
  {
    value: 'fashion-editorial',
    label: 'Editorial',
    labelKey: 'editorial',
    description: 'Ảnh thời trang định hướng premium, lookbook, campaign',
    category: 'branding',
    baseMode: 'wearing',
    overlay: 'editorial',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['Lookbook', 'Campaign', 'Brand Page'],
    inputRequirement: 'Character identity remains important, but the art direction is elevated.',
    uploadInstruction: {
      character: 'Model or character profile with a clear premium/editorial look.',
      product: 'Fashion piece to present in a stronger campaign or lookbook direction.',
      hint: 'Use when brand tone matters more than pure product listing clarity.'
    }
  },
  {
    value: 'lifestyle-scene',
    label: 'Lifestyle',
    labelKey: 'lifestyle',
    description: 'Ảnh sản phẩm trong ngữ cảnh đời sống thật',
    category: 'marketing',
    baseMode: 'wearing',
    overlay: 'lifestyle',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['Social', 'Website Banner', 'Blog', 'Reels'],
    inputRequirement: 'Character and environment should feel authentic and natural.',
    uploadInstruction: {
      character: 'Person in a relatable lifestyle context or suitable for everyday usage scenes.',
      product: 'Product to place into a realistic daily-life situation.',
      hint: 'Best for “real usage” storytelling instead of pure studio selling.'
    }
  },
  {
    value: 'before-after',
    label: 'Before / After',
    labelKey: 'beforeAfter',
    description: 'Visual transformation hoặc so sánh baseline vs improved look',
    category: 'marketing',
    baseMode: 'comparison',
    overlay: 'transformation',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['Ads', 'Landing Page', 'Short-form Hook'],
    inputRequirement: 'Works best when the same identity can be preserved across two visual states.',
    uploadInstruction: {
      character: 'Character image used as the baseline “before” identity source.',
      product: 'Product or styling target that defines the “after” state.',
      hint: 'Useful for transformation messaging, but should eventually evolve into a dedicated two-state workflow.'
    }
  },
  {
    value: 'creator-thumbnail',
    label: 'Creator Thumbnail',
    labelKey: 'creatorThumbnail',
    description: 'Ảnh hook cho thumbnail video bán hàng, review, reaction, top list',
    category: 'marketing',
    baseMode: 'holding',
    overlay: 'thumbnail',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'optional' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['YouTube', 'TikTok', 'Reels'],
    inputRequirement: 'Requires expressive face framing plus product readability.',
    uploadInstruction: {
      character: 'Creator or presenter image with strong face readability and expressive thumbnail energy.',
      product: 'Optional product image if you want the thumbnail to reference a specific item.',
      hint: 'Best for review, hook, reaction, ranking, or creator-led cover images.'
    }
  },
  {
    value: 'ugc-testimonial',
    label: 'UGC Testimonial',
    labelKey: 'ugcTestimonial',
    description: 'Ảnh nhân vật review, chia sẻ cảm nhận, testimonial bán hàng',
    category: 'marketing',
    baseMode: 'holding',
    overlay: 'ugc',
    status: 'planned',
    includeInImageStudio: false,
    inputSchema: { character: 'required', product: 'optional' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['TikTok', 'Shopee Feed', 'Ads'],
    inputRequirement: 'Needs believable consumer posture and real-user energy.'
  },
  {
    value: 'product-unboxing',
    label: 'Unboxing Visual',
    labelKey: 'productUnboxing',
    description: 'Ảnh preview unboxing, reveal, first impression',
    category: 'sales-core',
    baseMode: 'holding',
    overlay: 'unboxing',
    status: 'planned',
    includeInImageStudio: false,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['TikTok', 'Reels', 'Shorts'],
    inputRequirement: 'Needs hand interaction and packaging context.'
  },
  {
    value: 'live-selling-host',
    label: 'Live Selling Host',
    labelKey: 'liveSellingHost',
    description: 'Ảnh host livestream chốt đơn, sale burst, deal push',
    category: 'sales-core',
    baseMode: 'holding',
    overlay: 'live-commerce',
    status: 'planned',
    includeInImageStudio: false,
    inputSchema: { character: 'required', product: 'required' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['TikTok Live', 'Shopee Live'],
    inputRequirement: 'Needs energetic host framing and clear promo posture.'
  },
  {
    value: 'story-character',
    label: 'Story Character',
    labelKey: 'storyCharacter',
    description: 'Nhân vật kể chuyện, mascot, host xuyên suốt nhiều scene',
    category: 'character-media',
    baseMode: 'character-led',
    overlay: 'storytelling',
    status: 'active',
    includeInImageStudio: true,
    inputSchema: { character: 'required', product: 'optional' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['YouTube', 'Reels', 'Animated Story Ads'],
    inputRequirement: 'Identity lock and recurring character continuity are primary.',
    uploadInstruction: {
      character: 'Main narrator, mascot, or recurring host character to keep consistent across story scenes.',
      product: 'Optional prop or branded item to associate with the character.',
      hint: 'Best for character-first storytelling, host-driven explainer visuals, and recurring personas.'
    }
  },
  {
    value: 'singing-performance',
    label: 'Singing Performance',
    labelKey: 'singingPerformance',
    description: 'Nhân vật hát, performance visual, music-cover persona',
    category: 'character-media',
    baseMode: 'character-led',
    overlay: 'performance',
    status: 'planned',
    includeInImageStudio: false,
    inputSchema: { character: 'required', product: 'optional' },
    productFocusSupported: ['full-outfit', 'top', 'bottom', 'shoes', 'accessories', 'specific-item'],
    primaryChannels: ['YouTube', 'Reels', 'Music Shorts'],
    inputRequirement: 'Needs stronger facial identity and stage/performance styling continuity.'
  }
];

export const IMAGE_USE_CASE_MAP = IMAGE_USE_CASE_MATRIX.reduce((acc, item) => {
  acc[item.value] = item;
  return acc;
}, {});

export const IMAGE_STUDIO_USE_CASES = IMAGE_USE_CASE_MATRIX.filter(
  (item) => item.includeInImageStudio && item.status === 'active'
);

export function getImageUseCaseMeta(useCase) {
  return IMAGE_USE_CASE_MAP[useCase] || IMAGE_USE_CASE_MAP['change-clothes'];
}

export function getImageUseCaseLabel(useCase) {
  return getImageUseCaseMeta(useCase)?.label || useCase;
}

export function getImageUseCaseUploadInstruction(useCase) {
  return getImageUseCaseMeta(useCase)?.uploadInstruction || IMAGE_USE_CASE_MAP['change-clothes']?.uploadInstruction;
}

export function getImageUseCaseInputSchema(useCase) {
  return getImageUseCaseMeta(useCase)?.inputSchema || { character: 'required', product: 'required' };
}
