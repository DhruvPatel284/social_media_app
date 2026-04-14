import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Post } from '../posts/post.entity'
import { Comment } from '../comments/comment.entity';
import { OAuthAccessToken } from '../oauth-access-token/oauth-access-token.entity';
import { UserFollow } from '../follows/user-follow.entity';

export enum UserRole {
  User = 'user',
  Admin = 'admin',
}

@Entity()
export class User {
  /* ----------------------Structure---------------------- */

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: false }) 
  emailVerified: boolean;

  @Column({ nullable: true })
  verificationToken?: string;

  @Column({ type: 'datetime', nullable: true })
  verificationTokenExpiry?: Date;

  @Column({ nullable : true})
  phoneNumber?: string;

  @Column({ nullable: true })
  firebaseUid: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ type: 'varchar', default: UserRole.User })
  role: UserRole;

  @Column({ nullable: true })
  profile_image?: string;

  @Column({ nullable: true }) 
  bio: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  /* ----------------------Relationships---------------------- */

  @OneToMany(() => OAuthAccessToken, (accessToken) => accessToken.user)
  accessTokens: OAuthAccessToken[];

  @OneToMany(()=>Post,(post)=>post.user)
  posts:Post[];

  @OneToMany(()=>Comment,(comment)=>comment.user)
  comments:Comment[];

  @ManyToMany(()=>Post,(post)=>post.likedBy)
  @JoinTable({
    name: 'user_likes_post', 
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'post_id', referencedColumnName: 'id' },
  })
  likes:Post[];

  @OneToMany(() => UserFollow, f => f.follower)
  followingRelations: UserFollow[];

  @OneToMany(() => UserFollow, f => f.following)
  followerRelations: UserFollow[];

  // Virtual fields
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}
