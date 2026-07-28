import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ACCESS_TOKEN_TTL } from "../../common/auth.constants";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { LoginAttemptsService } from "./login-attempts.service";

@Module({
  imports: [
    // global: true — JwtAuthGuard se registra a nivel de app (APP_GUARD) y
    // necesita JwtService disponible ahí, fuera del árbol de AuthModule.
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, LoginAttemptsService],
})
export class AuthModule {}
