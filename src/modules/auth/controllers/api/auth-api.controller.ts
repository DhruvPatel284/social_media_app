import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/passport-jwt.guard';
import { Serialize } from 'src/common/interceptors/serialize.interceptor';
import { ResponseUtil } from 'src/common/utils/response.util';

import { AuthService } from '../../auth.service';
import { LoginDto } from '../../dtos/request/login.dto';
import { UserAuthDto } from '../../dtos/response/user-auth.dto';

@Controller('api/auth')
export class AuthApiController {
  constructor(private authService: AuthService) {}

  // This Route is for both, Register & Login
  @Post('login')
  @Serialize(UserAuthDto)
  async login(@Body() body: LoginDto) {
    const user = await this.authService.login(body);
    return ResponseUtil.success(user, 'User Successfully Login', 200);
  }

  // Logout Route
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: Request) {
    await this.authService.logout(request.headers); // mark in DB/Redis

    return ResponseUtil.success(null, 'User Successfully Logout', 200);
  }
}
