import { Injectable } from "@nestjs/common";

import { UpdateBodyMeasurementsDto } from "./dto/update-body-measurements.dto";

@Injectable()
export class UsersService {
  getCurrentUserProfile(userId: string) {
    return {
      userId,
      measurements: null,
      preferences: null
    };
  }

  updateMeasurements(userId: string, payload: UpdateBodyMeasurementsDto) {
    return {
      userId,
      measurements: payload
    };
  }
}
