import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { UpdateBodyMeasurementsDto } from "./dto/update-body-measurements.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUserProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { measurements: true }
    });

    if (!profile) {
      throw new NotFoundException("User profile was not found");
    }

    return profile;
  }

  async updateMeasurements(userId: string, payload: UpdateBodyMeasurementsDto) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      throw new NotFoundException("User profile was not found");
    }

    const createData: Prisma.BodyMeasurementUncheckedCreateInput = {
      profileId: profile.id,
      ...payload
    };
    const updateData: Prisma.BodyMeasurementUncheckedUpdateInput = {
      ...payload
    };

    return this.prisma.bodyMeasurement.upsert({
      where: { profileId: profile.id },
      create: createData,
      update: updateData
    });
  }

  async updateCurrentUserProfile(userId: string, payload: UpdateUserProfileDto) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      throw new NotFoundException("User profile was not found");
    }

    const updateData: Prisma.UserProfileUpdateInput = {
      ...(payload.firstName ? { firstName: payload.firstName } : {}),
      ...(payload.lastName ? { lastName: payload.lastName } : {}),
      ...(payload.phoneNumber !== undefined ? { phoneNumber: payload.phoneNumber } : {}),
      ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
      ...(payload.preferences !== undefined
        ? { preferences: payload.preferences as Prisma.InputJsonValue }
        : {})
    };

    return this.prisma.userProfile.update({
      where: { userId },
      data: updateData,
      include: {
        measurements: true
      }
    });
  }
}
