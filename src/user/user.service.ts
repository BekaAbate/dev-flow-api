import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user-request-dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { UserResponseDto } from './dto/user-response-dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}
  logger = new Logger(UserService.name);
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const { password, ...userData } = dto;
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          passwordHash,
        },
        omit: {
          passwordHash: true,
        },
      });

      const key = `user:${user.id}`;
      try {
        await this.redis.set(key, JSON.stringify(user), {
          type: 'EX',
          value: 300,
        });
      } catch (error) {
        this.logger.error('Failed to set user to redis:', error);
      }
      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'USER_ALREADY_EXISTS',
          message: 'An account with this email already exists.',
        });
      }
      throw error;
    }
  }
  async findById(id: string): Promise<UserResponseDto> {
    const key = `user:${id}`;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(key);
    } catch (error) {
      this.logger.error('Failed to get user from redis:', error);
    }

    if (cached) {
      if (cached === 'NOT_FOUND') {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'user not found',
        });
      }
      return JSON.parse(cached) as UserResponseDto;
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
    if (!user) {
      try {
        await this.redis.set(key, 'NOT_FOUND', {
          type: 'EX',
          value: 60,
        });
      } catch (error) {
        this.logger.error('Failed to set user to redis:', error);
      }
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'user not found',
      });
    }

    try {
      await this.redis.set(key, JSON.stringify(user), {
        type: 'EX',
        value: 300,
      });
    } catch (error) {
      this.logger.error('Failed to set user from redis:', error);
    }
    return user;
  }
  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'user not found',
      });
    return user;
  }
  findAll() {
    return this.prisma.user.findMany();
  }
  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const { password, ...userData } = dto;
    const data: Prisma.UserUpdateInput = {
      ...userData,
    };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
        omit: {
          passwordHash: true,
        },
      });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2025':
            throw new NotFoundException({
              code: 'USER_NOT_FOUND',
              message: 'user not found',
            });

          case 'P2002':
            throw new ConflictException({
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'email not available',
            });
        }
      }
      throw error;
    }
  }
  async remove(id: string) {
    try {
      await this.prisma.user.delete({
        where: { id },
        omit: { passwordHash: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'user not found',
        });

      throw error;
    }
  }
}
