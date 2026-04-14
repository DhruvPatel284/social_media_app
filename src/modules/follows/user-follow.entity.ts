import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum FollowStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('user_follows')
@Index(['follower', 'following'], { unique: true })
export class UserFollow {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.followingRelations, {
    onDelete: 'CASCADE',
  })
  follower: User; // Who is following

  @ManyToOne(() => User, (user) => user.followerRelations, {
    onDelete: 'CASCADE',
  })
  following: User; // Who is being followed

  @Column({
    type: 'enum',
    enum: FollowStatus,
    default: FollowStatus.PENDING,
  })
  status: FollowStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  acceptedAt: Date;
}