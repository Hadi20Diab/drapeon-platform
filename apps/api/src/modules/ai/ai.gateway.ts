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
import { AiRecommendationDto } from "./dto/ai-recommendation.dto";
import { AiService } from "./ai.service";

@WebSocketGateway({
  namespace: "/ai-live",
  cors: {
    origin: true,
    credentials: true
  }
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly socketUsers = new Map<string, AuthJwtPayload>();

  constructor(
    private readonly aiService: AiService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);

    if (!token) {
      client.emit("ai.error", {
        message: "Missing authentication token"
      });
      client.disconnect(true);
      return;
    }

    try {
      const user = this.jwtService.verify<AuthJwtPayload>(token, {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET")
      });

      this.socketUsers.set(client.id, user);
      client.emit("ai.connected", {
        socketId: client.id,
        userId: user.sub
      });
    } catch {
      client.emit("ai.error", {
        message: "Invalid authentication token"
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.socketUsers.delete(client.id);
    client.emit("ai.disconnected", {
      socketId: client.id
    });
  }

  @SubscribeMessage("ai.recommendations.request")
  async handleRecommendationRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AiRecommendationDto
  ): Promise<void> {
    const user = this.socketUsers.get(client.id);

    if (!user) {
      client.emit("ai.error", {
        message: "Unauthenticated socket session"
      });
      return;
    }

    const result = await this.aiService.recommend(user.sub, payload, {
      onEvent: (event) => {
        client.emit("ai.recommendations.event", event);
      }
    });
    client.emit("ai.recommendations.response", result);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as unknown;
    const authToken = this.readTokenFromUnknown(auth);

    if (typeof authToken === "string" && authToken.trim().length > 0) {
      return authToken.startsWith("Bearer ") ? authToken.slice(7) : authToken;
    }

    const authorizationHeader = client.handshake.headers["authorization"];

    if (
      typeof authorizationHeader === "string" &&
      authorizationHeader.startsWith("Bearer ")
    ) {
      return authorizationHeader.slice(7);
    }

    return null;
  }

  private readTokenFromUnknown(value: unknown): string | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    const token = (value as Record<string, unknown>).token;
    return typeof token === "string" ? token : undefined;
  }
}
