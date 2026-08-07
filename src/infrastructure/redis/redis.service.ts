import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.provider';
import { type RedisClientType } from 'redis';

interface ExpirationOptionsType {
  type: 'EX' | 'EXAT';
  value: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClientType) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    expiration?: ExpirationOptionsType,
  ): Promise<void> {
    if (expiration) {
      await this.client.set(key, value, {
        expiration,
      });
    } else {
      await this.client.set(key, value);
    }
  }
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
