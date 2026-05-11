import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";

import { MailidatorService } from "./mailidator.service";

describe("MailidatorService", () => {
  const originalFetch = global.fetch;

  function createService(overrides?: Record<string, unknown>) {
    const configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          MAILIDATOR_API_KEY: "eid_test_key",
          MAILIDATOR_TIMEOUT_MS: 4000
        };
        return key in values ? values[key] : fallback;
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          MAILIDATOR_API_KEY: "eid_test_key"
        };
        return values[key];
      }),
      ...(overrides ?? {})
    } as any;

    return new MailidatorService(configService);
  }

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("allows valid non-disposable emails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        email: "client@example.com",
        domain: "example.com",
        isDisposable: false,
        isForwarded: false,
        hasMx: true,
        isValid: true,
        blocklisted: false
      })
    }) as any;

    await expect(createService().validateSignupEmail("client@example.com")).resolves.toBeUndefined();
  });

  it("rejects disposable addresses", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        email: "temp@example.com",
        domain: "tempmail.com",
        isDisposable: true,
        isForwarded: false,
        hasMx: true,
        isValid: false
      })
    }) as any;

    await expect(createService().validateSignupEmail("temp@example.com")).rejects.toThrow(
      BadRequestException
    );
  });

  it("surfaces suggestions for invalid addresses", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        email: "hadidiab33@gmial.com",
        domain: "gmial.com",
        isDisposable: false,
        isForwarded: false,
        hasMx: false,
        isValid: false,
        didYouMean: "hadidiab33@gmail.com"
      })
    }) as any;

    await expect(createService().validateSignupEmail("hadidiab33@gmial.com")).rejects.toThrow(
      "Did you mean hadidiab33@gmail.com?"
    );
  });

  it("throws service unavailable when Mailidator responds with an upstream error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        message: "Monthly query limit reached"
      })
    }) as any;

    await expect(createService().validateSignupEmail("client@example.com")).rejects.toThrow(
      ServiceUnavailableException
    );
  });

  it("skips validation when Mailidator is not configured", async () => {
    const service = createService({
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === "MAILIDATOR_API_KEY") {
          return undefined;
        }
        return fallback;
      })
    });
    global.fetch = jest.fn();

    await expect(service.validateSignupEmail("client@example.com")).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
