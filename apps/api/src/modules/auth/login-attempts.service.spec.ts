import { HttpException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginAttemptsService } from "./login-attempts.service";

const IP = "192.168.1.50";

function expectTooManyRequests(fn: () => void): void {
  expect.assertions(2);
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
  }
}

describe("LoginAttemptsService", () => {
  let service: LoginAttemptsService;

  beforeEach(() => {
    service = new LoginAttemptsService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T10:00:00.000Z"));
  });

  it("no bloquea una IP sin historial", () => {
    expect(() => service.assertNotBlocked(IP)).not.toThrow();
  });

  it("no bloquea con menos de 5 fallos en la ventana de 10 minutos", () => {
    for (let i = 0; i < 4; i++) {
      service.registerFailure(IP);
    }
    expect(() => service.assertNotBlocked(IP)).not.toThrow();
  });

  it("bloquea tras 5 fallos en 10 minutos", () => {
    for (let i = 0; i < 5; i++) {
      service.registerFailure(IP);
    }
    expectTooManyRequests(() => service.assertNotBlocked(IP));
  });

  it("el bloqueo dura 15 minutos y luego se libera", () => {
    for (let i = 0; i < 5; i++) {
      service.registerFailure(IP);
    }
    expect(() => service.assertNotBlocked(IP)).toThrow();

    vi.setSystemTime(new Date("2026-07-27T10:14:00.000Z"));
    expect(() => service.assertNotBlocked(IP)).toThrow();

    vi.setSystemTime(new Date("2026-07-27T10:16:00.000Z"));
    expect(() => service.assertNotBlocked(IP)).not.toThrow();
  });

  it("un login exitoso limpia el conteo de fallos", () => {
    for (let i = 0; i < 4; i++) {
      service.registerFailure(IP);
    }
    service.registerSuccess(IP);
    service.registerFailure(IP);
    expect(() => service.assertNotBlocked(IP)).not.toThrow();
  });

  it("fallos fuera de la ventana de 10 minutos no acumulan", () => {
    for (let i = 0; i < 4; i++) {
      service.registerFailure(IP);
    }
    vi.setSystemTime(new Date("2026-07-27T10:11:00.000Z"));
    service.registerFailure(IP);
    expect(() => service.assertNotBlocked(IP)).not.toThrow();
  });

  it("no afecta a otras IPs", () => {
    for (let i = 0; i < 5; i++) {
      service.registerFailure(IP);
    }
    expect(() => service.assertNotBlocked("10.0.0.1")).not.toThrow();
  });
});
