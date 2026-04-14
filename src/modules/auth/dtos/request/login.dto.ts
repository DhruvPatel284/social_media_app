import { IsJWT } from 'class-validator';

export class LoginDto {
  @IsJWT()
  firebaseToken: string;
}
