import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { DesignerApprovalStatus, UserRole } from "@prisma/client";

import { StripeConnectService } from "../../integrations/stripe/stripe-connect.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto, RegistrationRole } from "./dto/register.dto";
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
  };
  tokens: AuthTokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly stripeConnectService: StripeConnectService
  ) {}

  async register(payload: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true }
    });

    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

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
            lastName: payload.lastName
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
        role: user.role
      },
      tokens
    };
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        role: true,
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
        role: user.role
      },
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

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }
}
