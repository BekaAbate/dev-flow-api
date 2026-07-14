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
        },
      });

      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
    if (!user) throw new NotFoundException(`User with id '${id}' not found`);
    return user;
  }
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
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
        },
      });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2025':
            throw new NotFoundException('User not found');

          case 'P2002':
            throw new ConflictException('Email already exists');
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
        throw new NotFoundException('User not Found');

      throw error;
    }
  }
}
