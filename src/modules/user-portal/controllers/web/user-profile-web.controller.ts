import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { UsersService } from 'src/modules/users/users.service';
import { PostsService } from 'src/modules/posts/posts.service';
import { FollowsService } from 'src/modules/follows/follows.service';
import { userProfileImageConfig } from 'src/modules/users/config/multer.config';

@Controller('user/profile')
@UseGuards(AuthGuard)
export class UserProfileController {
  constructor(
    private usersService: UsersService,
    private postsService: PostsService,
    private followsService: FollowsService,
  ) { }

  // ─── OWN PROFILE (EDITABLE) ──────────────────────────────────────────────────
  @Get()
  async getOwnProfile(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return null;
      }
      const currentUser = await this.usersService.findOne(userId);

      if (!currentUser) {
        return res.redirect('/login');
      }

      // Get user's posts
      const posts = await this.postsService.getPostsByUser(userId);

      // Get stats
      const stats = await this.usersService.getUserStats(userId);

      return res.render('pages/user/profile/own', {
        layout: 'layouts/user-layout',
        title: 'My Profile',
        page_title: 'My Profile',
        folder: 'Profile',
        user: currentUser,
        profileUser: currentUser,
        posts: posts,
        stats: stats,
        isOwnProfile: true,
        unreadCount: 0,
        success: req.flash('success')[0] || null,
        error: req.flash('error')[0] || null,
        errors: req.flash('errors')[0] || {},
      });
    } catch (error) {
      console.error('Own profile error:', error);
      req.flash('error', 'Failed to load profile');
      return res.redirect('/user/dashboard');
    }
  }

  // ─── OTHER USER PROFILE (READ-ONLY) ──────────────────────────────────────────
  @Get(':id')
  async getUserProfile(
    @Param('id') targetUserId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const currentUserId = req.session?.userId;
      if (!currentUserId) {
        return null;
      }
      // If viewing own profile, redirect to /user/profile
      if (targetUserId === currentUserId) {
        return res.redirect('/user/profile');
      }

      const currentUser = await this.usersService.findOne(currentUserId);
      const targetUser = await this.usersService.findOne(targetUserId);

      if (!targetUser) {
        req.flash('error', 'User not found');
        return res.redirect('/user/search');
      }

      // Get follow status
      const followStatus = await this.followsService.getFollowStatus(
        currentUserId,
        targetUserId,
      );

      // Check if following (accepted only)
      const isFollowing = followStatus === 'accepted';

      // Can chat if there is an accepted follow in either direction
      const isFollower = await this.followsService.isFollowing(
        targetUserId,
        currentUserId,
      );
      const canChat = isFollowing || isFollower;

      // Get posts (only if following)
      let posts: any = [];
      if (isFollowing) {
        posts = await this.postsService.getPostsByUser(targetUserId);
      }

      // Get stats
      const stats = await this.usersService.getUserStats(targetUserId);

      return res.render('pages/user/profile/other', {
        layout: 'layouts/user-layout',
        title: targetUser.name,
        page_title: targetUser.name,
        folder: 'Profile',
        user: currentUser,
        profileUser: targetUser,
        posts: posts,
        stats: stats,
        isOwnProfile: false,
        isFollowing: isFollowing,
        followStatus: followStatus, // NEW: pending/accepted/rejected/null
        canChat: canChat,
        unreadCount: 0,
      });
    } catch (error) {
      console.error('User profile error:', error);
      req.flash('error', 'Failed to load profile');
      return res.redirect('/user/search');
    }
  }

  // ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
  @Put()
  async updateProfile(
    @Body() body: { name: string; email: string; bio: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      console.log("Hi ----")
      const userId = req.session?.userId;
      if (!userId) {
        return null;
      }
      // Validate
      const errors: Record<string, string[]> = {};
      if (!body.name || body.name.trim() === '') {
        errors.name = ['Name is required'];
      }
      if (!body.email || body.email.trim() === '') {
        errors.email = ['Email is required'];
      }

      if (Object.keys(errors).length > 0) {
        req.flash('errors', errors);
        return res.redirect('/user/profile');
      }

      // Update
      await this.usersService.update(userId, {
        name: body.name.trim(),
        email: body.email.trim(),
        bio: body.bio ? body.bio.trim() : '',
      });

      req.flash('success', 'Profile updated successfully');
      return res.redirect('/user/profile');
    } catch (error) {
      console.error('Update profile error:', error);
      req.flash('error', 'Failed to update profile');
      return res.redirect('/user/profile');
    }
  }

  // ─── UPLOAD PROFILE IMAGE ────────────────────────────────────────────────────
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('profile_image', userProfileImageConfig))
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log("hi -------")
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return null;
      }

      if (!file) {
        req.flash('error', 'No file uploaded');
        return res.redirect('/user/profile');
      }

      await this.usersService.updateProfileImage(userId, file);

      req.flash('success', 'Profile image updated successfully');
      return res.redirect('/user/profile');
    } catch (error) {
      console.error('Upload image error:', error);
      req.flash(
        'error',
        error instanceof BadRequestException
          ? error.message
          : 'Failed to upload image',
      );
      return res.redirect('/user/profile');
    }
  }

  // ─── DELETE PROFILE IMAGE ────────────────────────────────────────────────────
  @Post('delete-image')
  async deleteProfileImage(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return null;
      }
      await this.usersService.deleteProfileImage(userId);

      req.flash('success', 'Profile image deleted successfully');
      return res.redirect('/user/profile');
    } catch (error) {
      console.error('Delete image error:', error);
      req.flash('error', 'Failed to delete image');
      return res.redirect('/user/profile');
    }
  }

  // ─── GET FOLLOWERS LIST ──────────────────────────────────────────────────────
  @Get('followers/:id')
  async getFollowersList(
    @Param('id') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const followers = await this.usersService.getFollowers(userId);
      return res.json({ success: true, followers });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to get followers' });
    }
  }

  // ─── GET FOLLOWING LIST ──────────────────────────────────────────────────────
  @Get('following/:id')
  async getFollowingList(
    @Param('id') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const following = await this.usersService.getFollowing(userId);
      return res.json({ success: true, following });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to get following' });
    }
  }

  @Get(':id/followers')
  async getFollowersPage(
    @Param('id') targetUserId: string,
    @Query('page') page: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const currentUserId = req.session?.userId;
      if (!currentUserId) {
        return res.redirect('/login');
      }

      const currentUser = await this.usersService.findOne(currentUserId);
      const targetUser = await this.usersService.findOne(targetUserId);

      if (!targetUser) {
        req.flash('error', 'User not found');
        return res.redirect('/user/search');
      }

      const pageNumber = parseInt(page) || 1;
      const limit = 20;

      // Get paginated followers
      const result = await this.usersService.getFollowersPaginated(
        targetUserId,
        pageNumber,
        limit,
      );

      return res.render('pages/user/profile/followers', {
        layout: 'layouts/user-layout',
        title: `${targetUser.name}'s Followers`,
        page_title: 'Followers',
        folder: 'Profile',
        user: currentUser,
        profileUser: targetUser,
        followers: result.followers,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalFollowers: result.totalFollowers,
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Followers page error:', error);
      req.flash('error', 'Failed to load followers');
      return res.redirect('/user/dashboard');
    }
  }

  // ─── FOLLOWING PAGE ──────────────────────────────────────────────────────────
  @Get(':id/following')
  async getFollowingPage(
    @Param('id') targetUserId: string,
    @Query('page') page: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const currentUserId = req.session?.userId;
      if (!currentUserId) {
        return res.redirect('/login');
      }

      const currentUser = await this.usersService.findOne(currentUserId);
      const targetUser = await this.usersService.findOne(targetUserId);

      if (!targetUser) {
        req.flash('error', 'User not found');
        return res.redirect('/user/search');
      }

      const pageNumber = parseInt(page) || 1;
      const limit = 20;

      // Get paginated following
      const result = await this.usersService.getFollowingPaginated(
        targetUserId,
        pageNumber,
        limit,
      );

      return res.render('pages/user/profile/following', {
        layout: 'layouts/user-layout',
        title: `${targetUser.name}'s Following`,
        page_title: 'Following',
        folder: 'Profile',
        user: currentUser,
        profileUser: targetUser,
        following: result.following,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalFollowing: result.totalFollowing,
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Following page error:', error);
      req.flash('error', 'Failed to load following');
      return res.redirect('/user/dashboard');
    }
  }

  // ─── OWN FOLLOWERS PAGE (convenience route) ─────────────────────────────────
  @Get('followers')
  async getOwnFollowersPage(@Req() req: Request, @Res() res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/login');
    }
    return res.redirect(`/user/profile/${userId}/followers`);
  }

  // ─── OWN FOLLOWING PAGE (convenience route) ─────────────────────────────────
  @Get('following')
  async getOwnFollowingPage(@Req() req: Request, @Res() res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/login');
    }
    return res.redirect(`/user/profile/${userId}/following`);
  }

  // ─── REMOVE A FOLLOWER ───────────────────────────────────────────────────────
  @Delete(':id/remove-follower')
  async removeFollower(
    @Param('id') followerUserId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const currentUserId = req.session?.userId;
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      await this.followsService.removeFollower(currentUserId, followerUserId);

      return res.json({ success: true });
    } catch (error) {
      console.error('Remove follower error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to remove follower',
      });
    }
  }

}