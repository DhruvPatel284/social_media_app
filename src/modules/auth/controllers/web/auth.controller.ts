import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../../../common/guards/auth.guard';
import { User } from '../../../users/user.entity';
import { AuthService } from '../../auth.service';

@Controller('auth')
export class AuthWebController {
  constructor(private authService: AuthService) {}
}
