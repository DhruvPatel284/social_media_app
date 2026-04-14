import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { Post } from '../posts/post.entity';
import { User } from '../users/user.entity';
import { CommentsService } from './comments.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Post, User]),NotificationsModule],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}