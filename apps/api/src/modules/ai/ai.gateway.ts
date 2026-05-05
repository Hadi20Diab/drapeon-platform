import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway
} from "@nestjs/websockets";
import { Socket } from "socket.io";

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
  constructor(private readonly aiService: AiService) {}

  handleConnection(client: Socket): void {
    client.emit("ai.connected", {
      socketId: client.id
    });
  }

  handleDisconnect(client: Socket): void {
    client.emit("ai.disconnected", {
      socketId: client.id
    });
  }

  @SubscribeMessage("ai.recommendations.request")
  async handleRecommendationRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: AiRecommendationDto & {
      userId: string;
    }
  ): Promise<void> {
    const result = await this.aiService.recommend(payload.userId, payload);
    client.emit("ai.recommendations.response", result);
  }
}
