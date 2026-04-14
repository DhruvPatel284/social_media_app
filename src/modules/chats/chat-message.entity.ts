import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Chat } from './chat.entity';
import { User } from '../users/user.entity';

export enum ChatMessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  chat: Chat;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  sender: User | null;

  @Column({
    type: 'enum',
    enum: ChatMessageType,
    default: ChatMessageType.TEXT,
  })
  messageType: ChatMessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

