import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOrganizationDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { Prisma } from 'generated/prisma/client';
import cuid from 'cuid';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadedImage } from 'src/cloudinary/types';
import { RedisService } from 'src/infrastructure/redis/redis.service';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private redis: RedisService,
  ) {}

  private readonly logger = new Logger(OrganizationService.name);

  async create(
    userId: string,
    dto: CreateOrganizationDto,
    logo?: Express.Multer.File,
  ): Promise<OrganizationResponseDto> {
    const key = `user:${userId}:organizations`;
    const id = cuid();
    let uploadedImage: UploadedImage | undefined;

    try {
      if (logo) {
        try {
          uploadedImage = await this.cloudinary.upload(logo, {
            folder: `organizations/${id}`,
            publicId: 'logo',
          });
        } catch (error) {
          throw new InternalServerErrorException(
            {
              code: 'IMAGE_UPLOAD_FAILED',
              message: 'Unable to upload organization logo',
            },
            {
              cause: error,
            },
          );
        }
      }
      const organization = await this.prisma.organization.create({
        data: {
          ...dto,
          id,
          logoUrl: uploadedImage?.url,
          logoPublicId: uploadedImage?.publicId,
          memberships: {
            create: {
              role: 'OWNER',
              user: { connect: { id: userId } },
            },
          },
        },
        include: {
          memberships: {
            select: {
              role: true,
            },
          },
        },
      });

      const { memberships, ...organizationData } = organization;
      const organizationResponse = {
        ...organizationData,
        role: memberships[0].role,
      };

      try {
        await this.redis.delete(key);
      } catch (error) {
        this.logger.error(
          'CLEANUP_ERROR:',
          'Failed to invalidate organizations cache',
          error,
        );
      }
      return organizationResponse;
    } catch (error) {
      if (uploadedImage) {
        await this.cloudinary.delete(uploadedImage.publicId);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException({
          code: 'ORGANIZATION_ALREADY_EXISTS',
          message: `'${dto.name}' is not available`,
        });
      throw error;
    }
  }
  async findAll(userId: string): Promise<OrganizationResponseDto[]> {
    const key = `user:${userId}:organizations`;
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached) as OrganizationResponseDto[];
    } catch (error) {
      this.logger.error('Failed to get organizations from redis', error);
    }
    const organizations = await this.prisma.organization.findMany({
      where: {
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
    const organizationsResponse = organizations.map((organization) => {
      const { memberships, ...organizationData } = organization;
      return {
        ...organizationData,
        role: memberships[0].role,
      };
    });
    try {
      await this.redis.set(key, JSON.stringify(organizationsResponse), {
        type: 'EX',
        value: 300,
      });
    } catch (error) {
      this.logger.error('Failed to set organizations to redis', error);
    }
    return organizationsResponse;
  }
  async findOne(
    userId: string,
    name: string,
  ): Promise<OrganizationResponseDto | null> {
    const key = `user:${userId}:organization:${name}`;
    let cached: string | null = null;

    try {
      cached = await this.redis.get(key);
    } catch (error) {
      this.logger.error('Failed to get organization from redis', error);
    }

    if (cached) {
      if (cached === 'NOT_FOUND') {
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        });
      }
      return JSON.parse(cached) as OrganizationResponseDto;
    }
    const organization = await this.prisma.organization.findFirst({
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
    if (!organization) {
      try {
        await this.redis.set(key, 'NOT_FOUND', {
          type: 'EX',
          value: 60,
        });
      } catch (error) {
        this.logger.error('Failed to set organizations to redis', error);
      }
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const { memberships, ...organizationData } = organization;
    const organizationResponse = {
      ...organizationData,
      role: memberships[0].role,
    };

    try {
      await this.redis.set(key, JSON.stringify(organizationResponse), {
        type: 'EX',
        value: 300,
      });
    } catch (error) {
      this.logger.error('Failed to set organizations to redis', error);
    }
    return organizationResponse;
  }
  async update(
    userId: string,
    name: string,
    dto: UpdateOrganizationDto,
    logo?: Express.Multer.File,
  ): Promise<OrganizationResponseDto> {
    const key = `user:${userId}:organization:${name}`;
    let uploadedImage: UploadedImage | undefined;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(key);
    } catch (error) {
      this.logger.error('Failed to get organization from redis', error);
    }

    if (cached) {
      if (cached === 'NOT_FOUND') {
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        });
      }
    }

    try {
      const organization = await this.prisma.organization.findFirst({
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
            select: {
              role: true,
            },
          },
        },
      });

      if (!organization) {
        try {
          await this.redis.set(key, 'NOT_FOUND', {
            type: 'EX',
            value: 60,
          });
        } catch (error) {
          this.logger.error('Failed to set organization to redis', error);
        }
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        });
      }
      const userRole = organization.memberships[0].role;

      if (userRole !== 'OWNER') {
        throw new ForbiddenException({
          code: 'ORGANIZATION_OWNER_REQUIRED',
          message: "you don't have sufficient permissions for this action",
        });
      }
      if (logo) {
        try {
          uploadedImage = await this.cloudinary.upload(logo, {
            folder: `organizations/${organization.id}`,
            publicId: 'logo',
          });
        } catch (error) {
          throw new InternalServerErrorException(
            {
              code: 'IMAGE_UPLOAD_FAILED',
              message: 'Unable to upload organization logo',
            },
            {
              cause: error,
            },
          );
        }
      }

      const UpdatedOrganization = await this.prisma.organization.update({
        where: {
          id: organization.id,
        },
        data: {
          ...dto,
          ...(uploadedImage && {
            logoUrl: uploadedImage.url,
            logoPublicId: uploadedImage.publicId,
          }),
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

      const { memberships, ...organizationData } = UpdatedOrganization;
      const organizationResponse = {
        ...organizationData,
        role: memberships[0].role,
      };

      try {
        await this.redis.delete(key);
      } catch (error) {
        this.logger.error(
          'CLEANUP_ERROR:',
          'Failed to invalidate organization cache',
          error,
        );
      }
      return organizationResponse;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            throw new ConflictException({
              code: 'ORGANIZATION_ALREADY_EXISTS',
              message: `'${dto.name}' is not available`,
            });
          case 'P2025':
            try {
              await this.redis.set(key, 'NOT_FOUND', {
                type: 'EX',
                value: 60,
              });
            } catch (error) {
              this.logger.error('Failed to set organizations to redis', error);
            }
            throw new NotFoundException({
              code: 'ORGANIZATION_NOT_FOUND',
              message: 'Organization not found',
            });
        }
      }
      throw error;
    }
  }
  async delete(userId: string, name: string) {
    const key = `user:${userId}:organization:${name}`;
    let cached: string | null = null;
    try {
      cached = await this.redis.get(key);
    } catch (error) {
      this.logger.error('Failed to get organization from redis', error);
    }

    if (cached) {
      if (cached === 'NOT_FOUND') {
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        });
      }
    }

    try {
      const organization = await this.prisma.organization.findFirst({
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
            select: {
              role: true,
            },
          },
        },
      });
      if (!organization) {
        try {
          await this.redis.set(key, 'NOT_FOUND', {
            type: 'EX',
            value: 60,
          });
        } catch (error) {
          this.logger.error('Failed to set organization to redis', error);
        }
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        });
      }
      const userRole = organization.memberships[0].role;

      if (userRole !== 'OWNER') {
        throw new ForbiddenException({
          code: 'ORGANIZATION_OWNER_REQUIRED',
          message: "you don't have sufficient permissions for this action",
        });
      }

      await this.prisma.organization.delete({
        where: {
          id: organization.id,
        },
      });
      if (organization.logoPublicId) {
        try {
          await this.cloudinary.delete(organization.logoPublicId);
        } catch (error) {
          this.logger.error(
            'CLEANUP_ERROR:',
            `failed to delete organization logo for ${organization.id}:`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      try {
        await this.redis.delete(key);
      } catch (error) {
        this.logger.error(
          'CLEANUP_ERROR:',
          'Failed to invalidate organization cache',
          error,
        );
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        });
      }
      throw error;
    }
  }
}
