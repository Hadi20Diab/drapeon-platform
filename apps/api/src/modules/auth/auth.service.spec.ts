import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { AuthService } from "./auth.service";
import { RegistrationRole } from "./dto/register.dto";

describe("AuthService", () => {
  const baseRegisterPayload = {
    email: "client@example.com",
    password: "pass12345",
    firstName: "Maya",
    lastName: "Haddad",
    role: RegistrationRole.USER,
    measurements: {
      heightCm: 172,
      weightKg: 61,
      chestCm: 90,
      waistCm: 70,
      hipCm: 96,
      shoulderCm: 42,
      inseamCm: 78,
      notes: "Prefers tailored fits"
    }
  };

  function createService(overrides?: Partial<Record<string, unknown>>) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "user-1",
          email: baseRegisterPayload.email,
          role: UserRole.USER,
          isEmailVerified: false
        }),
        update: jest.fn()
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      },
      emailVerificationToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      },
      passwordResetToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      },
      $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
      ...(overrides ?? {})
    } as any;

    const jwtService = {
      signAsync: jest.fn().mockResolvedValueOnce("access-token").mockResolvedValueOnce("refresh-token"),
      verifyAsync: jest.fn()
    } as any;
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          JWT_ACCESS_TTL: 900,
          JWT_REFRESH_SECRET: "refresh_secret_value_that_is_long_enough",
          JWT_REFRESH_TTL: 2_592_000,
          EMAIL_VERIFICATION_TTL: 86_400,
          PASSWORD_RESET_TTL: 3_600
        };
        return values[key];
      }),
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          WEB_ORIGIN: "http://localhost:5173"
        };
        return values[key];
      })
    } as any;
    const stripeConnectService = {
      createDesignerAccount: jest.fn().mockResolvedValue({ id: "acct_123" })
    } as any;
    const mailService = {
      isConfigured: jest.fn(() => true),
      sendEmail: jest.fn().mockResolvedValue(undefined)
    } as any;

    return {
      prisma,
      jwtService,
      stripeConnectService,
      mailService,
      service: new AuthService(prisma, jwtService, configService, stripeConnectService, mailService)
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("stores body measurements and sends verification mail during registration", async () => {
    const { service, prisma, mailService } = createService();

    const result = await service.register(baseRegisterPayload);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profile: {
            create: expect.objectContaining({
              measurements: {
                create: expect.objectContaining({
                  heightCm: 172,
                  waistCm: 70
                })
              }
            })
          }
        })
      })
    );
    expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
    expect(mailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Verify your Drapeon account"
      })
    );
    expect(result.user.isEmailVerified).toBe(false);
    expect(result.verificationEmailSent).toBe(true);
  });

  it("rejects duplicate email registration", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

    await expect(service.register(baseRegisterPayload)).rejects.toThrow(ConflictException);
  });

  it("verifies email tokens and marks the user as verified", async () => {
    const { service, prisma } = createService();
    prisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: "verify-token-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 10_000),
      consumedAt: null,
      user: {
        id: "user-1",
        isEmailVerified: false
      }
    });
    prisma.user.update.mockResolvedValue({});
    prisma.emailVerificationToken.update.mockResolvedValue({});
    prisma.emailVerificationToken.updateMany.mockResolvedValue({});

    await expect(service.verifyEmail({ token: "v".repeat(64) })).resolves.toEqual({
      verified: true,
      message: "Email address verified successfully."
    });
  });

  it("issues password reset emails without leaking account existence", async () => {
    const { service, prisma, mailService } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "client@example.com",
      profile: { firstName: "Maya" }
    });

    await expect(service.forgotPassword({ email: "client@example.com" })).resolves.toEqual({
      delivered: true,
      message: "If an account exists for this email, a reset link has been sent."
    });
    expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    expect(mailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Reset your Drapeon password"
      })
    );
  });

  it("resets passwords and revokes active refresh tokens", async () => {
    const { service, prisma } = createService();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset-token-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 10_000),
      consumedAt: null
    });
    prisma.user.update.mockResolvedValue({});
    prisma.passwordResetToken.update.mockResolvedValue({});
    prisma.passwordResetToken.updateMany.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({});

    await expect(
      service.resetPassword({
        token: "r".repeat(64),
        password: "newpassword123"
      })
    ).resolves.toEqual({
      reset: true,
      message: "Password updated successfully."
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });

  it("rejects invalid reset tokens", async () => {
    const { service, prisma } = createService();
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        token: "r".repeat(64),
        password: "newpassword123"
      })
    ).rejects.toThrow(UnauthorizedException);
  });
});
