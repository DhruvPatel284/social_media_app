import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { FollowsService } from './follows.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserFollow } from './user-follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User,UserFollow]),NotificationsModule],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}