import { ServiceUnavailableException } from "@nestjs/common";

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
    const service = new ContactService(config({}) as any);

    await expect(service.sendMessage(payload)).resolves.toEqual({
      delivered: false,
      provider: "brevo",
      message: "Contact email is not configured yet. Add BREVO_API_KEY to enable delivery."
    });
  });

  it("sends contact messages through Brevo when configured", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    const service = new ContactService(
      config({
        BREVO_API_KEY: "brevo-key",
        CONTACT_TO_EMAIL: "team@example.com",
        CONTACT_FROM_EMAIL: "no-reply@example.com",
        CONTACT_FROM_NAME: "Drapeon"
      }) as any
    );

    await expect(service.sendMessage(payload)).resolves.toEqual({
      delivered: true,
      provider: "brevo",
      message: "Message sent. The Drapeon team will reply by email."
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "api-key": "brevo-key" })
      })
    );
  });

  it("surfaces delivery failures", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);
    const service = new ContactService(config({ BREVO_API_KEY: "brevo-key" }) as any);

    await expect(service.sendMessage(payload)).rejects.toThrow(ServiceUnavailableException);
  });
});
