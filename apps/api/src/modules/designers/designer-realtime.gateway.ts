import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway
} from "@nestjs/websockets";
import { Socket } from "socket.io";

import { AuthJwtPayload } from "../auth/interfaces/auth-jwt-payload.interface";

@WebSocketGateway({
  namespace: "/designer-live",
  cors: {
    origin: true,
    credentials: true
  }
})
export class DesignerRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly socketUsers = new Map<string, AuthJwtPayload>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);

    if (!token) {
      client.emit("designer.error", { message: "Missing authentication token" });
      client.disconnect(true);
      return;
    }

    try {
      const user = this.jwtService.verify<AuthJwtPayload>(token, {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET")
      });

      if (user.role !== "DESIGNER") {
        client.emit("designer.error", { message: "Designer role required" });
        client.disconnect(true);
        return;
      }

      this.socketUsers.set(client.id, user);
      client.join(`designer:${user.sub}`);
      client.emit("designer.connected", { socketId: client.id, userId: user.sub });
    } catch {
      client.emit("designer.error", { message: "Invalid authentication token" });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.socketUsers.delete(client.id);
  }

  @SubscribeMessage("designer.typing")
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: { conversationId?: string }) {
    const user = this.socketUsers.get(client.id);

    if (!user || !payload.conversationId) {
      return;
    }

    client.to(`designer:${user.sub}`).emit("designer.typing", {
      conversationId: payload.conversationId,
      userId: user.sub
    });
  }

  @SubscribeMessage("designer.notifications.read")
  handleNotificationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { notificationId?: string }
  ) {
    const user = this.socketUsers.get(client.id);

    if (!user || !payload.notificationId) {
      return;
    }

    client.to(`designer:${user.sub}`).emit("designer.notifications.read", payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const token = typeof auth?.token === "string" ? auth.token : undefined;

    if (token) {
      return token.startsWith("Bearer ") ? token.slice(7) : token;
    }

    const authorizationHeader = client.handshake.headers.authorization;
    return typeof authorizationHeader === "string" && authorizationHeader.startsWith("Bearer ")
      ? authorizationHeader.slice(7)
      : null;
  }
}