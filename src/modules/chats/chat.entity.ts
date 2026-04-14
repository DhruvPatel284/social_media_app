import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../users/user.entity';
import { ChatMember } from './chat-member.entity';
import { ChatMessage } from './chat-message.entity';

export type ChatType = 'direct' | 'group';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['direct', 'group'],
    default: 'direct',
  })
  type: ChatType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  creator: User | null;

  @OneToMany(() => ChatMember, (member) => member.chat)
  members: ChatMember[];

  @OneToMany(() => ChatMessage, (message) => message.chat)
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
