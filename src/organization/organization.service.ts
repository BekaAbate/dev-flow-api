import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/create-organization.dto';
import { Prisma } from 'generated/prisma/client';
import cuid from 'cuid';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadedImage } from 'src/cloudinary/types';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  private readonly logger = new Logger(OrganizationService.name);

  async create(
    userId: string,
    dto: CreateOrganizationDto,
    logo?: Express.Multer.File,
  ) {
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
      const org = await this.prisma.organization.create({
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
      });
      return org;
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
    if (!org)
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
    return org;
  }
  async update(
    userId: string,
    name: string,
    dto: UpdateOrganizationDto,
    logo?: Express.Multer.File,
  ) {
    let uploadedImage: UploadedImage | undefined;
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
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
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

      const UpdatedOrg = await this.prisma.organization.update({
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
      });
      return UpdatedOrg;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'ORGANIZATION_ALREADY_EXISTS',
          message: `'${dto.name}' is not available`,
        });
      }
      throw error;
    }
  }
  async delete(userId: string, name: string) {
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
        throw new NotFoundException({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
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
