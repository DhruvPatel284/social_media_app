import { IsString, IsEmail, IsPhoneNumber, IsOptional, Min, Max } from 'class-validator';
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsEmail()
  @IsOptional()
  email: string;

  @IsPhoneNumber()
  @IsOptional()
  phoneNumber: string;
}
