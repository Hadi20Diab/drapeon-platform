import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { MailService } from "../../integrations/mail/mail.service";
import { ContactMessageDto } from "./dto/contact-message.dto";

@Injectable()
export class ContactService {
  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService
  ) {}

  async sendMessage(payload: ContactMessageDto) {
    const toEmail = this.configService.get<string>("CONTACT_TO_EMAIL", "hello@drapeon.test");

    if (!this.mailService.isConfigured()) {
      return {
        delivered: false,
        provider: "brevo",
        message: "Contact email is not configured yet. Add BREVO_API_KEY to enable delivery."
      };
    }

    try {
      await this.mailService.sendEmail({
        to: [{ email: toEmail }],
        replyTo: { email: payload.email, name: payload.name },
        subject: `Drapeon contact: ${payload.topic}`,
        textContent: [
          `Name: ${payload.name}`,
          `Email: ${payload.email}`,
          `Topic: ${payload.topic}`,
          "",
          payload.message
        ].join("\n")
      });

      await this.mailService.sendEmail({
        to: [{ email: payload.email, name: payload.name }],
        subject: "We received your Drapeon message",
        textContent: [
          `Hi ${payload.name},`,
          "",
          "Thanks for reaching out to Drapeon.",
          `We received your message about "${payload.topic}" and our team will reply as soon as possible.`,
          "",
          "For reference, here is a copy of your message:",
          payload.message,
          "",
          "Best,",
          "Drapeon"
        ].join("\n")
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw new ServiceUnavailableException("Could not send contact message right now.");
      }

      throw error;
    }

    return {
      delivered: true,
      provider: "brevo",
      message: "Message sent. The Drapeon team will reply by email."
    };
  }
}
