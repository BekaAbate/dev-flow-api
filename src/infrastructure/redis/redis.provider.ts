import { Logger, Provider } from '@nestjs/common';
import { createClient } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const logger = new Logger('RedisProvider');

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: async () => {
    const client = createClient({
      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= 2) {
            return new Error('Redis is not available');
          }
          return 1000;
        },
      },
    });
    client.on('error', (err) => logger.error('Redis client error', err));
    client.on('ready', () => logger.log('Redis connected and ready'));
    client.on('connect', () => logger.log('Connecting to redis...'));
    await client.connect();
    return client;
  },
};
