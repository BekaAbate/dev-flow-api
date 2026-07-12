import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  //add more password validators
  @IsString()
  password: string;
}
