import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { BecomeDesignerDto } from "./dto/become-designer.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Post("login")
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Post("refresh")
  refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refreshTokens(payload);
  }

  @Post("verify-email")
  verifyEmail(@Body() payload: VerifyEmailDto) {
    return this.authService.verifyEmail(payload);
  }

  @Post("forgot-password")
  forgotPassword(@Body() payload: ForgotPasswordDto) {
    return this.authService.forgotPassword(payload);
  }

  @Post("reset-password")
  resetPassword(@Body() payload: ResetPasswordDto) {
    return this.authService.resetPassword(payload);
  }

  @Post("become-designer")
  @UseGuards(JwtAuthGuard)
  becomeDesigner(@CurrentUser("sub") userId: string, @Body() payload: BecomeDesignerDto) {
    return this.authService.becomeDesigner(userId, payload);
  }
}
