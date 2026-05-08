import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ContactMessageDto } from "./dto/contact-message.dto";

@Injectable()
export class ContactService {
  constructor(private readonly configService: ConfigService) {}

  async sendMessage(payload: ContactMessageDto) {
    const apiKey = this.configService.get<string>("BREVO_API_KEY")?.trim();
    const toEmail = this.configService.get<string>("CONTACT_TO_EMAIL", "hello@drapeon.test");
    const senderEmail = this.configService.get<string>("CONTACT_FROM_EMAIL", "no-reply@drapeon.test");
    const senderName = this.configService.get<string>("CONTACT_FROM_NAME", "Drapeon Contact");

    if (!apiKey) {
      return {
        delivered: false,
        provider: "brevo",
        message: "Contact email is not configured yet. Add BREVO_API_KEY to enable delivery."
      };
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
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
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Could not send contact message right now.");
    }

    return {
      delivered: true,
      provider: "brevo",
      message: "Message sent. The Drapeon team will reply by email."
    };
  }
}
