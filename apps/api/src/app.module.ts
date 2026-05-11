import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { HealthController } from "./health.controller";
import { validateEnv } from "./config/env.validation";
import { AdminModule } from "./modules/admin/admin.module";
import { AiModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { ContactModule } from "./modules/contact/contact.module";
import { DesignersModule } from "./modules/designers/designers.module";
import { ProductsModule } from "./modules/products/products.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      expandVariables: true,
      validate: validateEnv
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>("THROTTLE_TTL", 60) * 1000,
          limit: configService.get<number>("THROTTLE_LIMIT", 120)
        }
      ]
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    UsersModule,
    ContactModule,
    DesignersModule,
    ProductsModule,
    PaymentsModule,
    BookingsModule,
    AiModule
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
