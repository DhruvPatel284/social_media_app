import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity'
import { Post } from '../posts/post.entity'
import { Comment } from '../comments/comment.entity';

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  FOLLOW_REQUEST = 'follow_request',
  FOLLOW_ACCEPT = 'follow_accept',
  FOLLOW_REJECT = 'follow_reject',
  GROUP_ADD = 'group_add',
  GROUP_REMOVE = 'group_remove',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  recipient: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  actor: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @ManyToOne(() => Post, { nullable: true, onDelete: 'CASCADE' })
  post?: Post;

  @ManyToOne(() => Comment, { nullable: true, onDelete: 'CASCADE' })
  comment?: Comment;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'json', nullable: true })
  meta?: any;

  @CreateDateColumn()
  createdAt: Date;
}
