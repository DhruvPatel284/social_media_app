import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { OAuthAccessToken } from './modules/oauth-access-token/oauth-access-token.entity';
import { User } from './modules/users/user.entity';
import { Post } from './modules/posts/post.entity';
import { PostMedia } from './modules/posts/post-media.entity';
import { Comment } from './modules/comments/comment.entity';
import { Notification } from './modules/notifications/notification.entity';
import { UserFollow } from './modules/follows/user-follow.entity';
import { Chat } from './modules/chats/chat.entity';
import { ChatMember } from './modules/chats/chat-member.entity';
import { ChatMessage } from './modules/chats/chat-message.entity';

// we can't access configService directly here because this file is loaded before the AppModule
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT as unknown as number,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  entities: [
    User,
    OAuthAccessToken,
    Post,
    PostMedia,
    Comment,
    Notification,
    UserFollow,
    Chat,
    ChatMember,
    ChatMessage,
  ],
  migrations: [__dirname + '/database/migrations/*.ts'],
  // ssl: {  // this ssl config is needed when connecting to some cloud db providers with https
  //   rejectUnauthorized: false,
  // },
  // logging: true,
  // logging: 'all', //for sql queries logging
});

