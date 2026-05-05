import { randomUUID } from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(payload: RegisterDto): Promise<AuthResponse> {
    const userId = randomUUID();
    const role: AuthJwtPayload["role"] = payload.role ?? RegistrationRole.USER;
    const tokens = await this.issueTokens({
      sub: userId,
      email: payload.email,
      role
    });

    return {
      user: {
        id: userId,
        email: payload.email,
        role
      },
      tokens
    };
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const userId = randomUUID();
    const role: AuthJwtPayload["role"] = "USER";
    const tokens = await this.issueTokens({
      sub: userId,
      email: payload.email,
      role
    });

    return {
      user: {
        id: userId,
        email: payload.email,
        role
      },
      tokens
    };
  }

  async refreshTokens(payload: RefreshTokenDto): Promise<AuthTokenPair> {
    try {
      const decoded = await this.jwtService.verifyAsync<AuthJwtPayload>(payload.refreshToken, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET")
      });
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
}
