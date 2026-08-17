import { createClient, RedisClientType } from 'redis';
import config from '../config/index.js';


// Same singleton pattern as src/lib/prisma.ts - prevents opening a new
// connection on every tsx hot-reload during dev.
const globalForRedis = global as unknown as { redis: RedisClientType };

const redis: RedisClientType = globalForRedis.redis || createClient({ url: config.redis_url });

redis.on('error', (error) => {
  console.error('Redis connection error:', error.message);
});

if (!globalForRedis.redis) {
  redis.on('connect', () => {
    console.log('🔌 Redis connected');
  });

  await redis.connect();

  if (config.env !== 'production') {
    globalForRedis.redis = redis;
  }
}

export default redis;