import { Module } from '@nestjs/common';
import { AdminDashboardController } from './controllers/web/admin-dashboard-web.controller';
import { AdminUsersController } from './controllers/web/admin-users-web.controller';
import { AdminPostsController } from './controllers/web/admin-posts-web-controller';
import { AdminService } from './admin.services';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { PostsModule } from '../posts/posts.module';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User,Post]),
    UsersModule,
    PostsModule,
    MailModule
  ],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminPostsController
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminPortalModule {}
