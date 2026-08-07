import { Global, Module } from '@nestjs/common';
import { REDIS_CLIENT, redisProvider } from './redis.provider';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [redisProvider, RedisService],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
