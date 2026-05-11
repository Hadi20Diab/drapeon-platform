import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface MailidatorResponse {
  email: string;
  domain: string;
  isDisposable: boolean;
  isForwarded: boolean;
  hasMx: boolean;
  mxRecords?: string[];
  isValid: boolean;
  isRoleAccount?: boolean;
  isPublicDomain?: boolean;
  didYouMean?: string | null;
  blocklisted?: boolean;
}

@Injectable()
export class MailidatorService {
  private readonly logger = new Logger(MailidatorService.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>("MAILIDATOR_API_KEY")?.trim());
  }

  async validateSignupEmail(email: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const result = await this.validateEmail(email);

    if (result.isDisposable) {
      throw new BadRequestException("Temporary or disposable email addresses are not allowed.");
    }

    if (result.isForwarded) {
      throw new BadRequestException("Email forwarding or alias inboxes are not allowed for signup.");
    }

    if (result.blocklisted) {
      throw new BadRequestException("This email address is blocked. Please use a different address.");
    }

    if (!result.hasMx || !result.isValid) {
      const suggestion =
        result.didYouMean && result.didYouMean.trim().length > 0
          ? ` Did you mean ${result.didYouMean}?`
          : "";
      throw new BadRequestException(`Please enter a valid email address.${suggestion}`);
    }
  }

  private async validateEmail(email: string): Promise<MailidatorResponse> {
    const controller = new AbortController();
    const timeoutMs = this.configService.get<number>("MAILIDATOR_TIMEOUT_MS", 4000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const apiKey = this.configService.getOrThrow<string>("MAILIDATOR_API_KEY");
      const response = await fetch("https://mailidator.com/api/v1/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });

      const payload = (await response.json().catch(() => null)) as
        | MailidatorResponse
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        const message =
          (payload && "message" in payload && typeof payload.message === "string" && payload.message) ||
          (payload && "error" in payload && typeof payload.error === "string" && payload.error) ||
          "Mailidator email validation failed.";
        throw new ServiceUnavailableException(message);
      }

      if (!payload || !("email" in payload)) {
        throw new ServiceUnavailableException("Mailidator returned an unexpected validation response.");
      }

      return payload as MailidatorResponse;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(`Mailidator validation failed for ${email}: ${error instanceof Error ? error.message : "unknown error"}`);
      throw new ServiceUnavailableException("Email validation is temporarily unavailable. Please try again.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
