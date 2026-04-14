import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserDto } from 'src/modules/users/dtos/response/user.dto';

import { AccessTokenPayload } from '../../../common/interfaces/access-token.interface';
import { OauthAccessTokenService } from '../../oauth-access-token/oauth-access-token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'my-jwt') {
  constructor(
    private accessTokenService: OauthAccessTokenService,
    private configService: ConfigService,
  ) {
    const publicKey = configService
      .get<string>('JWT_PUBLIC_KEY')
      ?.replace(/\\n/g, '\n') as string;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: AccessTokenPayload) {
    const token = await this.accessTokenService.getUserToken(payload);

    if (!token || token.revoked) {
      throw new UnauthorizedException('Token has been revoked');
    }
    const user = token.user;

    return plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
