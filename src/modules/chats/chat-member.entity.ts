import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Chat } from './chat.entity';
import { User } from '../users/user.entity';

@Entity('chat_members')
@Unique(['chat', 'user'])
export class ChatMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt: Date | null;
}

