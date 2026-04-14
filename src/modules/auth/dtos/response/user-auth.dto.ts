import { Expose } from 'class-transformer';
import { UserDto } from 'src/modules/users/dtos/response/user.dto';

export class UserAuthDto extends UserDto {
  @Expose()
  accessToken: string;
}
