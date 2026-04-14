import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';

import { AuthGuard } from 'src/common/guards/auth.guard';
import { ChatsService } from 'src/modules/chats/chats.service';
import { ChatGateway } from 'src/modules/chats/chat.gateway';
import { UsersService } from 'src/modules/users/users.service';
import { multerChatFileConfig } from 'src/modules/chats/config/multer-chat-file.config';

@Controller('user/chats')
@UseGuards(AuthGuard)
export class UserChatsWebController {
  constructor(
    private chatsService: ChatsService,
    private chatGateway: ChatGateway,
    private usersService: UsersService,
  ) { }

  // UI #1: Topbar -> sidebar list + conversation
  @Get()
  async chatsHome(@Req() req: Request, @Res() res: Response) {
    const userId = req.session?.userId;
    if (!userId) return null;

    const user = await this.usersService.findOne(userId);
    if (!user) return res.redirect('/login');

    return res.render('pages/user/chat/index', {
      layout: 'layouts/user-layout',
      title: 'Chats',
      page_title: 'Chats',
      folder: 'Chats',
      user,
      unreadCount: 0,
    });
  }

  // UI #2: Profile -> conversation-only, direct chat with target user
  @Get('with/:otherUserId')
  async directChatPage(
    @Param('otherUserId') otherUserId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = req.session?.userId;
    if (!userId) return null;

    const user = await this.usersService.findOne(userId);
    if (!user) return res.redirect('/login');

    const otherUser = await this.usersService.findOne(otherUserId);
    if (!otherUser) return res.redirect('/user/search');

    const chat = await this.chatsService.getOrCreateDirectChat(userId, otherUserId);

    return res.render('pages/user/chat/direct', {
      layout: 'layouts/user-layout',
      title: `Chat with ${otherUser.name}`,
      page_title: otherUser.name,
      folder: 'Chats',
      user,
      otherUser,
      chatId: chat.id,
      unreadCount: 0,
    });
  }

  // -------------------- APIs used by Velzon chat UI --------------------

