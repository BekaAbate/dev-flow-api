import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateUserDto) {
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
          createdAt: true,
          updatedAt: true,
        },
      });

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
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true, createdAt: true, updatedAt: true },
    });
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'user not found',
      });
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
  async update(id: string, dto: UpdateUserDto) {
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
          createdAt: true,
          updatedAt: true,
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
