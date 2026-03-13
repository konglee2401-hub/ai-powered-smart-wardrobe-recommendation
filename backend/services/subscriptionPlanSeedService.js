import SubscriptionPlan from '../models/SubscriptionPlan.js';

const DEFAULT_PLANS = [
  {
    code: '1d',
    name: '1 Day',
    description: 'Single day access for quick testing.',
    durationDays: 1,
    isDefault: false,
    sortOrder: 10,
    permissions: {
      menu: ['generation', 'video-pipeline'],
      api: ['generation', 'video-pipeline', 'browser-automation'],
      queue: [],
      job: [],
    },
    limits: {
      storage: { maxGB: 2 },
      scrape: { maxPerDay: 1, maxPerRun: 20 },
      mashup: { maxConcurrent: 1 },
      generationDaily: { image: 20, video: 2, voice: 5, oneClick: 3 },
    },
    isLocked: true,
  },
  {
    code: '7d',
    name: '7 Days',
    description: 'One week workspace access with moderate limits.',
    durationDays: 7,
    isDefault: false,
    sortOrder: 20,
    permissions: {
      menu: ['generation', 'video-pipeline', 'prompt-templates'],
      api: ['generation', 'video-pipeline', 'browser-automation', 'tts'],
      queue: [],
      job: [],
    },
    limits: {
      storage: { maxGB: 10 },
      scrape: { maxPerDay: 3, maxPerRun: 50 },
      mashup: { maxConcurrent: 2 },
      generationDaily: { image: 80, video: 5, voice: 12, oneClick: 8 },
    },
    isLocked: true,
  },
  {
    code: '30d',
    name: '30 Days',
    description: 'Monthly access with higher limits.',
    durationDays: 30,
    isDefault: true,
    sortOrder: 30,
    permissions: {
      menu: ['generation', 'video-pipeline', 'prompt-templates', 'gallery'],
      api: ['generation', 'video-pipeline', 'browser-automation', 'tts'],
      queue: ['queue-settings'],
      job: ['job-control'],
    },
    limits: {
      storage: { maxGB: 50 },
      scrape: { maxPerDay: 10, maxPerRun: 120 },
      mashup: { maxConcurrent: 4 },
      generationDaily: { image: 250, video: 20, voice: 40, oneClick: 25 },
    },
    isLocked: true,
  },
  {
    code: '365d',
    name: '365 Days',
    description: 'Annual access with premium limits.',
    durationDays: 365,
    isDefault: false,
    sortOrder: 40,
    permissions: {
      menu: ['generation', 'video-pipeline', 'prompt-templates', 'gallery', 'analytics'],
      api: ['generation', 'video-pipeline', 'browser-automation', 'tts'],
      queue: ['queue-settings'],
      job: ['job-control'],
    },
    limits: {
      storage: { maxGB: 200 },
      scrape: { maxPerDay: 25, maxPerRun: 300 },
      mashup: { maxConcurrent: 8 },
      generationDaily: { image: 800, video: 60, voice: 120, oneClick: 80 },
    },
    isLocked: true,
  },
];

export async function seedSubscriptionPlans() {
  const existing = await SubscriptionPlan.find().lean();
  if (!existing.length) {
    await SubscriptionPlan.insertMany(DEFAULT_PLANS);
    return { created: DEFAULT_PLANS.length };
  }

  const existingByCode = new Map(existing.map((plan) => [plan.code, plan]));
  const ops = [];

  DEFAULT_PLANS.forEach((plan) => {
    const current = existingByCode.get(plan.code);
    if (!current) {
      ops.push({ insertOne: { document: plan } });
      return;
    }
    ops.push({
      updateOne: {
        filter: { _id: current._id },
        update: {
          $set: {
            name: plan.name,
            description: plan.description,
            durationDays: plan.durationDays,
            permissions: plan.permissions,
            access: plan.access,
            limits: plan.limits,
            isLocked: plan.isLocked,
            isDefault: plan.isDefault,
            sortOrder: plan.sortOrder,
          },
        },
      },
    });
  });

  if (ops.length) {
    await SubscriptionPlan.bulkWrite(ops);
  }

  return { updated: ops.length };
}
