import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  // Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
// import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type JwtPayload } from 'src/auth/interfaces/jwt_payload.interface';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}
  // @Post()
  // create(@Body() dto: CreateUserDto) {
  //   return this.userService.create(dto);
  // }
  @Get('/me')
  @UseGuards(AuthGuard)
  findById(@CurrentUser() user: JwtPayload) {
    return this.userService.findById(user.sub);
  }
  // @Get()
  // findAll() {
  //   return this.userService.findAll();
  // }
  @Put('/me')
  @UseGuards(AuthGuard)
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return this.userService.update(user.sub, dto);
  }
  @Delete('/me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload) {
    return this.userService.remove(user.sub);
  }
}
