import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { AuthModule } from 'src/auth/auth.module';
import { TokenBlacklistModule } from 'src/token-blacklist/token-blacklist.module';

@Module({
  imports: [AuthModule, TokenBlacklistModule],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
