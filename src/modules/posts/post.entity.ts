import { User } from '../users/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Comment } from '../comments/comment.entity';
import { PostMedia } from './post-media.entity';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column({ default: true })
  Reviewed: boolean;

  @ManyToOne(() => User, (user) => user.posts)
  user: User;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @ManyToMany(() => User, (user) => user.likes)
  likedBy: User[];

  @OneToMany(() => PostMedia, (media) => media.post, {
    cascade: true,
  })
  media: PostMedia[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  commentCount?: number;
  likeCount?: number;
  isLikedByCurrentUser?: boolean;
  
  // Helper getters for filtering media by type
  get images(): PostMedia[] {
    return this.media?.filter(m => m.type === 'image') || [];
  }
  
  get videos(): PostMedia[] {
    return this.media?.filter(m => m.type === 'video') || [];
  }
}