import VideoPipelineJob from '../models/VideoPipelineJob.js';
import { ensureUserSubscription, getActiveSubscription } from '../services/subscriptionService.js';
import { checkAndConsumeGeneration, checkAndConsumeScrape } from '../services/usageService.js';

export async function requireActiveSubscription(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
    if (req.user.role === 'admin') return next();

    let subscription = await getActiveSubscription(req.user._id);
    if (!subscription) {
      subscription = await ensureUserSubscription(req.user._id);
    }

    if (!subscription || subscription.status !== 'active' || subscription.endAt < new Date()) {
      return res.status(403).json({ success: false, message: 'Subscription inactive or expired' });
    }

    req.subscription = subscription;
    req.plan = subscription.plan;
    next();
  } catch (error) {
    next(error);
  }
}

export const consumeGeneration = (type, amount = 1) => async (req, res, next) => {
  try {
    if (!req.user || req.user.role === 'admin') return next();
    const plan = req.plan || req.subscription?.plan;
    const result = await checkAndConsumeGeneration(req.user._id, type, amount, plan?.limits);
    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Daily limit reached',
        limit: result.limit,
        used: result.used,
        type,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const consumeScrape = (reqKey = 'limit') => async (req, res, next) => {
  try {
    if (!req.user || req.user.role === 'admin') return next();
    const plan = req.plan || req.subscription?.plan;
    const requested = Number(req.body?.[reqKey] ?? req.query?.[reqKey] ?? 0);
    const result = await checkAndConsumeScrape(req.user._id, { runs: 1, videos: requested }, plan?.limits);
    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Scrape limit reached',
        reason: result.reason,
        limit: result.limit,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const enforceMashupConcurrency = () => async (req, res, next) => {
  try {
    if (!req.user || req.user.role === 'admin') return next();
    const plan = req.plan || req.subscription?.plan;
    const maxConcurrent = plan?.limits?.mashup?.maxConcurrent;
    if (maxConcurrent === null || maxConcurrent === undefined) return next();
    const running = await VideoPipelineJob.countDocuments({ status: 'processing' });
    if (running >= maxConcurrent) {
      return res.status(429).json({
        success: false,
        message: 'Mashup concurrency limit reached',
        limit: maxConcurrent,
        running,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};
