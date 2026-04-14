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
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { UsersService } from 'src/modules/users/users.service';

@Controller('user/notifications')
@UseGuards(AuthGuard)
export class UserNotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}

  // ─── NOTIFICATIONS PAGE ──────────────────────────────────────────────────────
  @Get()
  async getNotificationsPage(
    @Query('page') page: string,
    @Query('filter') filter: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.redirect('/login');
      }

      const currentUser = await this.usersService.findOne(userId);
      const pageNumber = parseInt(page) || 1;
      const limit = 20;

      // Get paginated notifications with optional filter
      const result = await this.notificationsService.getUserNotifications(
        userId,
        pageNumber,
        limit,
        filter || 'all',
      );

      // Get unread count
      const unreadCount = await this.notificationsService.getUnreadCount(userId);

      // Get counts by type
      const counts = await this.notificationsService.getCountsByType(userId);

      return res.render('pages/user/notifications/index', {
        layout: 'layouts/user-layout',
        title: 'Notifications',
        page_title: 'Notifications',
        folder: 'Notifications',
        user: currentUser,
        notifications: result.notifications,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalNotifications: result.totalNotifications,
        unreadCount: unreadCount,
        filter: filter || 'all',
        counts: counts,
      });
    } catch (error) {
      console.error('Notifications page error:', error);
      req.flash('error', 'Failed to load notifications');
      return res.redirect('/user/dashboard');
    }
  }

  // ─── MARK AS READ ────────────────────────────────────────────────────────────
  @Post(':id/read')
  async markAsRead(
    @Param('id') notificationId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.notificationsService.markAsRead(parseInt(notificationId));
      return res.json({ success: true });
    } catch (error) {
      console.error('Mark as read error:', error);
      return res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
  }

  // ─── MARK ALL AS READ ────────────────────────────────────────────────────────
  @Post('mark-all-read')
  async markAllAsRead(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false });
      }

      await this.notificationsService.markAllAsRead(userId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Mark all as read error:', error);
      return res.status(500).json({ success: false, error: 'Failed to mark all as read' });
    }
  }

  // ─── DELETE NOTIFICATION ─────────────────────────────────────────────────────
  @Delete(':id')
  async deleteNotification(
    @Param('id') notificationId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false });
      }

      await this.notificationsService.delete(parseInt(notificationId), userId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete notification error:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete notification' });
    }
  }

  // ─── DELETE ALL READ ─────────────────────────────────────────────────────────
  @Post('delete-all-read')
  async deleteAllRead(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false });
      }

      await this.notificationsService.deleteAllRead(userId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete all read error:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete notifications' });
    }
  }

  // ─── GET UNREAD COUNT ────────────────────────────────────────────────────────
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false });
      }

      const count = await this.notificationsService.getUnreadCount(userId);
      return res.json({ success: true, count });
    } catch (error) {
      console.error('Get unread count error:', error);
      return res.status(500).json({ success: false, error: 'Failed to get count' });
    }
  }
}