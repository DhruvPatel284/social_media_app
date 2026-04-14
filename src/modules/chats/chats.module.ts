import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Chat } from './chat.entity';
import { ChatMember } from './chat-member.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatGateway } from './chat.gateway';
import { ChatsService } from './chats.service';
import { User } from '../users/user.entity';
import { FollowsModule } from '../follows/follows.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatMember, ChatMessage, User]), FollowsModule, NotificationsModule],
  providers: [ChatsService, ChatGateway],
  exports: [ChatsService, ChatGateway],
})
export class ChatsModule { }


