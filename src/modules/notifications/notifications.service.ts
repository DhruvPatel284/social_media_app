import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';
import { Comment } from '../comments/comment.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
  ) { }

  /**
   * Create a notification. Pass the type explicitly along with any optional
   * postId / commentId / meta needed for that type.
   */
  async createNotification(data: {
    recipientId: string;
    actorId: string;
    type: NotificationType;
    postId?: number;
    commentId?: number;
    meta?: any;
  }): Promise<Notification | null> {
    // Don't create notification if actor is recipient (self-action)
    if (data.recipientId === data.actorId) {
      return null;
    }

    const recipient = await this.userRepo.findOne({
      where: { id: data.recipientId },
    });
    const actor = await this.userRepo.findOne({
      where: { id: data.actorId },
    });

    if (!recipient || !actor) {
      throw new Error('User not found');
    }

    const notification = this.repo.create({
      recipient,
      actor,
      type: data.type,
      meta: data.meta,
    });

    // Attach post if provided
    if (data.postId) {
      const post = await this.postRepo.findOne({
        where: { id: data.postId },
      });
      if (post) {
        notification.post = post;
      }
    }

    // Attach comment if provided
    if (data.commentId) {
      const comment = await this.commentRepo.findOne({
        where: { id: data.commentId },
      });
      if (comment) {
        notification.comment = comment;
      }
    }

    return await this.repo.save(notification);
  }

  /**
   * Get paginated notifications for a user with optional filter
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filter: string = 'all',
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      recipient: { id: userId },
    };

    // Add type filter if not 'all'
    if (filter !== 'all') {
      whereClause.type = filter;
    }

    // Get total count
    const totalNotifications = await this.repo.count({
      where: whereClause,
    });

    // Get paginated notifications
    const notifications = await this.repo.find({
      where: whereClause,
      relations: ['actor', 'post', 'post.user', 'comment', 'comment.post'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalNotifications / limit);

    return {
      notifications,
      currentPage: page,
      totalPages,
      totalNotifications,
      hasMore: page < totalPages,
    };
  }

  /**
   * Get counts by notification type
   */
  async getCountsByType(userId: string) {
    const allCount = await this.repo.count({
      where: { recipient: { id: userId } },
    });

    const likeCount = await this.repo.count({
      where: { recipient: { id: userId }, type: NotificationType.LIKE },
    });

    const commentCount = await this.repo.count({
      where: { recipient: { id: userId }, type: NotificationType.COMMENT },
    });

    const followCount = await this.repo.count({
      where: { recipient: { id: userId }, type: NotificationType.FOLLOW },
    });

    const followRequestCount = await this.repo.count({
      where: { recipient: { id: userId }, type: NotificationType.FOLLOW_REQUEST },
    });

    const followAcceptCount = await this.repo.count({
      where: { recipient: { id: userId }, type: NotificationType.FOLLOW_ACCEPT },
    });

    return {
      all: allCount,
      like: likeCount,
      comment: commentCount,
      follow: followCount,
      follow_request: followRequestCount,
      follow_accept: followAcceptCount,
    };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.repo.count({
      where: {
        recipient: { id: userId },
        isRead: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<Notification> {
    const notification = await this.repo.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    return await this.repo.save(notification);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.repo.update(
      { recipient: { id: userId }, isRead: false },
      { isRead: true },
    );
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: number, userId: string): Promise<void> {
    const notification = await this.repo.findOne({
      where: { id: notificationId, recipient: { id: userId } },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await this.repo.remove(notification);
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(userId: string): Promise<void> {
    const notifications = await this.repo.find({
      where: {
        recipient: { id: userId },
        isRead: true,
      },
    });

    if (notifications.length > 0) {
      await this.repo.remove(notifications);
    }
  }

}

