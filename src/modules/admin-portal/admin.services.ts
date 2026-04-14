import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
  ) {}

  async getAnalytics() {
    // Get total counts
    const totalUsers = await this.userRepo.count();
    const totalPosts = await this.postRepo.count();

    // Get reviewed vs unreviewed posts
    const reviewedPosts = await this.postRepo.count({
      where: { Reviewed: true },
    });
    const unreviewedPosts = totalPosts - reviewedPosts;

    return {
      totalUsers,
      totalPosts,
      reviewedPosts,
      unreviewedPosts,
    };
  }
}