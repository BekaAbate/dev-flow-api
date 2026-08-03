import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type JwtPayload } from 'src/auth/interfaces/jwt_payload.interface';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/create-organization.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(AuthGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}
  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrganizationDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|webp)$/,
          }),
        ],
      }),
    )
    logo?: Express.Multer.File,
  ) {
    return this.orgService.create(user.sub, dto, logo);
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
  @UseInterceptors(FileInterceptor('logo'))
  update(
    @CurrentUser() user: JwtPayload,
    @Param('name') name: string,
    @Body() dto: UpdateOrganizationDto,

    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|webp)$/,
          }),
        ],
      }),
    )
    logo?: Express.Multer.File,
  ) {
    return this.orgService.update(user.sub, name, dto, logo);
  }
  @Delete(':name')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: JwtPayload, @Param('name') name: string) {
    return this.orgService.delete(user.sub, name);
  }
}
