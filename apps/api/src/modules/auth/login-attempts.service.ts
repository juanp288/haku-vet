import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

interface AttemptRecord {
  count: number;
  windowStart: number;
  blockedUntil: number | null;
}

/**
 * Bloqueo de fuerza bruta por IP (A1 / RN implícita del doc de historias):
 * 5 intentos fallidos en 10 minutos bloquean 15 minutos. En memoria — la
 * escala de la clínica (2 a 6 usuarios) no justifica Redis.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, AttemptRecord>();
  private lastSweepAt = Date.now();

  assertNotBlocked(ip: string): void {
    this.sweepIfDue();
    const record = this.attempts.get(ip);
    if (record?.blockedUntil && record.blockedUntil > Date.now()) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Demasiados intentos fallidos. Intente de nuevo en unos minutos.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  registerFailure(ip: string): void {
    const now = Date.now();
    const record = this.attempts.get(ip);

    if (!record || now - record.windowStart > WINDOW_MS) {
      this.attempts.set(ip, { count: 1, windowStart: now, blockedUntil: null });
      return;
    }

    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_MS;
    }
  }

  registerSuccess(ip: string): void {
    this.attempts.delete(ip);
  }

  private sweepIfDue(): void {
    const now = Date.now();
    if (now - this.lastSweepAt < SWEEP_INTERVAL_MS) {
      return;
    }
    this.lastSweepAt = now;
    for (const [ip, record] of this.attempts) {
      const stillBlocked = record.blockedUntil !== null && record.blockedUntil > now;
      const withinWindow = now - record.windowStart <= WINDOW_MS;
      if (!stillBlocked && !withinWindow) {
        this.attempts.delete(ip);
      }
    }
  }
}
