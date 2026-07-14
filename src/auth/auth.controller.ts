import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { type Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type JwtPayload } from './interfaces/jwt_payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const token = await this.authService.register(dto);
    return {
      token,
    };
  }
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const token = await this.authService.login(dto);
    return {
      token,
    };
  }
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.jti, new Date(user.exp * 1000));
  }
}
