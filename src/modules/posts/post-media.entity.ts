import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Post } from './post.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity()
export class PostMedia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column({
    type: 'enum',
    enum: MediaType,
  })
  type: MediaType;

  @Column({ default: 0 })
  display_order: number;

  @ManyToOne(() => Post, (post) => post.media, {
    onDelete: 'CASCADE',
  })
  post: Post;

  @CreateDateColumn()
  createdAt: Date;
}