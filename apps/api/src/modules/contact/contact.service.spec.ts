import { ServiceUnavailableException } from "@nestjs/common";

import { MailService } from "../../integrations/mail/mail.service";
import { ContactService } from "./contact.service";

function config(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback)
  };
}

describe("ContactService", () => {
  const payload = {
    name: "Maya Haddad",
    email: "maya@example.com",
    topic: "Designer onboarding",
    message: "I would like help onboarding my designer store."
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a configuration response when Brevo is not configured", async () => {
    const service = new ContactService(config({}) as any, {
      isConfigured: jest.fn(() => false)
    } as unknown as MailService);

    await expect(service.sendMessage(payload)).resolves.toEqual({
      delivered: false,
      provider: "brevo",
      message: "Contact email is not configured yet. Add BREVO_API_KEY to enable delivery."
    });
  });

  it("sends contact messages through Brevo when configured", async () => {
    const sendEmail = jest.fn().mockResolvedValue(undefined);
    const service = new ContactService(config({ CONTACT_TO_EMAIL: "team@example.com" }) as any, {
      isConfigured: jest.fn(() => true),
      sendEmail
    } as unknown as MailService);

    await expect(service.sendMessage(payload)).resolves.toEqual({
      delivered: true,
      provider: "brevo",
      message: "Message sent. The Drapeon team will reply by email."
    });
    expect(sendEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: [{ email: "team@example.com" }],
        replyTo: { email: payload.email, name: payload.name }
      })
    );
    expect(sendEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: [{ email: payload.email, name: payload.name }],
        subject: "We received your Drapeon message"
      })
    );
  });

  it("surfaces delivery failures", async () => {
    const service = new ContactService(config({}) as any, {
      isConfigured: jest.fn(() => true),
      sendEmail: jest.fn().mockRejectedValue(new ServiceUnavailableException())
    } as unknown as MailService);

    await expect(service.sendMessage(payload)).rejects.toThrow(ServiceUnavailableException);
  });
});
