import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TokenBlacklistService {
  constructor(private prisma: PrismaService) {}
  blacklist(jti: string, expiresAt: Date) {
    return this.prisma.tokenBlacklist.create({
      data: {
        jti,
        expiresAt,
      },
    });
  }
  async isBlacklisted(jti: string) {
    const token = await this.prisma.tokenBlacklist.findUnique({
      where: {
        jti,
      },
    });
    return token !== null;
  }
  removeExpired() {
    return this.prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledCleanup() {
    await this.removeExpired();
  }
}
