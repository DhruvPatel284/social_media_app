import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginateQuery, Paginated, paginate } from 'nestjs-paginate';
import * as fs from 'fs';
import * as path from 'path';
import { Not, Like } from 'typeorm';
import { User } from './user.entity';
import { UserFollow, FollowStatus } from '../follows/user-follow.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async getUsersPaginate(query: PaginateQuery): Promise<Paginated<User>> {
    const results = await paginate(query, this.repo, {
      sortableColumns: [
        'id',
        'name',
        'email',
        'phoneNumber',
        'createdAt',
        'updatedAt',
      ],
      searchableColumns: [
        'name',
        'email',
        'phoneNumber',
        'id',
        'createdAt',
        'updatedAt',
      ],
      defaultSortBy: [['id', 'ASC']],
      defaultLimit: 10,
      maxLimit: 100,
      filterableColumns: {},
    });

    return results;
  }

  async findOneByEmail(email: string) {
    const user = await this.repo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async findOneOrCreateByFirebaseUid(firebaseUid: string) {
    let user = await this.repo.findOne({ where: { firebaseUid } });
    if (!user) {
      user = this.repo.create({ firebaseUid });
      await this.repo.save(user);
    }
    return user;
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async create(attributes: Partial<User>) {
    const user = this.repo.create(attributes);
    return this.repo.save(user);
  }

  async update(id: string, attributes: Partial<User>) {
    const user = await this.findOne(id);
    Object.assign(user, attributes);
    return this.repo.save(user);
  }

  async resetPassword(user: User, password: string) {
    Object.assign(user, { password });
    return this.repo.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    return this.repo.softRemove(user);
  }

  async findOneByVerificationToken(token) {
    if (!token) {
      throw new NotFoundException('Token Not Found');
    }
    return await this.repo.findOne({
      where: {
        verificationToken: token,
      },
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Profile Image Management
  // ────────────────────────────────────────────────────────────────────

  async updateProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<User> {
    const user = await this.findOne(userId);

    // Delete old profile image if exists
    if (user.profile_image) {
      this.deleteProfileImageFile(user.profile_image);
    }

    // Update with new image filename
    user.profile_image = file.filename;
    return this.repo.save(user);
  }

  async deleteProfileImage(userId: string): Promise<User> {
    const user = await this.findOne(userId);

    if (!user.profile_image) {
      throw new NotFoundException('No profile image to delete');
    }

    // Delete from filesystem
    this.deleteProfileImageFile(user.profile_image);

    // Remove from database
    user.profile_image = '';
    return this.repo.save(user);
  }

  private deleteProfileImageFile(filename: string): void {
    const filePath = path.join(
      process.cwd(),
      'public',
      'uploads',
      'users',
      filename,
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Follow System - Updated for Follow Requests
  // ────────────────────────────────────────────────────────────────────

  /**
   * Get list of users that a user is following (accepted only)
   */
  async getFollowing(userId: string): Promise<User[]> {
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    const follows = await userFollowRepo.find({
      where: {
        follower: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
      relations: ['following'],
    });

    return follows.map((f) => f.following);
  }

  /**
   * Get list of users that follow a user (accepted only)
   */
  async getFollowers(userId: string): Promise<User[]> {
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    const follows = await userFollowRepo.find({
      where: {
        following: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
      relations: ['follower'],
    });

    return follows.map((f) => f.follower);
  }

  /**
   * Check if user A follows user B (accepted only)
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    const follow = await userFollowRepo.findOne({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
        status: FollowStatus.ACCEPTED,
      },
    });

    return !!follow;
  }

  /**
   * Get user statistics (posts, followers, following counts) - accepted only
   */
  async getUserStats(userId: string) {
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    const user = await this.repo.findOne({
      where: { id: userId },
      relations: ['posts'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count accepted followers
    const followersCount = await userFollowRepo.count({
      where: {
        following: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
    });

    // Count accepted following
    const followingCount = await userFollowRepo.count({
      where: {
        follower: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
    });

    return {
      postsCount: user.posts?.length || 0,
      followersCount,
      followingCount,
    };
  }

  /**
   * Search users with follow status
   */
  async searchUsers(query: string, currentUserId: string, excludeUserId?: string) {
    const whereConditions: any = [
      { name: Like(`%${query}%`) },
      { email: Like(`%${query}%`) },
    ];

    // Exclude current user from search results
    if (excludeUserId) {
      whereConditions.forEach((condition: any) => {
        condition.id = Not(excludeUserId);
      });
    }

    const users = await this.repo.find({
      where: whereConditions,
      select: ['id', 'name', 'email', 'profile_image', 'createdAt'],
      take: 50,
      order: { name: 'ASC' },
    });

    // Get follow statuses for all users
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const follow = await userFollowRepo.findOne({
          where: {
            follower: { id: currentUserId },
            following: { id: user.id },
          },
        });

        return {
          ...user,
          followStatus: follow?.status || null,
        };
      }),
    );

    return enrichedUsers;
  }

  /**
   * Get suggested users (users not following yet)
   */
  async getSuggestedUsers(userId: string, limit: number = 10) {
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    // Get IDs of users already following or requested (accepted + pending)
    const existingFollows = await userFollowRepo.find({
      where: {
        follower: { id: userId },
        status: Not(FollowStatus.REJECTED),
      },
      relations: ['following'],
    });

    const followingIds = existingFollows.map((f) => f.following.id);
    followingIds.push(userId); // Also exclude self

    // Find users not in following list
    const queryBuilder = this.repo.createQueryBuilder('user');

    queryBuilder
      .where('user.id NOT IN (:...ids)', { ids: followingIds })
      .select(['user.id', 'user.name', 'user.email', 'user.profile_image'])
      .orderBy('user.createdAt', 'DESC')
      .limit(limit);

    const suggestedUsers = await queryBuilder.getMany();

    // Add follow status
    const enrichedUsers = await Promise.all(
      suggestedUsers.map(async (user) => {
        const follow = await userFollowRepo.findOne({
          where: {
            follower: { id: userId },
            following: { id: user.id },
          },
        });

        return {
          ...user,
          followStatus: follow?.status || null,
        };
      }),
    );

    return enrichedUsers;
  }

  /**
   * Get users with most followers (popular users)
   */
  async getPopularUsers(limit: number = 10) {
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    const users = await this.repo
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email', 'user.profile_image'])
      .getMany();

    // Count accepted followers for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const followerCount = await userFollowRepo.count({
          where: {
            following: { id: user.id },
            status: FollowStatus.ACCEPTED,
          },
        });

        return {
          ...user,
          followerCount,
        };
      }),
    );

    // Sort by follower count and limit
    return usersWithCounts
      .sort((a, b) => b.followerCount - a.followerCount)
      .slice(0, limit);
  }

  /**
   * Get user with all relations for profile page
   */
  async findOneForProfile(userId: string) {
    return await this.repo.findOne({
      where: { id: userId },
      relations: ['posts', 'posts.media'],
    });
  }

  /**
   * Get paginated followers (accepted only)
   */
  async getFollowersPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    // Get total count
    const totalFollowers = await userFollowRepo.count({
      where: {
        following: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
    });

    // Get paginated followers
    const follows = await userFollowRepo.find({
      where: {
        following: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
      relations: ['follower'],
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    const followers = follows.map((f) => f.follower);

    const totalPages = Math.ceil(totalFollowers / limit);

    return {
      followers,
      currentPage: page,
      totalPages,
      totalFollowers,
      hasMore: page < totalPages,
    };
  }

  /**
   * Get paginated following (accepted only)
   */
  async getFollowingPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const userFollowRepo = this.dataSource.getRepository(UserFollow);

    // Get total count
    const totalFollowing = await userFollowRepo.count({
      where: {
        follower: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
    });

    // Get paginated following
    const follows = await userFollowRepo.find({
      where: {
        follower: { id: userId },
        status: FollowStatus.ACCEPTED,
      },
      relations: ['following'],
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    const following = follows.map((f) => f.following);

    const totalPages = Math.ceil(totalFollowing / limit);

    return {
      following,
      currentPage: page,
      totalPages,
      totalFollowing,
      hasMore: page < totalPages,
    };
  }
}