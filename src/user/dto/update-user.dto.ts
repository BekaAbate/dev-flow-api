import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsEmail()
  email: string;

  //add more password validators
  @IsOptional()
  @IsString()
  password: string;
}
