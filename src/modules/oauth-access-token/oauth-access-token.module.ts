import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';

import { OAuthAccessToken } from './oauth-access-token.entity';
import { OauthAccessTokenService } from './oauth-access-token.service';

@Module({
  providers: [OauthAccessTokenService],
  exports: [OauthAccessTokenService],
  imports: [
    TypeOrmModule.forFeature([OAuthAccessToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        privateKey: configService
          .get<string>('passport.publicKey')
          ?.replace(/\\n/g, '\n'),
        publicKey: configService
          .get<string>('passport.publicKey')
          ?.replace(/\\n/g, '\n'),
        signOptions: {
          expiresIn: configService.get<StringValue>(
            'passport.signOptions.expiresIn',
            '180d',
          ),
          algorithm: 'RS256',
        },
      }),
    }),
  ],
})
export class OauthAccessTokenModule {}
