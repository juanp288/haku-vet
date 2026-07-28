import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { AuthUser } from "@vetclinic/contracts";
import type { User } from "@vetclinic/db";
import { AuditService } from "../../common/audit/audit.service";
import type { JwtPayload } from "../../common/auth.constants";
import { AuthRepository } from "./auth.repository";
import { LoginAttemptsService } from "./login-attempts.service";

const INVALID_CREDENTIALS_MESSAGE = "Correo o contraseña incorrectos.";

export interface AuthResult {
  user: AuthUser;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string, ip: string): Promise<AuthResult> {
    this.loginAttempts.assertNotBlocked(ip);

    const user = await this.authRepository.findByEmail(email);
    const isValid =
      !!user && user.isActive && (await bcrypt.compare(password, user.passwordHash));

    if (!user || !isValid) {
      this.loginAttempts.registerFailure(ip);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    this.loginAttempts.registerSuccess(ip);
    await this.authRepository.touchLastLogin(user.id);
    await this.auditService.record({
      userId: user.id,
      action: "LOGIN",
      entityName: "User",
      entityId: user.id,
      ipAddress: ip,
    });

    return { user: this.toAuthUser(user), token: this.signToken(user) };
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.authRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("La sesión ya no es válida.");
    }
    return this.toAuthUser(user);
  }

  async refresh(userId: string): Promise<AuthResult> {
    const user = await this.authRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("La sesión ya no es válida.");
    }
    return { user: this.toAuthUser(user), token: this.signToken(user) };
  }

  private signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
