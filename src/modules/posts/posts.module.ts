import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Post } from './post.entity';
import { PostMedia } from './post-media.entity';
import { PostsService } from './posts.service';
import { PostsWebController } from './controllers/web/posts.web.controller';
import { User } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostMedia,User]),NotificationsModule],
  controllers: [PostsWebController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}