import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

@Entity('oauth_access_tokens')
export class OAuthAccessToken {
  /* ----------------------Structure---------------------- */

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tokenId: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  /* ----------------------Relationships---------------------- */

  @ManyToOne(() => User, (user) => user.accessTokens, { onDelete: 'CASCADE' })
  user: User;
}
