import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserFollow, FollowStatus } from './user-follow.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserFollow)
    private userFollowRepo: Repository<UserFollow>,
  ) {}

  /**
   * Send follow request
   */
  async sendFollowRequest(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const follower = await this.userRepo.findOne({
      where: { id: followerId },
    });

    const following = await this.userRepo.findOne({
      where: { id: followingId },
    });

    if (!follower || !following) {
      throw new BadRequestException('User not found');
    }

    // Check if follow relationship already exists
    const existing = await this.userFollowRepo.findOne({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
      },
    });

    if (existing) {
      if (existing.status === FollowStatus.PENDING) {
        throw new BadRequestException('Follow request already sent');
      }
      if (existing.status === FollowStatus.ACCEPTED) {
        throw new BadRequestException('You are already following this user');
      }
      // If rejected, allow sending new request
      existing.status = FollowStatus.PENDING;
      existing.createdAt = new Date();
      return await this.userFollowRepo.save(existing);
    }

    // Create new follow request
    const followRequest = this.userFollowRepo.create({
      follower,
      following,
      status: FollowStatus.PENDING,
    });

    return await this.userFollowRepo.save(followRequest);
  }

  /**
   * Accept follow request
   */
  async acceptFollowRequest(followId: number, userId: string) {
    const follow = await this.userFollowRepo.findOne({
      where: { id: followId },
      relations: ['follower', 'following'],
    });

    if (!follow) {
      throw new NotFoundException('Follow request not found');
    }

    // Verify user is the recipient
    if (follow.following.id !== userId) {
      throw new BadRequestException('You can only accept requests sent to you');
    }

    if (follow.status === FollowStatus.ACCEPTED) {
      throw new BadRequestException('Request already accepted');
    }

    follow.status = FollowStatus.ACCEPTED;
    follow.acceptedAt = new Date();

    return await this.userFollowRepo.save(follow);
  }

  /**
   * Reject follow request
   */
  async rejectFollowRequest(followId: number, userId: string) {
    const follow = await this.userFollowRepo.findOne({
      where: { id: followId },
      relations: ['follower', 'following'],
    });

    if (!follow) {
      throw new NotFoundException('Follow request not found');
    }

    // Verify user is the recipient
    if (follow.following.id !== userId) {
      throw new BadRequestException('You can only reject requests sent to you');
    }

    follow.status = FollowStatus.REJECTED;
    await this.userFollowRepo.save(follow);
    
    return follow;
  }

  /**
   * Unfollow / Cancel request
   */
  async unfollow(followerId: string, followingId: string) {
    const follow = await this.userFollowRepo.findOne({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
      },
    });

    if (!follow) {
      throw new BadRequestException('Follow relationship not found');
    }

    await this.userFollowRepo.remove(follow);

    return {
      success: true,
      message: 'Unfollowed successfully',
    };
  }

  /**
   * Remove a follower (owner removes someone who follows them)
   */
  async removeFollower(ownerId: string, followerIdToRemove: string) {
    const follow = await this.userFollowRepo.findOne({
      where: {
        follower: { id: followerIdToRemove },
        following: { id: ownerId },
      },
    });

    if (!follow) {
      throw new BadRequestException('Follow relationship not found');
    }

    await this.userFollowRepo.remove(follow);

    return {
      success: true,
      message: 'Follower removed successfully',
    };
  }

  /**
   * Check if user is following another user (accepted only)
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.userFollowRepo.findOne({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
        status: FollowStatus.ACCEPTED,
      },
    });

    return !!follow;
  }

  /**
   * Get follow status between two users
   */
  async getFollowStatus(
    followerId: string,
    followingId: string,
  ): Promise<FollowStatus | null> {
    const follow = await this.userFollowRepo.findOne({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
      },
    });

    return follow?.status || null;
  }

  /**
   * Get pending requests (incoming)
   */
  async getPendingRequests(userId: string) {
    const follows = await this.userFollowRepo.find({
      where: {
        following: { id: userId },
        status: FollowStatus.PENDING,
      },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
    });

    return follows.map((f) => ({
      id: f.id,
      user: f.follower,
      createdAt: f.createdAt,
    }));
  }

  /**
   * Get sent requests (outgoing)
   */
  async getSentRequests(userId: string) {
    const follows = await this.userFollowRepo.find({
      where: {
        follower: { id: userId },
        status: FollowStatus.PENDING,
      },
      relations: ['following'],
      order: { createdAt: 'DESC' },
    });

    return follows.map((f) => ({
      id: f.id,
      user: f.following,
      createdAt: f.createdAt,
    }));
  }

  /**
   * Get followers (accepted only)
   */
  async getFollowers(userId: string): Promise<User[]> {
    const follows = await this.userFollowRepo.find({
      where: {
        following: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
      relations: ['follower'],
    });

    return follows.map((f) => f.follower);
  }

  /**
   * Get following (accepted only)
   */
  async getFollowing(userId: string): Promise<User[]> {
    const follows = await this.userFollowRepo.find({
      where: {
        follower: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
      relations: ['following'],
    });

    return follows.map((f) => f.following);
  }

  /**
   * Get pending requests count
   */
  async getPendingRequestsCount(userId: string): Promise<number> {
    return await this.userFollowRepo.count({
      where: {
        following: { id: userId },
        status: FollowStatus.PENDING,
      },
    });
  }
}