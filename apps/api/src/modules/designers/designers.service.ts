import { Injectable } from "@nestjs/common";

import { CreateStoreDto } from "./dto/create-store.dto";

@Injectable()
export class DesignersService {
  createStore(designerId: string, payload: CreateStoreDto) {
    return {
      designerId,
      ...payload,
      approvalStatus: "PENDING"
    };
  }

  getDashboard(designerId: string) {
    return {
      designerId,
      productsCount: 0,
      pendingAppointments: 0,
      openDeliveries: 0
    };
  }
}
