import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NestLensModule } from 'nestlens';

import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { RequestIdMiddleware } from 'src/common/middlewares/request-id.middleware';
import { ViewLocalsMiddleware } from 'src/common/middlewares/view-locals.middleware';

import databaseConfig from '../../common/config/database.config';
import passportConfig from '../../common/config/passport.config';
import { AppDataSource } from '../../data-source';
import { AuthModule } from '../auth/auth.module';
import { OauthAccessTokenModule } from '../oauth-access-token/oauth-access-token.module';
import { UsersModule } from '../users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from '../posts/posts.module';
import { Post } from '../posts/post.entity';
import { User } from '../users/user.entity';
import { CurrentPathMiddleware } from 'src/common/middlewares/current-path.middleware';
import { MailModule } from '../mail/mail.module';
import { UserPortalModule } from '../user-portal/user-portal.module';
import { AdminPortalModule } from '../admin-portal/admin-portal.module';
import { FollowsModule } from '../follows/follows.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommentsModule } from '../comments/comments.module';

@Module({
  imports: [
    NestLensModule.forRoot({
      enabled: process.env.NODE_ENV != 'production',
      storage: { driver: 'memory' }, // default
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, passportConfig],
    }),
    TypeOrmModule.forRoot(AppDataSource.options),
    TypeOrmModule.forFeature([User, Post]),
    AuthModule,
    OauthAccessTokenModule,
    UsersModule,
    PostsModule,
    MailModule,
    UserPortalModule,
    AdminPortalModule,
    FollowsModule,
    NotificationsModule,
    CommentsModule, 
    // LikesModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    AppService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ViewLocalsMiddleware)
      .exclude('/api/*path', '/assets/*path')
      .forRoutes('*');

    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer.apply(CurrentPathMiddleware).forRoutes('*');
  }
}
