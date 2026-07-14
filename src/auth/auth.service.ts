import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { TokenBlacklistService } from 'src/token-blacklist/token-blacklist.service';
import { JwtPayload } from './interfaces/jwt_payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}
  async register(dto: RegisterDto) {
    const user = await this.userService.create(dto);
    const payload = {
      sub: user.id,
      email: user.email,
      jti: crypto.randomUUID(),
    };
    return await this.jwtService.signAsync(payload);
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const payload = {
      sub: user.id,
      email: user.email,
      jti: crypto.randomUUID(),
    };
    return await this.jwtService.signAsync(payload);
  }
  async validateUser({ email, password }: LoginDto) {
    const user = await this.userService.findByEmail(email);
    if (!user) return null;
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return null;
    return user;
  }
  logout(jti: string, expiresAt: Date) {
    return this.tokenBlacklistService.blacklist(jti, expiresAt);
  }
}
