import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface MailRecipient {
  email: string;
  name?: string;
}

interface SendMailInput {
  to: MailRecipient[];
  subject: string;
  textContent: string;
  replyTo?: MailRecipient;
}

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>("BREVO_API_KEY")?.trim());
  }

  async sendEmail(payload: SendMailInput): Promise<void> {
    const apiKey = this.configService.get<string>("BREVO_API_KEY")?.trim();
    const senderEmail = this.configService.get<string>("CONTACT_FROM_EMAIL", "no-reply@drapeon.test");
    const senderName = this.configService.get<string>("CONTACT_FROM_NAME", "Drapeon");

    if (!apiKey) {
      throw new ServiceUnavailableException("Email delivery is not configured.");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: senderName
        },
        to: payload.to,
        replyTo: payload.replyTo,
        subject: payload.subject,
        textContent: payload.textContent
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Could not send email right now.");
    }
  }
}
