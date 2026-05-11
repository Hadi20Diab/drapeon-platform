import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { DesignerApprovalStatus, Prisma, UserRole } from "@prisma/client";

import { MailidatorService } from "../../integrations/email-validation/mailidator.service";
import { MailService } from "../../integrations/mail/mail.service";
import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { BecomeDesignerDto } from "./dto/become-designer.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto, RegistrationRole } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { AuthJwtPayload } from "./interfaces/auth-jwt-payload.interface";

interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: AuthJwtPayload["role"];
    isEmailVerified: boolean;
  };
  tokens: AuthTokenPair;
  verificationEmailSent?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly mailService: MailService,
    private readonly mailidatorService: MailidatorService
  ) {}

  async register(payload: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true }
    });

    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

    await this.mailidatorService.validateSignupEmail(payload.email);

    const role = payload.role === RegistrationRole.DESIGNER ? UserRole.DESIGNER : UserRole.USER;
    const passwordHash = this.hashPassword(payload.password);
    const slugBase = `${payload.firstName}-${payload.lastName}`.toLowerCase();
    const stripeAccount =
      role === UserRole.DESIGNER
        ? await this.stripeConnectService.createDesignerAccount({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName
          })
        : null;
    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        role,
        profile: {
          create: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            measurements: {
              create: this.toMeasurementCreateInput(payload.measurements)
            }
          }
        },
        ...(role === UserRole.DESIGNER
          ? {
              designerProfile: {
                create: {
                  storeName: `${payload.firstName} ${payload.lastName} Atelier`,
                  slug: `${this.toSlug(slugBase)}-${randomUUID().slice(0, 8)}`,
                  bio: "Designer profile initialized during registration",
                  stripeAccountId: stripeAccount?.id,
                  stripeAccountCreatedAt: stripeAccount ? new Date() : undefined,
                  approvalStatus: DesignerApprovalStatus.PENDING
                }
              }
            }
          : {})
      }
    });
    const verificationEmailSent = await this.dispatchVerificationEmail(user.id, payload.email, payload.firstName);
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
      tokens,
      verificationEmailSent
    };
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        passwordHash: true
      }
    });

    if (!user || !this.verifyPassword(payload.password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
      tokens
    };
  }

  async becomeDesigner(userId: string, payload: BecomeDesignerDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        designerProfile: {
          select: {
            id: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException("Account not found");
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException("Admin accounts cannot be converted into designer accounts.");
    }

    if (user.designerProfile || user.role === UserRole.DESIGNER) {
      throw new ConflictException("You already have a designer application. Open your designer dashboard instead.");
    }

    const stripeAccount = await this.stripeConnectService.createDesignerAccount({
      email: user.email,
      firstName: user.profile?.firstName ?? "Designer",
      lastName: user.profile?.lastName ?? "Account"
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: UserRole.DESIGNER,
        designerProfile: {
          create: {
            storeName: payload.storeName,
            slug: `${this.toSlug(payload.storeName)}-${randomUUID().slice(0, 8)}`,
            bio: payload.description,
            location: payload.location,
            brandColor: payload.brandColor,
            websiteUrl: payload.websiteUrl,
            instagramUrl: payload.instagramUrl,
            stripeAccountId: stripeAccount?.id,
            stripeAccountCreatedAt: stripeAccount ? new Date() : undefined,
            approvalStatus: DesignerApprovalStatus.PENDING
          }
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true
      }
    });

    const tokens = await this.issueTokens({
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role
    });
    await this.persistRefreshToken(updatedUser.id, tokens.refreshToken);

    return {
      user: updatedUser,
      tokens
    };
  }

  async refreshTokens(payload: RefreshTokenDto): Promise<AuthTokenPair> {
    try {
      const decoded = await this.jwtService.verifyAsync<AuthJwtPayload>(payload.refreshToken, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET")
      });
      await this.validateAndRotateRefreshToken(decoded.sub, payload.refreshToken);
      return this.issueTokens(decoded);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async verifyEmail(payload: VerifyEmailDto): Promise<{ verified: boolean; message: string }> {
    const tokenHash = this.hashToken(payload.token);
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            isEmailVerified: true
          }
        }
      }
    });

    if (!this.hasUsableToken(tokenRecord)) {
      throw new UnauthorizedException("Verification link is invalid or has expired.");
    }
    const verificationToken = tokenRecord as NonNullable<typeof tokenRecord>;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { isEmailVerified: true }
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { consumedAt: new Date() }
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: {
          userId: verificationToken.userId,
          id: { not: verificationToken.id },
          consumedAt: null
        },
        data: { consumedAt: new Date() }
      })
    ]);

    return {
      verified: true,
      message: verificationToken.user.isEmailVerified
        ? "Email address is already verified."
        : "Email address verified successfully."
    };
  }

  async forgotPassword(payload: ForgotPasswordDto): Promise<{ delivered: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { profile: { select: { firstName: true } } }
    });

    if (!user) {
      return {
        delivered: true,
        message: "If an account exists for this email, a reset link has been sent."
      };
    }

    const token = await this.issueOneTimeToken("password-reset", user.id);
    const delivered = await this.sendPasswordResetEmail(
      user.email,
      user.profile?.firstName ?? "there",
      token.rawToken
    );

    return {
      delivered,
      message: delivered
        ? "If an account exists for this email, a reset link has been sent."
        : "Password reset email is not configured yet."
    };
  }

  async resetPassword(payload: ResetPasswordDto): Promise<{ reset: boolean; message: string }> {
    const tokenHash = this.hashToken(payload.token);
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    if (!this.hasUsableToken(tokenRecord)) {
      throw new UnauthorizedException("Reset link is invalid or has expired.");
    }
    const resetToken = tokenRecord as NonNullable<typeof tokenRecord>;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: this.hashPassword(payload.password) }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumedAt: new Date() }
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
          consumedAt: null
        },
        data: { consumedAt: new Date() }
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      })
    ]);

    return {
      reset: true,
      message: "Password updated successfully."
    };
  }

  private async issueTokens(payload: AuthJwtPayload): Promise<AuthTokenPair> {
    const accessTtl = this.configService.getOrThrow<number>("JWT_ACCESS_TTL");
    const refreshTtl = this.configService.getOrThrow<number>("JWT_REFRESH_TTL");

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: accessTtl }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: refreshTtl
      })
    ]);

    return {
      accessToken,
      refreshToken
    };
  }

  private async validateAndRotateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = this.hashToken(refreshToken);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashedToken }
    });

    if (!tokenRecord || tokenRecord.userId !== userId || tokenRecord.revokedAt != null) {
      throw new UnauthorizedException("Refresh token has been revoked");
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() }
    });
  }

  private async persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTtl = this.configService.getOrThrow<number>("JWT_REFRESH_TTL");

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000)
      }
    });
  }

  private hashToken(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private toMeasurementCreateInput(
    measurements: RegisterDto["measurements"]
  ): Prisma.BodyMeasurementUncheckedCreateWithoutProfileInput {
    return {
      bodyShape: measurements.bodyShape,
      heightCm: measurements.heightCm,
      weightKg: measurements.weightKg,
      chestCm: measurements.chestCm,
      waistCm: measurements.waistCm,
      hipCm: measurements.hipCm,
      shoulderCm: measurements.shoulderCm,
      inseamCm: measurements.inseamCm,
      notes: measurements.notes
    };
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const digest = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${digest}`;
  }

  private verifyPassword(password: string, passwordHash: string): boolean {
    const [salt, storedDigest] = passwordHash.split(":");

    if (!salt || !storedDigest) {
      return false;
    }

    const candidateDigest = scryptSync(password, salt, 64).toString("hex");
    const storedBuffer = Buffer.from(storedDigest, "hex");
    const candidateBuffer = Buffer.from(candidateDigest, "hex");

    if (storedBuffer.length !== candidateBuffer.length) {
      return false;
    }

    return timingSafeEqual(storedBuffer, candidateBuffer);
  }

  private async dispatchVerificationEmail(
    userId: string,
    email: string,
    firstName: string
  ): Promise<boolean> {
    const token = await this.issueOneTimeToken("email-verification", userId);
    return this.sendVerificationEmail(email, firstName, token.rawToken);
  }

  private async issueOneTimeToken(
    type: "email-verification" | "password-reset",
    userId: string
  ): Promise<{ rawToken: string }> {
    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() +
        this.configService.getOrThrow<number>(
          type === "email-verification" ? "EMAIL_VERIFICATION_TTL" : "PASSWORD_RESET_TTL"
        ) *
          1000
    );

    if (type === "email-verification") {
      await this.prisma.emailVerificationToken.deleteMany({
        where: {
          userId,
          consumedAt: null
        }
      });
      await this.prisma.emailVerificationToken.create({
        data: {
          userId,
          tokenHash: this.hashToken(rawToken),
          expiresAt
        }
      });
    } else {
      await this.prisma.passwordResetToken.deleteMany({
        where: {
          userId,
          consumedAt: null
        }
      });
      await this.prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash: this.hashToken(rawToken),
          expiresAt
        }
      });
    }

    return { rawToken };
  }

  private async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string
  ): Promise<boolean> {
    if (!this.mailService.isConfigured()) {
      return false;
    }

    const verifyUrl = this.buildWebUrl(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    await this.mailService.sendEmail({
      to: [{ email, name: firstName }],
      subject: "Verify your Drapeon account",
      textContent: [
        `Hi ${firstName},`,
        "",
        "Welcome to Drapeon.",
        "Verify your email address to confirm your account:",
        verifyUrl,
        "",
        "If you did not create this account, you can ignore this message."
      ].join("\n")
    });

    return true;
  }

  private async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string
  ): Promise<boolean> {
    if (!this.mailService.isConfigured()) {
      return false;
    }

    const resetUrl = this.buildWebUrl(`/auth/reset-password?token=${encodeURIComponent(token)}`);
    await this.mailService.sendEmail({
      to: [{ email, name: firstName }],
      subject: "Reset your Drapeon password",
      textContent: [
        `Hi ${firstName},`,
        "",
        "We received a request to reset your password.",
        "Use the link below to choose a new password:",
        resetUrl,
        "",
        "If you did not request this change, you can ignore this message."
      ].join("\n")
    });

    return true;
  }

  private buildWebUrl(path: string): string {
    const origin = this.configService.get<string>("WEB_ORIGIN") ?? "http://localhost:5173";
    return new URL(path, origin).toString();
  }

  private hasUsableToken(
    tokenRecord:
      | {
          expiresAt: Date;
          consumedAt: Date | null;
        }
      | null
      | undefined
  ): boolean {
    return Boolean(
      tokenRecord &&
        tokenRecord.consumedAt == null &&
        tokenRecord.expiresAt.getTime() >= Date.now()
    );
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }
}
