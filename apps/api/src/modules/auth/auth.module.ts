import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: configService.getOrThrow<number>("JWT_ACCESS_TTL")
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtAuthGuard, RolesGuard, StripeConnectService],
  exports: [AuthService, PassportModule, JwtModule, JwtAuthGuard, RolesGuard]
})
export class AuthModule {}
