import { Injectable } from "@nestjs/common";

import { CreateDeliveryRequestDto } from "./dto/create-delivery-request.dto";

@Injectable()
export class DeliveryService {
  createDeliveryRequest(userId: string, payload: CreateDeliveryRequestDto) {
    return {
      userId,
      ...payload,
      status: "PENDING"
    };
  }

  trackDelivery(deliveryRequestId: string) {
    return {
      deliveryRequestId,
      status: "PENDING",
      history: []
    };
  }
}
