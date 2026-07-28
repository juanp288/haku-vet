import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@vetclinic/db";
import type { AuditService } from "../../common/audit/audit.service";
import { AuthService } from "./auth.service";
import type { AuthRepository } from "./auth.repository";
import type { LoginAttemptsService } from "./login-attempts.service";

const { compareMock } = vi.hoisted(() => ({
  compareMock: vi.fn<(data: string, encrypted: string) => Promise<boolean>>(),
}));
vi.mock("bcrypt", () => ({ compare: compareMock }));

const IP = "192.168.1.10";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_1",
    email: "camila.torres@vetclinica.co",
    passwordHash: "hashed",
    fullName: "Camila Torres",
    role: "VETERINARIO",
    licenseNumber: null,
    color: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("AuthService", () => {
  let repository: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    touchLastLogin: ReturnType<typeof vi.fn>;
  };
  let loginAttempts: {
    assertNotBlocked: ReturnType<typeof vi.fn>;
    registerFailure: ReturnType<typeof vi.fn>;
    registerSuccess: ReturnType<typeof vi.fn>;
  };
  let audit: { record: ReturnType<typeof vi.fn> };
  let jwtService: { sign: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    repository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      touchLastLogin: vi.fn(),
    };
    loginAttempts = {
      assertNotBlocked: vi.fn(),
      registerFailure: vi.fn(),
      registerSuccess: vi.fn(),
    };
    audit = { record: vi.fn() };
    jwtService = { sign: vi.fn().mockReturnValue("signed.jwt.token") };
    compareMock.mockReset();

    service = new AuthService(
      repository as unknown as AuthRepository,
      loginAttempts as unknown as LoginAttemptsService,
      audit as unknown as AuditService,
      jwtService as unknown as JwtService,
    );
  });

  describe("login", () => {
    it("con credenciales válidas devuelve el usuario y un token, y registra auditoría", async () => {
      const user = buildUser();
      repository.findByEmail.mockResolvedValue(user);
      compareMock.mockResolvedValue(true);

      const result = await service.login(user.email, "correcta", IP);

      expect(result).toEqual({
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
        token: "signed.jwt.token",
      });
      expect(loginAttempts.assertNotBlocked).toHaveBeenCalledWith(IP);
      expect(loginAttempts.registerSuccess).toHaveBeenCalledWith(IP);
      expect(repository.touchLastLogin).toHaveBeenCalledWith(user.id);
      expect(audit.record).toHaveBeenCalledWith({
        userId: user.id,
        action: "LOGIN",
        entityName: "User",
        entityId: user.id,
        ipAddress: IP,
      });
    });

    it("con contraseña incorrecta lanza el mensaje genérico y cuenta como fallo", async () => {
      const user = buildUser();
      repository.findByEmail.mockResolvedValue(user);
      compareMock.mockResolvedValue(false);

      await expect(service.login(user.email, "mala", IP)).rejects.toThrow(
        new UnauthorizedException("Correo o contraseña incorrectos."),
      );
      expect(loginAttempts.registerFailure).toHaveBeenCalledWith(IP);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it("con un correo que no existe lanza el mismo mensaje genérico", async () => {
      repository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login("no-existe@vetclinica.co", "cualquiera", IP),
      ).rejects.toThrow(new UnauthorizedException("Correo o contraseña incorrectos."));
      expect(loginAttempts.registerFailure).toHaveBeenCalledWith(IP);
      // bcrypt no debe correr contra un hash inexistente
      expect(compareMock).not.toHaveBeenCalled();
    });

    it("un usuario inactivo no entra aunque la contraseña sea correcta", async () => {
      const user = buildUser({ isActive: false });
      repository.findByEmail.mockResolvedValue(user);
      compareMock.mockResolvedValue(true);

      await expect(service.login(user.email, "correcta", IP)).rejects.toThrow(
        new UnauthorizedException("Correo o contraseña incorrectos."),
      );
      expect(loginAttempts.registerFailure).toHaveBeenCalledWith(IP);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it("propaga el bloqueo por intentos fallidos antes de tocar la contraseña", async () => {
      loginAttempts.assertNotBlocked.mockImplementation(() => {
        throw new Error("bloqueado");
      });

      await expect(service.login("x@x.co", "y", IP)).rejects.toThrow("bloqueado");
      expect(repository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentUser", () => {
    it("devuelve los datos del usuario activo", async () => {
      const user = buildUser();
      repository.findById.mockResolvedValue(user);

      await expect(service.getCurrentUser(user.id)).resolves.toEqual({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });
    });

    it("rechaza si el usuario fue desactivado", async () => {
      repository.findById.mockResolvedValue(buildUser({ isActive: false }));
      await expect(service.getCurrentUser("user_1")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rechaza si el usuario ya no existe", async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getCurrentUser("user_1")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("refresh", () => {
    it("reemite un token nuevo con los datos frescos del usuario", async () => {
      const user = buildUser();
      repository.findById.mockResolvedValue(user);

      const result = await service.refresh(user.id);

      expect(result.token).toBe("signed.jwt.token");
      expect(result.user.role).toBe(user.role);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
    });
  });
});
