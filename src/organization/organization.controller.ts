import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type JwtPayload } from 'src/auth/interfaces/jwt_payload.interface';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/create-organization.dto';

@UseGuards(AuthGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    return this.orgService.create(user.sub, dto);
  }
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.orgService.findAll(user.sub);
  }
  @Get(':name')
  findOne(@CurrentUser() user: JwtPayload, @Param('name') name: string) {
    return this.orgService.findOne(user.sub, name);
  }
  @Put(':name')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('name') name: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgService.update(user.sub, name, dto);
  }
  @Delete(':name')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: JwtPayload, @Param('name') name: string) {
    return this.orgService.delete(user.sub, name);
  }
}
