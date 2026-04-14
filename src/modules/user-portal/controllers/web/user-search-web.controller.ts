import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { UsersService } from 'src/modules/users/users.service';
import { FollowsService } from 'src/modules/follows/follows.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { NotificationType } from 'src/modules/notifications/notification.entity';

@Controller('user/search')
@UseGuards(AuthGuard)
export class UserSearchController {
  constructor(
    private usersService: UsersService,
    private followsService: FollowsService,
    private notificationsService: NotificationsService,
  ) { }

  // ─── SEARCH PAGE ─────────────────────────────────────────────────────────────
  @Get()
  async getSearchPage(
    @Query('q') query: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.redirect('/login');
      }

      const currentUser = await this.usersService.findOne(userId);

      let searchResults: any = [];
      let suggestedUsers: any = [];

      if (query && query.trim() !== '') {
        // Perform search - now includes currentUserId
        searchResults = await this.usersService.searchUsers(
          query.trim(),
          userId,
          userId, // Exclude self from results
        );
      } else {
        // Show suggested users when no search query
        suggestedUsers = await this.usersService.getSuggestedUsers(userId, 20);
      }

      // Get pending requests count for badge
      const pendingRequestsCount = await this.followsService.getPendingRequestsCount(userId);

      return res.render('pages/user/search/index', {
        layout: 'layouts/user-layout',
        title: 'Search Users',
        page_title: 'Search',
        folder: 'Search',
        user: currentUser,
        query: query || '',
        searchResults: searchResults,
        suggestedUsers: suggestedUsers,
        pendingRequestsCount: pendingRequestsCount,
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Search page error:', error);
      req.flash('error', 'Failed to load search page');
      return res.redirect('/user/dashboard');
    }
  }

  // ─── SEND FOLLOW REQUEST ─────────────────────────────────────────────────────
  @Post(':id/follow')
  async sendFollowRequest(
    @Param('id') targetUserId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      await this.followsService.sendFollowRequest(userId, targetUserId);

      // Create notification for follow request
      try {
        await this.notificationsService.createNotification({
          recipientId: targetUserId,
          actorId: userId,
          type: NotificationType.FOLLOW_REQUEST,
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      return res.json({ success: true, status: 'pending' });
    } catch (error) {
      console.error('Follow request error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send follow request',
      });
    }
  }

  // ─── UNFOLLOW / CANCEL REQUEST ───────────────────────────────────────────────
  @Delete(':id/follow')
  async unfollowUser(
    @Param('id') targetUserId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      await this.followsService.unfollow(userId, targetUserId);

      return res.json({ success: true });
    } catch (error) {
      console.error('Unfollow error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to unfollow',
      });
    }
  }

  // ─── ACCEPT FOLLOW REQUEST ───────────────────────────────────────────────────
  @Post('follow-request/:id/accept')
  async acceptFollowRequest(
    @Param('id') followId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false });
      }

      const follow = await this.followsService.acceptFollowRequest(
        parseInt(followId),
        userId,
      );

      // Create notification for follow accept
      try {
        await this.notificationsService.createNotification({
          recipientId: follow.follower.id,
          actorId: userId,
          type: NotificationType.FOLLOW_ACCEPT,
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Accept request error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to accept request',
      });
    }
  }

  // ─── REJECT FOLLOW REQUEST ───────────────────────────────────────────────────
  @Post('follow-request/:id/reject')
  async rejectFollowRequest(
    @Param('id') followId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false });
      }

      const follow = await this.followsService.rejectFollowRequest(
        parseInt(followId),
        userId,
      );

      // Create notification for rejection (optional - let sender know)
      try {
        await this.notificationsService.createNotification({
          recipientId: follow.follower.id,
          actorId: userId,
          type: NotificationType.FOLLOW_REJECT,
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Reject request error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to reject request',
      });
    }
  }

  // ─── GET FOLLOW REQUESTS PAGE ────────────────────────────────────────────────
  @Get('follow-requests')
  async getFollowRequestsPage(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.redirect('/login');
      }

      const currentUser = await this.usersService.findOne(userId);

      // Get pending requests (incoming)
      const pendingRequests = await this.followsService.getPendingRequests(userId);

      // Get sent requests (outgoing)
      const sentRequests = await this.followsService.getSentRequests(userId);

      return res.render('pages/user/search/follow-requests', {
        layout: 'layouts/user-layout',
        title: 'Follow Requests',
        page_title: 'Follow Requests',
        folder: 'Search',
        user: currentUser,
        pendingRequests: pendingRequests,
        sentRequests: sentRequests,
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Follow requests page error:', error);
      req.flash('error', 'Failed to load follow requests');
      return res.redirect('/user/search');
    }
  }
}