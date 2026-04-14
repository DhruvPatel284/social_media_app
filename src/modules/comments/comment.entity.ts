import { User } from '../users/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Post } from '../posts/post.entity';

@Entity()
export class Comment{
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    comment: string

    @ManyToOne(() => User, (user) => user.comments)
    user:User

    @ManyToOne(() => Post, (post) => post.comments, {
      onDelete: 'CASCADE',
    })
    post: Post;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}