import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ApiResponseInterceptor } from "./common/interceptors/api-response.interceptor";
import { PrismaService } from "./prisma/prisma.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true
  });

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>("API_PREFIX", "api");
  const port = configService.get<number>("PORT", 4000);
  const webOrigin = configService.get<string>("WEB_ORIGIN", "http://localhost:5173");
  const allowedOrigins = webOrigin
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Support a dynamic origin check so the server responds with the correct
  // Access-Control-Allow-Origin header when the frontend origin matches.
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow non-browser requests (curl, server-to-server) which have no origin
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
  });
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.get(PrismaService).enableShutdownHooks(app);

  await app.listen(port);

  Logger.log(`API listening on http://localhost:${port}/${apiPrefix}`, "Bootstrap");
}

void bootstrap();
