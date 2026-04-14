import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as cookieModule from 'cookie';
import { ChatsService } from './chats.service';

/**
 * Parses the express-session cookie from the WebSocket handshake headers
 * and returns the userId stored in the session, or null if unauthenticated.
 *
 * express-session stores the session id in the signed cookie "connect.sid".
 * Because we are NOT using a persistent session store (default MemoryStore)
 * we cannot look up the session from the gateway without access to the store
 * instance.  The simplest production-grade approach is to pass the userId
 * explicitly from the client via the socket auth handshake option.
 */
@WebSocketGateway({
    namespace: '/chat',
    cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly chatsService: ChatsService) { }

    // ─── Connection lifecycle ─────────────────────────────────────────────────

    handleConnection(client: Socket) {
        // The frontend passes { auth: { userId } } in the io() options.
        const userId = client.handshake.auth?.userId as string | undefined;
        if (!userId) {
            client.disconnect();
            return;
        }
        client.data.userId = userId;
    }

    handleDisconnect(client: Socket) {
        // Nothing special needed; Socket.io auto-removes client from all rooms.
        console.log(`[ChatGateway] disconnected: ${client.id}`);
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    /**
     * Client emits `joinRoom` when opening a chat.
     * The client leaves the previous room automatically (we do it explicitly
     * too so typing indicators don't bleed across chats).
     */
    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { chatId: number; previousChatId?: number },
    ) {
        const userId = client.data.userId as string;
        if (!userId) return;

        // Leave previous room if provided
        if (payload.previousChatId) {
            await client.leave(`chat:${payload.previousChatId}`);
        }

        try {
            // Verify the user is actually a member before joining
            await this.chatsService.assertMemberPublic(payload.chatId, userId);
            await client.join(`chat:${payload.chatId}`);
            client.emit('joinedRoom', { chatId: payload.chatId });
        } catch {
            client.emit('error', { message: 'You are not a member of this chat' });
        }
    }

    /**
     * Client emits `sendMessage` with { chatId, content }.
     * The gateway saves the message and broadcasts `newMessage` to the room.
     */
    @SubscribeMessage('sendMessage')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { chatId: number; content: string },
    ) {
        const userId = client.data.userId as string;
        if (!userId || !payload.chatId || !payload.content?.trim()) return;

        try {
            const msg = await this.chatsService.sendMessage(payload.chatId, userId, payload.content);
            if (!msg) return;

            const dto = {
                id: msg.id,
                chatId: payload.chatId,
                senderId: msg.sender?.id ?? null,
                senderName: msg.sender?.name ?? null,
                senderProfileImage: msg.sender?.profile_image ?? null,
                messageType: msg.messageType,
                content: msg.content,
                fileName: msg.fileName ?? null,
                fileSize: msg.fileSize ?? null,
                isDeleted: msg.isDeleted,
                createdAt: msg.createdAt,
            };

            // Broadcast to everyone in the room (including sender)
            this.server.to(`chat:${payload.chatId}`).emit('newMessage', dto);
        } catch (err: any) {
            client.emit('error', { message: err?.message ?? 'Failed to send message' });
        }
    }

    /**
     * Called by the HTTP controller after a file upload so that other
     * room members receive the message in real time.
     */
    broadcastFileMessage(chatId: number, dto: Record<string, unknown>) {
        this.server.to(`chat:${chatId}`).emit('newMessage', dto);
    }

    /**
     * Typing indicators – forward to other room members only.
     */
    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { chatId: number; senderName: string },
    ) {
        client.to(`chat:${payload.chatId}`).emit('typing', {
            chatId: payload.chatId,
            senderName: payload.senderName,
        });
    }

    @SubscribeMessage('stopTyping')
    handleStopTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { chatId: number },
    ) {
        client.to(`chat:${payload.chatId}`).emit('stopTyping', { chatId: payload.chatId });
    }
}
