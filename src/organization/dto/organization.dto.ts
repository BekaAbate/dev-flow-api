import { IsOptional, IsString, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Role } from 'generated/prisma/enums';

//for client requests
//
export class CreateOrganizationDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;
}
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}

//responses to client
//
export class OrganizationResponseDto {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  logoPublicId: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
