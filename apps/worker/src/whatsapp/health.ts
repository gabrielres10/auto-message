import { db } from "../lib/db";
import { getConnectionManager } from "./client";
import type { ClientState } from "./types";

export interface WhatsAppHealthReport {
  state: ClientState;
  isReady: boolean;
  phoneNumber: string | null;
  displayName: string | null;
  connectedAt: Date | null;
  lastActiveAt: Date | null;
  disconnectedAt: Date | null;
  disconnectReason: string | null;
  qrAvailable: boolean;
}

/**
 * Returns the current WhatsApp connection health, combining the live in-memory
 * state from ConnectionManager with persisted metadata from the DB.
 *
 * Intended for internal monitoring, not direct API exposure.
 * The web app derives status independently by reading WhatsAppSession from DB.
 */
export async function getWhatsAppHealth(userId: string): Promise<WhatsAppHealthReport> {
  const manager = getConnectionManager(userId);

  const session = await db.whatsAppSession.findUnique({
    where: { userId: manager.userId },
    select: {
      phoneNumber: true,
      displayName: true,
      connectedAt: true,
      lastActiveAt: true,
      disconnectedAt: true,
      disconnectReason: true,
      qrCode: true,
      qrExpiresAt: true,
    },
  });

  const now = new Date();
  const qrAvailable =
    session?.qrCode !== null &&
    session?.qrCode !== undefined &&
    session?.qrExpiresAt !== null &&
    session?.qrExpiresAt !== undefined &&
    session.qrExpiresAt > now;

  return {
    state: manager.state,
    isReady: manager.isReady,
    phoneNumber: session?.phoneNumber ?? null,
    displayName: session?.displayName ?? null,
    connectedAt: session?.connectedAt ?? null,
    lastActiveAt: session?.lastActiveAt ?? null,
    disconnectedAt: session?.disconnectedAt ?? null,
    disconnectReason: session?.disconnectReason ?? null,
    qrAvailable,
  };
}
