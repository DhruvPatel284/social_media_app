import { Get, Controller, UseGuards, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { PostsService } from 'src/modules/posts/posts.service';
import { UsersService } from 'src/modules/users/users.service';
import { In } from 'typeorm';

@Controller('user/dashboard')
export class UserDashboardController {
  constructor(
    private postsService: PostsService,
    private usersService: UsersService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async getHomePage(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if(!userId){
        return null;
      }

      // 1. Get current user with following list
      const currentUser = await this.usersService.findOne(userId);

      if (!currentUser) {
        return res.redirect('/login');
      }

      // 2. Get IDs of users the current user follows
      const following = await this.usersService.getFollowing(userId);
      const followingIds = following.map((user) => user.id);

      // 3. Get initial feed posts (paginated - first 10 posts)
      const feedResult = await this.postsService.getFeedPaginated(
        userId,
        followingIds,
        1, // page
        10, // limit
      );

      // 4. Get statistics for user
      const stats = await this.usersService.getUserStats(userId);

      return res.render('pages/user/index', {
        layout: 'layouts/user-layout',
        title: 'Home',
        page_title: 'Home',
        folder: 'Dashboard',
        user: currentUser,
        posts: feedResult.posts,
        stats: stats,
        hasMore: feedResult.hasMore,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      req.flash('errors', 'Failed to load dashboard');
      return res.redirect('/login');
    }
  }
}