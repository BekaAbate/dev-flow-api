import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { SessionService } from 'src/auth/session/session.service';

@Module({
  imports: [AuthModule, CloudinaryModule],
  providers: [OrganizationService, SessionService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
