import { headers } from 'next/headers';
import { AppError, ConfigurationError, ServiceUnavailableError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { auth } from '@/auth';
import { Redis } from '@upstash/redis';

export type RateLimitCategory = 
  | 'AUTHENTICATION'
  | 'PUBLIC_FORMS'
  | 'FINANCIAL'
  | 'SENSITIVE_FILES'
  | 'ADMINISTRATIVE'
  | 'PUBLIC_PRICING';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const CATEGORY_CONFIG: Record<RateLimitCategory, RateLimitConfig> = {
  AUTHENTICATION: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  PUBLIC_FORMS: { maxRequests: 10, windowMs: 10 * 60 * 1000 }, // 10 forms per 10 minutes
  FINANCIAL: { maxRequests: 15, windowMs: 15 * 60 * 1000 },    // 15 financial ops per 15 minutes
  SENSITIVE_FILES: { maxRequests: 30, windowMs: 60 * 60 * 1000 }, // 30 files per 1 hour
  ADMINISTRATIVE: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 ops per 1 hour
  PUBLIC_PRICING: { maxRequests: process.env.NODE_ENV === 'test' ? 10 : 100, windowMs: 15 * 60 * 1000 }, // 100 pricing requests per 15 min
};

const SECURITY_CRITICAL_CATEGORIES = new Set<RateLimitCategory>([
  'AUTHENTICATION',
  'FINANCIAL',
  'ADMINISTRATIVE',
  'SENSITIVE_FILES'
]);

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitRecord>;
  reset(key: string): Promise<void>;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    
    // Cleanup probabilistically
    if (Math.random() < 0.05) {
      for (const [k, v] of this.store.entries()) {
        if (v.resetAt < now) this.store.delete(k);
      }
    }

    let record = this.store.get(key);
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + windowMs };
    }
    record.count++;
    this.store.set(key, record);
    
    return record;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class UpstashRedisRateLimitStore implements RateLimitStore {
  private redis: Redis;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      throw new ConfigurationError('Upstash Redis configuration is missing (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN).');
    }
    this.redis = new Redis({ url, token });
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const prefix = process.env.NODE_ENV === 'test' ? 'test:rate-limit:' : 'rate-limit:';
    const redisKey = `${prefix}${key}`;
    
    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.pttl(redisKey);
    const results = await pipeline.exec();
    
    const count = results[0] as number;
    const pttl = results[1] as number;
    
    let resetAt = Date.now();
    
    if (count === 1 || pttl === -1) {
      await this.redis.pexpire(redisKey, windowMs);
      resetAt += windowMs;
    } else {
      resetAt += (pttl > 0 ? pttl : windowMs);
    }
    
    return { count, resetAt };
  }

  async reset(key: string): Promise<void> {
    const prefix = process.env.NODE_ENV === 'test' ? 'test:rate-limit:' : 'rate-limit:';
    const redisKey = `${prefix}${key}`;
    await this.redis.del(redisKey);
  }
}

export class RateLimitError extends AppError {
  constructor(public retryAfterSeconds: number) {
    super('Too Many Requests', 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class RateLimitService {
  private static storeInstance: RateLimitStore | null = null;

  private static getStore(): RateLimitStore {
    if (this.storeInstance) return this.storeInstance;

    const isProduction = process.env.NODE_ENV === 'production';
    const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

    if (isProduction || hasUpstash) {
      if (!hasUpstash) {
        throw new ConfigurationError('Upstash Redis configuration is missing in production environment.');
      }
      this.storeInstance = new UpstashRedisRateLimitStore();
    } else {
      logger.warn('Using in-memory rate limiter. This is unsafe for multi-instance deployments.');
      this.storeInstance = new InMemoryRateLimitStore();
    }

    return this.storeInstance;
  }

  /**
   * Evaluates the rate limit for a specific action and category.
   * Throws RateLimitError if exceeded.
   */
  static async checkLimit(category: RateLimitCategory): Promise<void> {
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      return; 
    }

    const identifier = await this.getIdentifier();
    const key = `${category}:${identifier}`;
    const config = CATEGORY_CONFIG[category];

    const store = this.getStore();

    try {
      const record = await store.increment(key, config.windowMs);
      
      if (record.count > config.maxRequests) {
        const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - Date.now()) / 1000));
        
        const hashedId = Buffer.from(identifier).toString('base64').substring(0, 8);
        logger.warn(`Rate limit exceeded`, { category, identifier: hashedId });

        throw new RateLimitError(retryAfterSeconds);
      }
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      if (error instanceof ConfigurationError) throw error; 

      logger.error('RateLimitStore failure', { error });
      
      if (SECURITY_CRITICAL_CATEGORIES.has(category)) {
        throw new ServiceUnavailableError('Rate limit service temporarily unavailable');
      } else {
        logger.warn(`Bypassing rate limit for ${category} due to store failure`);
      }
    }
  }

  /**
   * Resets the limit for a specific category/identifier. Useful on successful auth.
   */
  static async resetLimit(category: RateLimitCategory): Promise<void> {
     const identifier = await this.getIdentifier();
     const key = `${category}:${identifier}`;
     const store = this.getStore();
     
     try {
       await store.reset(key);
     } catch (error) {
       logger.error('RateLimitStore failure during reset', { error });
     }
  }

  private static async getIdentifier(): Promise<string> {
    let ip = 'unknown-ip';
    
    try {
      const headersList = await headers();
      const forwardedFor = headersList.get('x-forwarded-for');
      const realIp = headersList.get('x-real-ip');
      
      if (realIp) {
         ip = realIp;
      } else if (forwardedFor) {
         ip = forwardedFor.split(',')[0].trim();
      }
    } catch {
      // Ignored outside request context (e.g. scripts)
    }

    try {
      const session = await auth();
      if (session?.user?.id) {
        return `user:${session.user.id}:${ip}`;
      }
    } catch {
      // Ignored
    }

    return `ip:${ip}`;
  }
}
