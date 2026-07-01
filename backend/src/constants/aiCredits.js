/** AI credit costs — Creative Studio PRO uses variable amounts. */
export const AI_CREDIT_COSTS = {
  text: 1,
  creativePackNoImage: 3,
  creativePackWithImage: 8,
  regenerateImage: 5,
};

export const CREATIVE_STUDIO_DAILY_LIMIT = 10;
/** Minimum seconds between Creative Studio requests per user. */
export const CREATIVE_STUDIO_MIN_INTERVAL_SEC = 20;

export const CREATIVE_FORMATS = {
  square: { size: '1024x1024', label: 'Quadrato 1:1 (feed)', aspect: '1:1' },
  portrait: { size: '1024x1536', label: 'Portrait 4:5', aspect: '4:5' },
  story: { size: '1024x1792', label: 'Story 9:16', aspect: '9:16' },
  reel: { size: '1024x1792', label: 'Reel 9:16', aspect: '9:16' },
};

export const CREATIVE_STYLES = ['premium', 'minimal', 'tech', 'cinematic'];

export const CREATIVE_PLATFORMS = ['instagram', 'facebook', 'multi'];
