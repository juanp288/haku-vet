import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UsePipes,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { loginSchema, type AuthUser, type LoginInput } from "@vetclinic/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_MS,
  type JwtPayload,
} from "../../common/auth.constants";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { user, token } = await this.authService.login(
      body.email,
      body.password,
      req.ip ?? "unknown",
    );
    this.setAuthCookie(res, token);
    return user;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    return { ok: true };
  }

  @Get("me")
  me(@CurrentUser() user: JwtPayload): Promise<AuthUser> {
    return this.authService.getCurrentUser(user.sub);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { user: freshUser, token } = await this.authService.refresh(user.sub);
    this.setAuthCookie(res, token);
    return freshUser;
  }

  private setAuthCookie(res: Response, token: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      // LAN sin TLS en v1 — HTTPS llega con la migración a la nube (doc 05 §10).
      secure: false,
      maxAge: ACCESS_TOKEN_TTL_MS,
    });
  }
}
