import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalizeException(exception);
    const statusCode = normalized.statusCode;
    const errorResponse = normalized.errorResponse;

    if (statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception)
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      error: errorResponse
    });
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    errorResponse: string | object;
  } {
    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        errorResponse: exception.getResponse()
      };
    }

    if (this.isPrismaPoolTimeout(exception)) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorResponse:
          "The database is busy right now. Please try again in a moment. If this keeps happening, reduce the Prisma connection limit in your Neon pooled DATABASE_URL."
      };
    }

    if (this.isPayloadTooLarge(exception)) {
      return {
        statusCode: 413,
        errorResponse:
          "Request body too large. It looks like you uploaded large images or pasted large data URIs. Reduce image file sizes, upload fewer images, or use image URLs instead."
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorResponse: "Internal server error"
    };
  }

  private isPrismaPoolTimeout(exception: unknown): boolean {
    if (!exception || typeof exception !== "object") {
      return false;
    }

    const error = exception as {
      code?: unknown;
      message?: unknown;
      name?: unknown;
    };

    return (
      error.code === "P2024" ||
      (typeof error.message === "string" &&
        error.message.includes("Timed out fetching a new connection from the connection pool")) ||
      (error.name === "PrismaClientKnownRequestError" && error.code === "P2024")
    );
  }

  private isPayloadTooLarge(exception: unknown): boolean {
    if (!exception || typeof exception !== "object") {
      return false;
    }

    const error = exception as { name?: unknown; type?: unknown; message?: unknown; status?: unknown };

    return (
      error.name === "PayloadTooLargeError" ||
      error.type === "entity.too.large" ||
      (typeof error.message === "string" && error.message.includes("request entity too large")) ||
      error.status === 413
    );
  }
}
