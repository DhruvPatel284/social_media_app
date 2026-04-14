import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { CommentsModule } from '../comments/comments.module';
import { User } from '../users/user.entity';
import { Comment } from '../comments/comment.entity';
import { Post } from '../posts/post.entity';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification,User,Post,Comment]),   
          
  ],
  controllers: [],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {
    
}
