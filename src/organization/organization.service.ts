import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/create-organization.dto';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    try {
      const org = await this.prisma.organization.create({
        data: {
          ...dto,
          memberships: {
            create: {
              role: 'OWNER',
              user: { connect: { id: userId } },
            },
          },
        },
      });
      return org;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Name is taken');
      throw error;
    }
  }
  async findAll(userId: string) {
    const orgs = await this.prisma.organization.findMany({
      where: {
        memberships: {
          some: {
            userId,
          },
        },
      },
    });
    return orgs;
  }
  async findOne(userId: string, name: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        name,
        memberships: {
          some: {
            userId,
          },
        },
      },
      include: {
        memberships: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
  async update(userId: string, name: string, dto: UpdateOrganizationDto) {
    try {
      const organization = await this.prisma.organization.findFirst({
        where: {
          name,
          memberships: {
            some: {
              userId,
              role: 'OWNER',
            },
          },
        },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      const UpdatedOrg = await this.prisma.organization.update({
        where: {
          id: organization.id,
        },
        data: dto,
      });
      return UpdatedOrg;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Name already taken');
      }
      throw error;
    }
  }
  async delete(userId: string, name: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        name,
        memberships: {
          some: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    await this.prisma.organization.delete({
      where: {
        id: organization.id,
      },
    });
  }
}
