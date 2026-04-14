import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { AccessTokenPayload } from 'src/common/interfaces/access-token.interface';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { CreateAccessTokenDto } from './dtos/request/create-access-token.dto';
import { OAuthAccessToken } from './oauth-access-token.entity';

@Injectable()
export class OauthAccessTokenService {
  constructor(
    @InjectRepository(OAuthAccessToken)
    private readonly oauthAccessTokenRepository: Repository<OAuthAccessToken>,
    private configService: ConfigService,

    private jwtService: JwtService,
  ) {}

  async getUserToken(
    payload: AccessTokenPayload,
  ): Promise<OAuthAccessToken | null> {
    return await this.oauthAccessTokenRepository.findOne({
      where: {
        user: { id: payload.sub },
        revoked: false,
        tokenId: payload.tokenId,
      },
      relations: ['user'],
    });
  }

  async createAccessToken(
    createAccessTokenDto: CreateAccessTokenDto,
  ): Promise<OAuthAccessToken> {
    const accessToken =
      this.oauthAccessTokenRepository.create(createAccessTokenDto);
    return this.oauthAccessTokenRepository.save(accessToken);
  }

  async revokeAccessToken(token: string): Promise<void> {
    const payload: AccessTokenPayload = this.jwtService.decode(token);

    const oauthAccessToken = await this.oauthAccessTokenRepository.findOne({
      where: { user: { id: payload.sub }, tokenId: payload.tokenId },
    });
    if (!oauthAccessToken) {
      throw new NotFoundException('Access token not found');
    }
    Object.assign(oauthAccessToken, { revoked: true, revokedAt: new Date() });
    await this.oauthAccessTokenRepository.save(oauthAccessToken);
  }

  async generateJwtToken(user: User): Promise<string> {
    const tokenId = randomUUID();
    const expireTime = parseInt(
      this.configService.get('passport.signOptions.expiresIn').replace('d', ''),
      10,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expireTime);

    await this.createAccessToken({
      tokenId,
      user,
      expiresAt,
    });
    const payload: AccessTokenPayload = {
      sub: user.id,
      tokenId,
    };
    const token = await this.jwtService.signAsync(payload, {});

    return token;
  }
}
