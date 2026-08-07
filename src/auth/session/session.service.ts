import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RedisService } from 'src/infrastructure/redis/redis.service';

@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}
  private readonly logger = new Logger(SessionService.name);

  async blacklist(jti: string, expiresAt: Date) {
    const ttl_seconds = Math.floor(expiresAt.getTime() / 1000);
    if (ttl_seconds <= Date.now() / 1000) {
      return;
    }
    try {
      return await this.redis.set(`blacklist:${jti}`, '1', {
        type: 'EXAT',
        value: ttl_seconds,
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
      return await this.redis.exists(`blacklist:${jti}`);
    } catch (error) {
      this.logger.error(
        'Failed to get session',
        error instanceof Error ? error.stack : error,
      );
      return false;
    }
  }
}
