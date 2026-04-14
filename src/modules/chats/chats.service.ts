import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Chat } from './chat.entity';
import { ChatMember } from './chat-member.entity';
import { ChatMessage, ChatMessageType } from './chat-message.entity';
import { mimeToMessageType } from './config/multer-chat-file.config';
import { NotificationType } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { FollowsService } from '../follows/follows.service';
import { NotificationsService } from '../notifications/notifications.service';

type ListChatsItem = {
  chatId: number;
  type: 'direct' | 'group';
  groupName: string | null;
  otherUser: { id: string; name: string; profile_image?: string | null } | null;
  lastMessage: { id: number; content: string; createdAt: Date; senderId: string | null } | null;
  unreadCount: number;
};

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat) private chatRepo: Repository<Chat>,
    @InjectRepository(ChatMember) private memberRepo: Repository<ChatMember>,
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private followsService: FollowsService,
    private notificationsService: NotificationsService,
  ) { }

  private async assertMember(chatId: number, userId: string) {
    const membership = await this.memberRepo.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
      relations: ['chat', 'user'],
    });
    if (!membership) throw new ForbiddenException('You are not a member of this chat');
    return membership;
  }

  /** Public wrapper used by ChatGateway to verify membership. */
  async assertMemberPublic(chatId: number, userId: string) {
    return this.assertMember(chatId, userId);
  }

  async getOrCreateDirectChat(currentUserId: string, otherUserId: string) {
    if (currentUserId === otherUserId) {
      throw new BadRequestException('You cannot chat with yourself');
    }

    // Allow chat if there is an accepted follow in either direction:
    // - current user follows other, or
    // - other user follows current user.
    const canChatAsFollowing = await this.followsService.isFollowing(
      currentUserId,
      otherUserId,
    );
    const canChatAsFollower = await this.followsService.isFollowing(
      otherUserId,
      currentUserId,
    );
    if (!canChatAsFollowing && !canChatAsFollower) {
      throw new ForbiddenException('You can only chat with your followers or following');
    }

    const otherUser = await this.userRepo.findOne({ where: { id: otherUserId } });
    if (!otherUser) throw new NotFoundException('User not found');

    // Find existing direct chat containing BOTH users and only 2 members.
    const existing = await this.chatRepo
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'm')
      .where('chat.type = :type', { type: 'direct' })
      .groupBy('chat.id')
      .having('COUNT(m.id) = 2')
      .andHaving('SUM(m.userId = :u1) > 0', { u1: currentUserId })
      .andHaving('SUM(m.userId = :u2) > 0', { u2: otherUserId })
      .getOne();

    if (existing) return existing;

    const chat = await this.chatRepo.save(
      this.chatRepo.create({
        type: 'direct',
        creator: { id: currentUserId } as User,
      }),
    );

    await this.memberRepo.save([
      this.memberRepo.create({
        chat: { id: chat.id } as Chat,
        user: { id: currentUserId } as User,
        lastReadAt: new Date(),
      }),
      this.memberRepo.create({
        chat: { id: chat.id } as Chat,
        user: { id: otherUserId } as User,
        lastReadAt: null,
      }),
    ]);

    return chat;
  }

  async listChatsForUser(userId: string): Promise<ListChatsItem[]> {
    const memberships = await this.memberRepo.find({
      where: { user: { id: userId } },
      relations: ['chat'],
      order: { joinedAt: 'DESC' },
    });

    const chatIds = memberships.map((m) => m.chat.id);
    if (chatIds.length === 0) return [];

    const chats = await this.chatRepo.find({
      where: chatIds.map((id) => ({ id })),
      relations: ['members', 'members.user'],
    });

    const latestByChat = new Map<number, ChatMessage>();
    await Promise.all(
      chats.map(async (chat) => {
        const last = await this.messageRepo.findOne({
          where: { chat: { id: chat.id }, isDeleted: false },
          relations: ['sender'],
          order: { createdAt: 'DESC' },
        });
        if (last) latestByChat.set(chat.id, last);
      }),
    );

    // Unread counts based on member.lastReadAt
    const unreadCountsRaw = await this.messageRepo
      .createQueryBuilder('msg')
      .innerJoin(ChatMember, 'cm', 'cm.chatId = msg.chatId AND cm.userId = :userId', { userId })
      .select('msg.chatId', 'chatId')
      .addSelect('COUNT(msg.id)', 'cnt')
      .where('msg.chatId IN (:...chatIds)', { chatIds })
      .andWhere('msg.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('(cm.lastReadAt IS NULL OR msg.createdAt > cm.lastReadAt)')
      .andWhere('msg.senderId != :userId', { userId })
      .groupBy('msg.chatId')
      .getRawMany<{ chatId: number; cnt: string }>();

    const unreadByChat = new Map<number, number>();
    for (const row of unreadCountsRaw) unreadByChat.set(Number(row.chatId), Number(row.cnt));

    const items: ListChatsItem[] = chats
      .map((chat) => {
        const other =
          chat.type === 'direct'
            ? chat.members.find((m) => m.user?.id !== userId)?.user
            : null;

        const last = latestByChat.get(chat.id);
        const lastDto = last
          ? {
            id: last.id,
            content: last.content,
            messageType: last.messageType,
            createdAt: last.createdAt,
            senderId: last.sender?.id ?? null,
          }
          : null;

        return {
          chatId: chat.id,
          type: chat.type,
          groupName: chat.type === 'group' ? (chat.name ?? null) : null,
          otherUser: other
            ? { id: other.id, name: other.name, profile_image: other.profile_image ?? null }
            : null,
          lastMessage: lastDto,
          unreadCount: unreadByChat.get(chat.id) ?? 0,
        };
      })
      .sort((a, b) => {
        const at = a.lastMessage?.createdAt?.getTime() ?? 0;
        const bt = b.lastMessage?.createdAt?.getTime() ?? 0;
        return bt - at;
      });

    return items;
  }

  async getMessages(chatId: number, userId: string, limit = 50) {
    await this.assertMember(chatId, userId);

    const messages = await this.messageRepo.find({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return messages.map((m) => ({
      id: m.id,
      chatId,
      senderId: m.sender?.id ?? null,
      senderName: m.sender?.name ?? null,
      senderProfileImage: m.sender?.profile_image ?? null,
      messageType: m.messageType,
      content: m.isDeleted ? 'This message was deleted' : m.content,
      fileName: m.isDeleted ? null : (m.fileName ?? null),
      fileSize: m.isDeleted ? null : (m.fileSize ?? null),
      isDeleted: m.isDeleted,
      createdAt: m.createdAt,
    }));
  }

  async markRead(chatId: number, userId: string) {
    const membership = await this.assertMember(chatId, userId);
    membership.lastReadAt = new Date();
    await this.memberRepo.save(membership);
    return true;
  }

  async sendMessage(chatId: number, senderId: string, content: string) {
    await this.assertMember(chatId, senderId);

    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
      relations: ['members', 'members.user'],
    });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Follow-check only applies to direct chats
    if (chat.type === 'direct') {
      const otherUser = chat.members.find((m) => m.user?.id !== senderId)?.user;
      if (!otherUser) {
        throw new BadRequestException('Chat does not have another member');
      }
      const canSendAsFollowing = await this.followsService.isFollowing(senderId, otherUser.id);
      const canSendAsFollower = await this.followsService.isFollowing(otherUser.id, senderId);
      if (!canSendAsFollowing && !canSendAsFollower) {
        throw new ForbiddenException('You must follow this user before sending a new message.');
      }
    }

    const text = (content ?? '').trim();
    if (!text) throw new BadRequestException('Message content is required');

    const msg = await this.messageRepo.save(
      this.messageRepo.create({
        chat: { id: chatId } as Chat,
        sender: { id: senderId } as User,
        messageType: ChatMessageType.TEXT,
        content: text,
        isDeleted: false,
      }),
    );

    return this.messageRepo.findOne({
      where: { id: msg.id },
      relations: ['sender'],
    });
  }

  async sendFileMessage(
    chatId: number,
    senderId: string,
    file: Express.Multer.File,
  ) {
    await this.assertMember(chatId, senderId);

    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
      relations: ['members', 'members.user'],
    });
    if (!chat) throw new NotFoundException('Chat not found');

    // Follow-check only applies to direct chats
    if (chat.type === 'direct') {
      const otherUser = chat.members.find((m) => m.user?.id !== senderId)?.user;
      if (!otherUser) throw new BadRequestException('Chat does not have another member');
      const canSendAsFollowing = await this.followsService.isFollowing(senderId, otherUser.id);
      const canSendAsFollower = await this.followsService.isFollowing(otherUser.id, senderId);
      if (!canSendAsFollowing && !canSendAsFollower) {
        throw new ForbiddenException('You must follow this user before sending files.');
      }
    }

    const msgType = mimeToMessageType(file.mimetype) as ChatMessageType;
    const storedFilename = file.filename; // uuid-based name saved on disk
    const originalName = file.originalname;

    const msg = await this.messageRepo.save(
      this.messageRepo.create({
        chat: { id: chatId } as Chat,
        sender: { id: senderId } as User,
        messageType: msgType,
        content: storedFilename,   // stored filename used as content/path
        fileName: originalName,    // original name shown to user
        fileSize: file.size,
        isDeleted: false,
      }),
    );

    return this.messageRepo.findOne({
      where: { id: msg.id },
      relations: ['sender'],
    });
  }

  // -------------------- Group chat methods --------------------

  async getFollowNetwork(userId: string) {
    const followers = await this.followsService.getFollowers(userId);
    const following = await this.followsService.getFollowing(userId);
    const seen = new Set<string>();
    const result: { id: string; name: string; profile_image: string | null }[] = [];
    for (const u of [...followers, ...following]) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        result.push({ id: u.id, name: u.name, profile_image: u.profile_image ?? null });
      }
    }
    return result;
  }

  async createGroupChat(creatorId: string, name: string, memberIds: string[]) {
    const trimmedName = (name ?? '').trim();
    if (!trimmedName) throw new BadRequestException('Group name is required');

    // Validate members are in follow network
    const network = await this.getFollowNetwork(creatorId);
    const networkIds = new Set(network.map((u) => u.id));
    for (const mid of memberIds) {
      if (!networkIds.has(mid)) {
        throw new ForbiddenException('You can only add followers or following as group members');
      }
    }

    const chat = await this.chatRepo.save(
      this.chatRepo.create({
        type: 'group',
        name: trimmedName,
        creator: { id: creatorId } as User,
      }),
    );

    const allMemberIds = [creatorId, ...memberIds.filter((id) => id !== creatorId)];
    await this.memberRepo.save(
      allMemberIds.map((uid) =>
        this.memberRepo.create({
          chat: { id: chat.id } as Chat,
          user: { id: uid } as User,
          lastReadAt: uid === creatorId ? new Date() : null,
        }),
      ),
    );

    // Notify each invited member (not the creator) asynchronously
    for (const mid of memberIds.filter((id) => id !== creatorId)) {
      this.notificationsService
        .createNotification({
          recipientId: mid,
          actorId: creatorId,
          type: NotificationType.GROUP_ADD,
          meta: { chatId: chat.id, groupName: trimmedName },
        })
        .catch(() => { /* ignore notification errors */ });
    }

    return chat;
  }

  async getChatDetails(chatId: number, userId: string) {
    await this.assertMember(chatId, userId);
    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
      relations: ['creator', 'members', 'members.user'],
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      creatorId: chat.creator?.id ?? null,
      members: chat.members.map((m) => ({
        id: m.user?.id ?? null,
        name: m.user?.name ?? null,
        profile_image: m.user?.profile_image ?? null,
      })),
    };
  }

  async addGroupMember(chatId: number, requesterId: string, newMemberId: string) {
    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
      relations: ['creator'],
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.type !== 'group') throw new BadRequestException('Not a group chat');
    if ((chat.creator?.id ?? null) !== requesterId) {
      throw new ForbiddenException('Only the group creator can add members');
    }

    // Must be in follow network
    const network = await this.getFollowNetwork(requesterId);
    const inNetwork = network.some((u) => u.id === newMemberId);
    if (!inNetwork) throw new ForbiddenException('User is not in your followers or following');

    // Check not already a member
    const existing = await this.memberRepo.findOne({
      where: { chat: { id: chatId }, user: { id: newMemberId } },
    });
    if (existing) throw new BadRequestException('User is already a member of this group');

    await this.memberRepo.save(
      this.memberRepo.create({
        chat: { id: chatId } as Chat,
        user: { id: newMemberId } as User,
        lastReadAt: null,
      }),
    );

    // Notify the newly added member asynchronously
    this.notificationsService
      .createNotification({
        recipientId: newMemberId,
        actorId: requesterId,
        type: NotificationType.GROUP_ADD,
        meta: { chatId, groupName: chat.name ?? 'Group' },
      })
      .catch(() => { /* ignore notification errors */ });

    return true;
  }

  async removeGroupMember(chatId: number, requesterId: string, memberIdToRemove: string) {
    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
      relations: ['creator'],
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.type !== 'group') throw new BadRequestException('Not a group chat');
    if ((chat.creator?.id ?? null) !== requesterId) {
      throw new ForbiddenException('Only the group creator can remove members');
    }
    if (memberIdToRemove === requesterId) {
      throw new BadRequestException('Creator cannot remove themselves from the group');
    }

    const membership = await this.memberRepo.findOne({
      where: { chat: { id: chatId }, user: { id: memberIdToRemove } },
    });
    if (!membership) throw new NotFoundException('Member not found in this group');
    await this.memberRepo.remove(membership);

    // Notify the removed member asynchronously
    this.notificationsService
      .createNotification({
        recipientId: memberIdToRemove,
        actorId: requesterId,
        type: NotificationType.GROUP_REMOVE,
        meta: { groupName: chat.name ?? 'Group' },
      })
      .catch(() => { /* ignore notification errors */ });

    return true;
  }

  async deleteMessage(chatId: number, messageId: number, userId: string) {
    await this.assertMember(chatId, userId);

    const msg = await this.messageRepo.findOne({
      where: { id: messageId, chat: { id: chatId } },
      relations: ['sender'],
    });
    if (!msg) throw new NotFoundException('Message not found');
    if ((msg.sender?.id ?? null) !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    msg.isDeleted = true;
    await this.messageRepo.save(msg);
    return true;
  }
}

