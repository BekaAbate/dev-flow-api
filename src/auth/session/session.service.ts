import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { type RedisClientType } from 'redis';
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider';

@Injectable()
export class SessionService {
  constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClientType) {}
  private readonly logger = new Logger(SessionService.name);

  async blacklist(jti: string, expiresAt: Date) {
    const ttl_seconds = Math.floor(expiresAt.getTime() / 1000);
    if (ttl_seconds <= Date.now() / 1000) {
      return;
    }
    try {
      return await this.client.set(`blacklist:${jti}`, '1', {
        expiration: {
          type: 'EXAT',
          value: ttl_seconds,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to blacklist token: ${jti}`, error);
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Could not complete logout, please try again',
      });
    }
  }
  async isBlacklisted(jti: string) {
    try {
      const exists = await this.client.get(`blacklist:${jti}`);
      return exists !== null;
    } catch (error) {
      this.logger.error(
        'Failed to get session',
        error instanceof Error ? error.stack : error,
      );
      return false;
    }
  }
}
