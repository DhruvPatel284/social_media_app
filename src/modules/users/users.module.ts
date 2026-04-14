import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersWebController } from './controllers/web/user-web.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    MailModule,          // provides MailService
  ],
  controllers: [UsersWebController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}