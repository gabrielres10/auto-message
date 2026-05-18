import { EventEmitter } from "events";
import { Client, LocalAuth } from "whatsapp-web.js";
import { db } from "../lib/db";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";
import type { ClientState, SessionPatch } from "./types";

// QR codes issued by WhatsApp expire after ~20 seconds.
const QR_TTL_MS = 20_000;

// Reconnect backoff: 5 s, 10 s, 20 s, 40 s, 80 s … capped at 2 min.
const RECONNECT_BASE_MS = 5_000;
const RECONNECT_CAP_MS = 120_000;

export class ConnectionManager extends EventEmitter {
  private client: Client | null = null;
  private _state: ClientState = "DISCONNECTED";
  private _booting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  get state(): ClientState {
    return this._state;
  }

  get isReady(): boolean {
    return this._state === "READY";
  }

  /** Returns the underlying Client. Throws if not in READY state. */
  getClient(): Client {
    if (this._state !== "READY" || !this.client) {
      throw new Error(`WhatsApp client not ready (state: ${this._state})`);
    }
    return this.client;
  }

  /** Boot the client. Idempotent — safe to call on startup. */
  async initialize(): Promise<void> {
    if (this._state === "READY" || this._booting) return;
    await this._boot();
  }

  /** Graceful shutdown: destroy client and persist disconnect status. */
  async destroy(): Promise<void> {
    this._cancelReconnect();
    this._setState("DESTROYED");

    if (this.client) {
      try {
        await this.client.destroy();
      } catch {
        // ignore — we're shutting down
      }
      this.client = null;
    }

    await this._syncSession({
      isConnected: false,
      disconnectedAt: new Date(),
      disconnectReason: "Worker shutdown",
    });
  }

  // ── Boot / reconnect ────────────────────────────────────────────────────────

  private async _boot(): Promise<void> {
    if (this._booting) return;
    this._booting = true;

    // Destroy any lingering client before re-initializing.
    if (this.client) {
      try {
        await this.client.destroy();
      } catch {
        // ignore
      }
      this.client = null;
    }

    this._setState("INITIALIZING");
    logger.info({ attempt: this.reconnectAttempts }, "Booting WhatsApp client");

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: this.userId, dataPath: ".wwebjs_auth" }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      },
    });

    this.client = client;
    this._attachEvents(client);

    try {
      await client.initialize();
    } catch (err) {
      logger.error({ err }, "Client initialization threw — scheduling reconnect");
      this.client = null;
      this._setState("DISCONNECTED");
      this._scheduleReconnect();
    } finally {
      this._booting = false;
    }
  }

  // ── Event wiring ────────────────────────────────────────────────────────────

  private _attachEvents(client: Client): void {
    client.on("qr", (qr: string) => {
      this._setState("QR_PENDING");
      void this._handleQR(qr);
    });

    client.on("authenticated", () => {
      this._setState("AUTHENTICATED");
      logger.info("WhatsApp authenticated — waiting for ready");
      void this._syncSession({ qrCode: null, qrExpiresAt: null });
    });

    client.on("ready", () => {
      // Reset reconnect counter on successful connection.
      this.reconnectAttempts = 0;
      this._setState("READY");

      // whatsapp-web.js types are loose; cast to access wid/pushname safely.
      const info = client.info as
        | { wid: { user: string }; pushname: string }
        | undefined;

      const phoneNumber = info?.wid?.user ? `+${info.wid.user}` : null;
      const displayName = info?.pushname ?? null;

      logger.info({ phoneNumber, displayName }, "WhatsApp client ready");

      void this._syncSession({
        isConnected: true,
        phoneNumber,
        displayName,
        connectedAt: new Date(),
        lastActiveAt: new Date(),
        qrCode: null,
        qrExpiresAt: null,
        disconnectedAt: null,
        disconnectReason: null,
      });

      this.emit("ready");
    });

    client.on("auth_failure", (msg: string) => {
      logger.error({ msg }, "WhatsApp auth failure — clear .wwebjs_auth and re-scan QR");
      this._setState("DISCONNECTED");
      void this._syncSession({
        isConnected: false,
        qrCode: null,
        qrExpiresAt: null,
      });
      // Don't auto-reconnect after auth failure — the session is corrupt.
      // The operator must delete .wwebjs_auth and restart the worker.
    });

    client.on("disconnected", (reason: string) => {
      logger.warn({ reason }, "WhatsApp disconnected");
      this.client = null;
      // Skip reconnect if destroy() was called explicitly.
      if (this._state === "DESTROYED") return;
      this._setState("DISCONNECTED");
      void this._syncSession({
        isConnected: false,
        disconnectedAt: new Date(),
        disconnectReason: String(reason),
      });
      this._scheduleReconnect();
    });

    // Heartbeat: keep lastActiveAt fresh on any outbound/inbound message.
    client.on("message_create", () => {
      void this._syncSession({ lastActiveAt: new Date() });
    });
  }

  // ── QR handling ─────────────────────────────────────────────────────────────

  private async _handleQR(qr: string): Promise<void> {
    const expiresAt = new Date(Date.now() + QR_TTL_MS);

    logger.info("QR received — scan with WhatsApp (expires in 20 s)");

    // Terminal rendering for local dev.
    const { default: qrTerminal } = await import("qrcode-terminal");
    qrTerminal.generate(qr, { small: true });

    // Publish to Redis so the web app can serve it via SSE or polling.
    await redis
      .setex(
        `whatsapp:qr:${this.userId}`,
        Math.ceil(QR_TTL_MS / 1_000),
        qr,
      )
      .catch((err: Error) =>
        logger.error({ err }, "Failed to publish QR to Redis"),
      );

    await this._syncSession({ qrCode: qr, qrExpiresAt: expiresAt });
  }

  // ── Reconnect ────────────────────────────────────────────────────────────────

  private _scheduleReconnect(): void {
    if (this._state === "DESTROYED") return;

    // Exponential backoff capped at RECONNECT_CAP_MS.
    const exponent = Math.min(this.reconnectAttempts, 6);
    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** exponent,
      RECONNECT_CAP_MS,
    );
    this.reconnectAttempts++;

    logger.info(
      { attempt: this.reconnectAttempts, delayMs: delay },
      "Reconnect scheduled",
    );

    this._cancelReconnect();
    this.reconnectTimer = setTimeout(() => void this._boot(), delay);
  }

  private _cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private _setState(next: ClientState): void {
    const prev = this._state;
    if (prev === next) return;
    logger.debug({ from: prev, to: next }, "WhatsApp state transition");
    this._state = next;
    this.emit("stateChange", next);
  }

  /**
   * Persists session metadata to `WhatsAppSession`.
   * Uses upsert so the row is created on first boot if the seed didn't run.
   */
  private async _syncSession(patch: SessionPatch): Promise<void> {
    try {
      await db.whatsAppSession.upsert({
        where: { userId: this.userId },
        update: patch,
        create: { userId: this.userId, ...patch },
      });
    } catch (err) {
      logger.error({ err, patch }, "Failed to sync WhatsApp session to DB");
    }
  }
}