  @Get('api/list')
  async apiList(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;

      const chats = await this.chatsService.listChatsForUser(userId);
      return res.json({ success: true, chats });
    } catch (error) {
      console.error('Chat list error:', error);
      return res.status(500).json({ success: false, error: 'Failed to load chats' });
    }
  }

  @Post('api/direct')
  async apiGetOrCreateDirect(
    @Body() body: { otherUserId: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;

      const chat = await this.chatsService.getOrCreateDirectChat(userId, body.otherUserId);
      return res.json({ success: true, chatId: chat.id });
    } catch (error) {
      console.error('Create direct chat error:', error);
      return res
        .status(400)
        .json({ success: false, error: error?.message ?? 'Failed to create chat' });
    }
  }

  @Get('api/:chatId/messages')
  async apiMessages(
    @Param('chatId') chatId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;

      const messages = await this.chatsService.getMessages(Number(chatId), userId, 200);
      await this.chatsService.markRead(Number(chatId), userId);
      return res.json({ success: true, messages });
    } catch (error) {
      console.error('Chat messages error:', error);
      return res.status(400).json({ success: false, error: 'Failed to load messages' });
    }
  }

  @Post('api/:chatId/messages')
  async apiSend(
    @Param('chatId') chatId: string,
    @Body() body: { content: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;

      const msg = await this.chatsService.sendMessage(Number(chatId), userId, body.content);
      return res.json({
        success: true,
        message: msg
          ? {
            id: msg.id,
            chatId: Number(chatId),
            senderId: msg.sender?.id ?? null,
            messageType: msg.messageType,
            content: msg.isDeleted ? 'This message was deleted' : msg.content,
            fileName: msg.fileName ?? null,
            fileSize: msg.fileSize ?? null,
            isDeleted: msg.isDeleted,
            createdAt: msg.createdAt,
          }
          : null,
      });
    } catch (error) {
      console.error('Send message error:', error);
      return res
        .status(400)
        .json({ success: false, error: error?.message ?? 'Failed to send message' });
    }
  }

  @Post('api/:chatId/messages/:messageId/delete')
  async apiDelete(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;
      await this.chatsService.deleteMessage(Number(chatId), Number(messageId), userId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete message error:', error);
      return res.status(400).json({ success: false, error: 'Failed to delete message' });
    }
  }

  @Post('api/:chatId/messages/file')
  @UseInterceptors(FileInterceptor('file', multerChatFileConfig))
  async apiSendFile(
    @Param('chatId') chatId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;
      if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const msg = await this.chatsService.sendFileMessage(Number(chatId), userId, file);

      const dto = msg ? {
        id: msg.id,
        chatId: Number(chatId),
        senderId: msg.sender?.id ?? null,
        senderName: (msg.sender as any)?.name ?? null,
        senderProfileImage: (msg.sender as any)?.profile_image ?? null,
        messageType: msg.messageType,
        content: msg.content,
        fileName: msg.fileName ?? null,
        fileSize: msg.fileSize ?? null,
        isDeleted: msg.isDeleted,
        createdAt: msg.createdAt,
      } : null;

      // Broadcast to socket room so all members see the file in real time
      if (dto) {
        this.chatGateway.broadcastFileMessage(Number(chatId), dto as Record<string, unknown>);
      }

      return res.json({ success: true, message: dto });
    } catch (error) {
      console.error('Send file error:', error);
      return res
        .status(400)
        .json({ success: false, error: error?.message ?? 'Failed to send file' });
    }
  }

  // -------------------- Group chat routes --------------------

  // Page: create group form
  @Get('group/new')
  async createGroupPage(@Req() req: Request, @Res() res: Response) {
    const userId = req.session?.userId;
    if (!userId) return res.redirect('/login');

    const user = await this.usersService.findOne(userId);
    if (!user) return res.redirect('/login');

    const network = await this.chatsService.getFollowNetwork(userId);

    return res.render('pages/user/chat/create-group', {
      layout: 'layouts/user-layout',
      title: 'Create Group',
      page_title: 'Create Group',
      folder: 'Chats',
      user,
      network,
      unreadCount: 0,
    });
  }

  // API: create a group chat
  @Post('api/group')
  async apiCreateGroup(
    @Body() body: { name: string; memberIds: string[] },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;
      const chat = await this.chatsService.createGroupChat(
        userId,
        body.name,
        Array.isArray(body.memberIds) ? body.memberIds : [],
      );
      return res.json({ success: true, chatId: chat.id });
    } catch (error) {
      console.error('Create group chat error:', error);
      return res.status(400).json({ success: false, error: error?.message ?? 'Failed to create group' });
    }
  }

  // API: get followers + following for member picker
  @Get('api/followers-following')
  async apiFollowNetwork(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;
      const users = await this.chatsService.getFollowNetwork(userId);
      return res.json({ success: true, users });
    } catch (error) {
      console.error('Follow network error:', error);
      return res.status(500).json({ success: false, error: 'Failed to load network' });
    }
  }

  // API: get group chat details (members, creator)
  @Get('api/group/:chatId/members')
  async apiGroupMembers(
    @Param('chatId') chatId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;
      const details = await this.chatsService.getChatDetails(Number(chatId), userId);
      return res.json({ success: true, ...details });
    } catch (error) {
      console.error('Group members error:', error);
      return res.status(400).json({ success: false, error: 'Failed to load group members' });
    }
  }

  // API: add a member to a group (creator only)
  @Post('api/group/:chatId/members/add')
  async apiAddGroupMember(
    @Param('chatId') chatId: string,
    @Body() body: { userId: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;
      await this.chatsService.addGroupMember(Number(chatId), userId, body.userId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Add member error:', error);
      return res.status(400).json({ success: false, error: error?.message ?? 'Failed to add member' });
    }
  }

  // API: remove a member from a group (creator only)
  @Post('api/group/:chatId/members/remove')
  async apiRemoveGroupMember(
    @Param('chatId') chatId: string,
    @Body() body: { userId: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.session?.userId;
      if (!userId) return null;
      await this.chatsService.removeGroupMember(Number(chatId), userId, body.userId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Remove member error:', error);
      return res.status(400).json({ success: false, error: error?.message ?? 'Failed to remove member' });
    }
  }
}
