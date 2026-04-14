import { Controller, Session, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private usersService: UsersService
  ) {}

  @Get('health-check')
  healthCheck(@Res() response: Response) {
    log.info('Health check endpoint called');
    return response.status(200).json('ok');
  }

  @Get()
  async getHello(@Session() session , @Res() res: Response) {
    if (!session.userId) {
      res.redirect('/login');
      return;
    }
    const user = await this.usersService.findOne(session.userId)
    res.redirect(user.role===UserRole.Admin ?'/admin/dashboard':'/user/dashboard');
  }
}
